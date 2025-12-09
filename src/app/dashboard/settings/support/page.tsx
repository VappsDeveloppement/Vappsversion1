
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Send, MessageSquare, BookOpen, Edit, Trash2, Video, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useState } from "react";
import { useAgency } from "@/context/agency-provider";
import { useFirestore } from "@/firebase/provider";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const faqFormSchema = z.object({
  category: z.string().min(1, 'La thématique est requise.'),
  question: z.string().min(1, 'La question est requise.'),
  content: z.string().min(50, 'Le contenu doit avoir au moins 50 caractères.'),
  videoUrl: z.string().url('Veuillez entrer une URL de vidéo valide.').optional().or(z.literal('')),
  pdfUrls: z.array(z.object({
    name: z.string().min(1, "Le nom du document est requis."),
    url: z.string().url("Veuillez entrer une URL valide."),
  })).optional()
});

type FaqFormData = z.infer<typeof faqFormSchema>;

type FaqItem = FaqFormData & {
  id: string;
  scope: 'general' | 'agency';
  agencyId?: string; // Kept for potential backward compatibility but not used for filtering anymore
};

function FaqViewer({ scope }: { scope: 'general' | 'agency' }) {
    const firestore = useFirestore();
    const faqQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'faq_items'), where('scope', '==', scope));
    }, [firestore, scope]);

    const { data: faqItems, isLoading } = useCollection<FaqItem>(faqQuery);

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }
    
    if (!faqItems || faqItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">La FAQ est vide</h3>
                <p className="mt-2 text-sm text-muted-foreground">Aucune question n'a été ajoutée à cette section pour le moment.</p>
            </div>
        );
    }

    return (
        <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => (
                <AccordionItem value={item.id} key={item.id}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>
                        <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: item.content }} />
                         {item.videoUrl && (
                            <div className="mt-4">
                                <iframe
                                className="w-full aspect-video rounded-lg"
                                src={item.videoUrl}
                                title={item.question}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                ></iframe>
                            </div>
                        )}
                        {item.pdfUrls && item.pdfUrls.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <h4 className="font-semibold">Documents associés :</h4>
                                <ul className="list-disc pl-5">
                                {item.pdfUrls.map((pdf, index) => (
                                    <li key={index}>
                                    <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        {pdf.name}
                                    </a>
                                    </li>
                                ))}
                                </ul>
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}

const supportFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  email: z.string().email('L\'email est invalide.'),
  subject: z.string().min(1, 'Le sujet est requis.'),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères.'),
});
type SupportFormData = z.infer<typeof supportFormSchema>;

export default function SupportPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.id) : null), [user, firestore]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

    const supportForm = useForm<SupportFormData>({
        resolver: zodResolver(supportFormSchema),
        defaultValues: {
            name: user?.displayName || '',
            email: user?.email || '',
            subject: '',
            message: '',
        }
    });

    const handleSupportSubmit = async (data: SupportFormData) => {
        setIsSubmitting(true);
        try {
            await addDocumentNonBlocking(collection(firestore, 'support_requests'), {
                ...data,
                status: 'new',
                createdAt: new Date().toISOString(),
            });
            toast({ title: 'Demande envoyée', description: 'Votre demande de support a été envoyée avec succès.' });
            setIsDialogOpen(false);
            supportForm.reset();
        } catch (error) {
            console.error(error);
            toast({ title: 'Erreur', description: 'Une erreur est survenue lors de l\'envoi de votre demande.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isMember = userData?.role === 'membre';
    const isConseiller = userData?.role === 'conseiller' || userData?.permissions?.includes('FULLACCESS');

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Support</h1>
                <p className="text-muted-foreground">
                    Accédez à la FAQ et contactez le support si besoin.
                </p>
            </div>
            <Tabs defaultValue={isMember ? "faq-agence" : "faq-generale"}>
                {isConseiller && (
                    <TabsList>
                        <TabsTrigger value="faq-generale">FAQ Générale</TabsTrigger>
                        <TabsTrigger value="faq-agence">FAQ de l'Agence</TabsTrigger>
                    </TabsList>
                )}
                 {isConseiller && (
                    <TabsContent value="faq-generale">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>FAQ Générale de la Plateforme</CardTitle>
                                        <CardDescription>Retrouvez les réponses aux questions les plus fréquentes sur l'utilisation de la plateforme.</CardDescription>
                                    </div>
                                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button><Send className="mr-2 h-4 w-4" />Contacter le support</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Soumettre une demande de support</DialogTitle><DialogDescription>Décrivez votre problème ou votre question.</DialogDescription></DialogHeader>
                                            <Form {...supportForm}>
                                                <form onSubmit={supportForm.handleSubmit(handleSupportSubmit)} className="space-y-4 py-4">
                                                    <FormField control={supportForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Votre Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField control={supportForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Votre Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField control={supportForm.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Sujet</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField control={supportForm.control} name="message" render={({ field }) => (<FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Envoyer</Button></DialogFooter>
                                                </form>
                                            </Form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent><FaqViewer scope="general" /></CardContent>
                        </Card>
                    </TabsContent>
                 )}
                <TabsContent value="faq-agence">
                    <Card>
                        <CardHeader>
                            <CardTitle>FAQ de l'Agence</CardTitle>
                            <CardDescription>Retrouvez les réponses aux questions spécifiques à votre agence.</CardDescription>
                        </CardHeader>
                        <CardContent><FaqViewer scope="agency" /></CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
