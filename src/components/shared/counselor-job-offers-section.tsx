
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { JobOffer } from '@/app/dashboard/vitae/page';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Loader2, Upload, File as FileIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage, addDocumentNonBlocking } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

type CounselorProfile = {
    id: string;
    miniSite?: {
        jobOffersSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            description?: string;
            offers?: JobOffer[];
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    };
};

const applicationSchema = z.object({
  applicantName: z.string().min(1, "Le nom est requis."),
  applicantEmail: z.string().email("L'email est invalide."),
  applicantPhone: z.string().optional(),
  coverLetter: z.string().optional(),
  cv: z.any().refine(file => file?.length == 1, "Le CV est requis."),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

function JobApplicationForm({ offer, counselorId, primaryColor }: { offer: JobOffer, counselorId: string, primaryColor: string }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();
    const storage = useStorage();

    const form = useForm<ApplicationFormData>({
        resolver: zodResolver(applicationSchema),
        defaultValues: { applicantName: '', applicantEmail: '', applicantPhone: '', coverLetter: '' },
    });

    const cvFileRef = form.register("cv");

    const onSubmit = async (data: ApplicationFormData) => {
        setIsSubmitting(true);
        const cvFile = data.cv[0];
        if (!cvFile) {
            toast({ title: 'Erreur', description: 'Veuillez sélectionner un fichier pour votre CV.', variant: 'destructive'});
            setIsSubmitting(false);
            return;
        }

        try {
            // Upload CV to storage
            const cvStorageRef = ref(storage, `job_applications/${counselorId}/${offer.id}/${Date.now()}-${cvFile.name}`);
            const uploadResult = await uploadString(cvStorageRef, await toBase64(cvFile), 'data_url');
            const cvUrl = await getDownloadURL(uploadResult.ref);

            // Save application to Firestore
            const applicationData = {
                counselorId,
                jobOfferId: offer.id,
                jobOfferTitle: offer.title,
                applicantName: data.applicantName,
                applicantEmail: data.applicantEmail,
                applicantPhone: data.applicantPhone,
                coverLetter: data.coverLetter,
                cvUrl,
                status: 'new',
                appliedAt: new Date().toISOString(),
            };

            await addDocumentNonBlocking(collection(firestore, 'job_applications'), applicationData);
            
            toast({ title: "Candidature envoyée", description: "Votre candidature a été envoyée avec succès." });
            setIsDialogOpen(false);
            form.reset();

        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: "Une erreur est survenue lors de l'envoi de votre candidature.", variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const toBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="w-full font-bold" style={{ backgroundColor: primaryColor }}>Postuler</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Postuler pour : {offer.title}</DialogTitle>
                    <DialogDescription>Référence : {offer.reference}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="applicantName" render={({ field }) => (<FormItem><FormLabel>Nom et prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="applicantEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="applicantPhone" render={({ field }) => (<FormItem><FormLabel>Téléphone (optionnel)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="coverLetter" render={({ field }) => (<FormItem><FormLabel>Message (optionnel)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField
                            control={form.control}
                            name="cv"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Votre CV (PDF)</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 p-2 border rounded-md flex-grow h-10 bg-muted">
                                                <FileIcon className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground truncate">
                                                    {field.value?.[0]?.name || "Aucun fichier sélectionné"}
                                                </span>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => document.getElementById('cv-upload')?.click()}><Upload className="h-4 w-4" /></Button>
                                            <Input id="cv-upload" type="file" accept=".pdf" className="hidden" {...cvFileRef} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Envoyer ma candidature
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function CounselorJobOffersSection({ counselor }: { counselor: CounselorProfile }) {
    const jobOffersSettings = counselor.miniSite?.jobOffersSection;
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    if (!jobOffersSettings?.enabled || !jobOffersSettings.offers || jobOffersSettings.offers.length === 0) {
        return null;
    }
    
    const { title, subtitle, description, offers } = jobOffersSettings;

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    {subtitle && <p className="text-lg font-semibold mt-2" style={{ color: primaryColor }}>{subtitle}</p>}
                    {description && <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{description}</p>}
                </div>

                <div className="space-y-6">
                    {offers.map((offer) => (
                        <Card key={offer.id} className="shadow-sm">
                             <Accordion type="single" collapsible>
                                <AccordionItem value={offer.id} className="border-b-0">
                                    <AccordionTrigger className="p-6 hover:no-underline">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full text-left gap-4">
                                            <div className='flex-1'>
                                                <CardTitle>{offer.title}</CardTitle>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                                                    {offer.reference && <span>Ref: {offer.reference}</span>}
                                                    {offer.contractType && <span>{offer.contractType}</span>}
                                                    {offer.workingHours && <span>{offer.workingHours}</span>}
                                                    {offer.location && <span>{offer.location}</span>}
                                                    {offer.salary && <span>{offer.salary}</span>}
                                                </div>
                                            </div>
                                             <div className="hidden md:block">
                                                <Button variant="outline">Détails</Button>
                                             </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="px-6 pb-6 space-y-6">
                                            {offer.description && (
                                                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: offer.description }}/>
                                            )}
                                            <JobApplicationForm offer={offer} counselorId={counselor.id} primaryColor={primaryColor} />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                             </Accordion>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

