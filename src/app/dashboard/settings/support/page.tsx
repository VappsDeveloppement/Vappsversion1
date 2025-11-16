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
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useUser } from "@/firebase/auth/use-user";


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
  agencyId?: string;
  scope: 'general' | 'agency';
};

function GeneralFaqViewer() {
    const firestore = useFirestore();
    const generalFaqQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'faq_items'), where('scope', '==', 'general'));
    }, [firestore]);

    const { data: faqItems, isLoading } = useCollection<FaqItem>(generalFaqQuery);

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
                <p className="mt-2 text-sm text-muted-foreground">Aucune question n'a été ajoutée à la FAQ générale pour le moment.</p>
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

function AgencyFaqManager() {
  const { agency, isLoading: isAgencyLoading } = useAgency();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);

  const agencyFaqQuery = useMemoFirebase(() => {
    if (!agency) return null;
    return query(
      collection(firestore, 'faq_items'),
      where('agencyId', '==', agency.id),
      where('scope', '==', 'agency')
    );
  }, [agency, firestore]);

  const { data: faqItems, isLoading: areFaqsLoading } = useCollection<FaqItem>(agencyFaqQuery);

  const form = useForm<FaqFormData>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: { category: '', question: '', content: '', videoUrl: '', pdfUrls: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pdfUrls",
  });

  const handleNew = () => {
    setEditingFaq(null);
    form.reset({ category: '', question: '', content: '', videoUrl: '', pdfUrls: [] });
    setIsSheetOpen(true);
  };

  const handleEdit = (faqItem: FaqItem) => {
    setEditingFaq(faqItem);
    form.reset({
      ...faqItem,
      pdfUrls: faqItem.pdfUrls || []
    });
    setIsSheetOpen(true);
  };

  const handleDelete = (faqId: string) => {
      const faqDocRef = doc(firestore, 'faq_items', faqId);
      deleteDocumentNonBlocking(faqDocRef);
      toast({ title: 'Question supprimée', description: 'La question a été retirée de votre FAQ.' });
  };


  const onSubmit = async (data: FaqFormData) => {
    if (!agency) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Agence non trouvée.' });
      return;
    }
    setIsSubmitting(true);
    
    const faqData = { ...data, agencyId: agency.id, scope: 'agency' as const };

    try {
      if (editingFaq) {
        const faqDocRef = doc(firestore, 'faq_items', editingFaq.id);
        await setDocumentNonBlocking(faqDocRef, faqData, { merge: true });
        toast({ title: 'Question mise à jour', description: 'La question a été mise à jour dans votre FAQ.' });
      } else {
        const faqCollectionRef = collection(firestore, 'faq_items');
        await addDocumentNonBlocking(faqCollectionRef, faqData);
        toast({ title: 'Question ajoutée', description: 'La nouvelle question a été ajoutée à votre FAQ.' });
      }
      setIsSheetOpen(false);
      setEditingFaq(null);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isAgencyLoading || areFaqsLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
              <CardTitle>Votre FAQ Interne</CardTitle>
              <CardDescription>Créez une base de connaissances pour les membres et conseillers de votre agence.</CardDescription>
            </div>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button onClick={handleNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ajouter une question
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-3xl w-full overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{editingFaq ? 'Modifier' : 'Ajouter'} une question interne</SheetTitle>
                </SheetHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-6">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thématique</FormLabel>
                        <FormControl><Input placeholder="Ex: Process Internes" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="question" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question</FormLabel>
                        <FormControl><Input placeholder="Comment gérer un nouveau prospect ?" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contenu de la réponse</FormLabel>
                        <FormControl><RichTextEditor content={field.value} onChange={field.onChange} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="videoUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL de la vidéo (Optionnel)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <Input placeholder="https://youtube.com/embed/..." {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div>
                      <FormLabel>Documents PDF (Optionnel)</FormLabel>
                      <div className="space-y-2 mt-2">
                        {fields.map((field, index) => (
                          <div key={field.id} className="flex gap-2 items-center">
                            <FormField control={form.control} name={`pdfUrls.${index}.name`} render={({ field }) => (
                              <Input {...field} placeholder="Nom du document" className="flex-1" />
                            )} />
                            <FormField control={form.control} name={`pdfUrls.${index}.url`} render={({ field }) => (
                              <Input {...field} placeholder="URL du PDF" className="flex-1" />
                            )} />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                       <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', url: '' })} className="mt-2" disabled={fields.length >= 2}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un PDF
                        </Button>
                    </div>
                    <SheetFooter className="pt-6">
                      <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sauvegarder
                      </Button>
                    </SheetFooter>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
        </div>
      </CardHeader>
      <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : faqItems && faqItems.length > 0 ? (
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
                    <div className="mt-6 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}><Edit className="mr-2 h-4 w-4"/>Modifier</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Aucune question dans votre FAQ</h3>
                <p className="mt-2 text-sm text-muted-foreground">Cliquez sur "Ajouter une question" pour commencer à construire votre base de connaissances interne.</p>
            </div>
          )}
      </CardContent>
    </Card>
  )
}

const supportFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  email: z.string().email('L\'email est invalide.'),
  subject: z.string().min(1, 'Le sujet est requis.'),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères.'),
});
type SupportFormData = z.infer<typeof supportFormSchema>;

export default function AgencySupportPage() {
    const { agency } = useAgency();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
        if (!agency) return;
        setIsSubmitting(true);

        try {
            await addDocumentNonBlocking(collection(firestore, 'support_requests'), {
                ...data,
                agencyId: agency.id,
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


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Support</h1>
                <p className="text-muted-foreground">
                    Accédez à la FAQ, créez votre propre base de connaissances et contactez le support.
                </p>
            </div>
            <Tabs defaultValue="faq-generale">
                <TabsList>
                    <TabsTrigger value="faq-generale">FAQ Générale</TabsTrigger>
                    <TabsTrigger value="faq-agence">FAQ de l'Agence</TabsTrigger>
                </TabsList>
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
                                        <Button>
                                            <Send className="mr-2 h-4 w-4" />
                                            Contacter le support
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Soumettre une demande de support</DialogTitle>
                                            <DialogDescription>
                                                Décrivez votre problème ou votre question. Notre équipe vous répondra dans les plus brefs délais.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <Form {...supportForm}>
                                            <form onSubmit={supportForm.handleSubmit(handleSupportSubmit)} className="space-y-4 py-4">
                                                <FormField
                                                    control={supportForm.control}
                                                    name="name"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Votre Nom</FormLabel>
                                                            <FormControl><Input placeholder="Jean Dupont" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={supportForm.control}
                                                    name="email"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Votre Email</FormLabel>
                                                            <FormControl><Input type="email" placeholder="jean.dupont@votreagence.com" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={supportForm.control}
                                                    name="subject"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Sujet</FormLabel>
                                                            <FormControl><Input placeholder="Ex: Problème d'affichage..." {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={supportForm.control}
                                                    name="message"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Message</FormLabel>
                                                            <FormControl><Textarea placeholder="Décrivez votre problème ici..." {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <DialogFooter>
                                                    <Button type="submit" disabled={isSubmitting}>
                                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                        Envoyer la demande
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </Form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <GeneralFaqViewer />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="faq-agence">
                     <AgencyFaqManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
