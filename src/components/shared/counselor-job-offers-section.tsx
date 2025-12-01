
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { JobOffer } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Loader2, Upload, File as FileIcon, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import Link from 'next/link';
import { RichTextEditor } from '../ui/rich-text-editor';

type CounselorProfile = {
    id: string;
    miniSite?: {
        jobOffersSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            description?: string;
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
                <Button className="w-full font-bold" style={{ backgroundColor: primaryColor }}>Voir l'offre</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{offer.title}</DialogTitle>
                    <DialogDescription>
                        Référence: {offer.reference} <br/>
                        {offer.location} | {offer.contractType}
                    </DialogDescription>
                </DialogHeader>
                <div className="prose dark:prose-invert max-w-none max-h-[40vh] overflow-y-auto pr-4" dangerouslySetInnerHTML={{ __html: offer.description || '' }} />
                <h4 className="font-semibold pt-4 border-t">Postuler à cette offre</h4>
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
                                            <Button type="button" variant="outline" onClick={() => document.getElementById(`cv-upload-${offer.id}`)?.click()}><Upload className="h-4 w-4" /></Button>
                                            <Input id={`cv-upload-${offer.id}`} type="file" accept=".pdf" className="hidden" {...cvFileRef} />
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

export function CounselorJobOffersSection({ counselor, jobOffers: offers }: { counselor: CounselorProfile, jobOffers: JobOffer[] }) {
    const jobOffersSettings = counselor.miniSite?.jobOffersSection;
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    if (!jobOffersSettings?.enabled || !offers || offers.length === 0) {
        return null;
    }
    
    const { title, subtitle, description } = jobOffersSettings;
    const cleanDescription = (html: string) => html ? html.replace(/<[^>]+>/g, '') : '';

    return (
        <section className="bg-muted/30 text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    {subtitle && <p className="text-lg font-semibold mt-2" style={{ color: primaryColor }}>{subtitle}</p>}
                    {description && <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{description}</p>}
                </div>

                <Carousel
                    opts={{
                        align: "start",
                        loop: offers.length > 3,
                    }}
                    className="w-full max-w-6xl mx-auto"
                >
                    <CarouselContent className="-ml-4">
                        {offers.map((offer) => (
                            <CarouselItem key={offer.id} className="md:basis-1/2 lg:basis-1/3">
                                <div className="p-1 h-full">
                                    <Card className="flex flex-col h-full shadow-sm hover:shadow-lg transition-shadow duration-300">
                                        <CardHeader>
                                            <CardTitle className="line-clamp-2">{offer.title}</CardTitle>
                                            <CardDescription>Ref: {offer.reference}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1 space-y-2 text-sm">
                                            <p><strong>Lieu:</strong> {offer.location}</p>
                                            <p><strong>Contrat:</strong> {offer.contractType}</p>
                                            {offer.workingHours && <p><strong>Temps:</strong> {offer.workingHours}</p>}
                                            {offer.salary && <p><strong>Salaire:</strong> {offer.salary}</p>}
                                            {offer.description && <p className="text-muted-foreground pt-2 line-clamp-3">{cleanDescription(offer.description)}</p>}
                                        </CardContent>
                                        <CardFooter>
                                            <JobApplicationForm offer={offer} counselorId={counselor.id} primaryColor={primaryColor} />
                                        </CardFooter>
                                    </Card>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </div>
        </section>
    );
}
