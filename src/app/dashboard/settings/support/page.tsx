
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemoFirebase, useCollection, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser, useDoc } from "@/firebase";
import { collection, query, doc, where } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, PlusCircle, Edit, Trash2, FileText, Video, BookOpen, Loader2, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type SupportRequest = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'closed';
  createdAt: string;
};

const statusVariant: Record<SupportRequest['status'], 'default' | 'secondary' | 'destructive'> = {
  new: 'destructive',
  in_progress: 'default',
  closed: 'secondary',
};

const statusText: Record<SupportRequest['status'], string> = {
  new: 'Nouveau',
  in_progress: 'En cours',
  closed: 'Fermé',
};

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
  scope: 'conseiller' | 'membre';
};

function FaqManager({ scope, title, description }: { scope: 'conseiller' | 'membre', title: string, description: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);

  const faqQuery = useMemoFirebase(() => {
    return query(
      collection(firestore, 'faq_items'),
      where('scope', '==', scope)
    );
  }, [firestore, scope]);

  const { data: faqItems, isLoading: areFaqsLoading } = useCollection<FaqItem>(faqQuery);

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
      toast({ title: 'Question supprimée' });
  };

  const onSubmit = async (data: FaqFormData) => {
    setIsSubmitting(true);
    const faqData = { ...data, scope };
    try {
      if (editingFaq) {
        const faqDocRef = doc(firestore, 'faq_items', editingFaq.id);
        await setDocumentNonBlocking(faqDocRef, faqData, { merge: true });
        toast({ title: 'Question mise à jour' });
      } else {
        const faqCollectionRef = collection(firestore, 'faq_items');
        await addDocumentNonBlocking(faqCollectionRef, faqData);
        toast({ title: 'Question ajoutée' });
      }
      setIsSheetOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
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
                  <SheetTitle>{editingFaq ? 'Modifier' : 'Ajouter'} une question</SheetTitle>
                </SheetHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-6">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thématique</FormLabel>
                        <FormControl><Input placeholder="Ex: Facturation" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="question" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Question</FormLabel>
                        <FormControl><Input placeholder="Comment retrouver mes factures ?" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contenu de la réponse</FormLabel>
                        <FormControl><RichTextEditor content={field.value || ''} onChange={field.onChange} /></FormControl>
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
                            <FormField control={form.control} name={`pdfUrls.${index}.name`} render={({ field }) => ( <Input {...field} placeholder="Nom du document" className="flex-1" /> )}/>
                            <FormField control={form.control} name={`pdfUrls.${index}.url`} render={({ field }) => ( <Input {...field} placeholder="URL du PDF" className="flex-1" /> )}/>
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
          {areFaqsLoading ? (
            <div className="space-y-2">
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
                    <div className="mt-6 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}><Edit className="mr-2 h-4 w-4"/>Modifier</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Aucune question dans cette FAQ</h3>
                <p className="mt-2 text-sm text-muted-foreground">Cliquez sur "Ajouter une question" pour commencer.</p>
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

export default function SupportPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [requestToView, setRequestToView] = useState<SupportRequest | null>(null);

    const userDocRef = useMemoFirebase(() => (user?.uid ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);
    
    const supportRequestsCollectionRef = useMemoFirebase(() => query(collection(firestore, 'support_requests'), where('status', '!=', 'closed')), [firestore]);
    const { data: supportRequests, isLoading: areRequestsLoading } = useCollection<SupportRequest>(supportRequestsCollectionRef);

    const supportForm = useForm<SupportFormData>({ resolver: zodResolver(supportFormSchema), defaultValues: { name: '', email: '', subject: '', message: '' }});

    useEffect(() => {
        if(user) {
            supportForm.reset({
                name: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : user.displayName || '',
                email: user.email || '',
                subject: '',
                message: ''
            })
        }
    }, [user, userData, supportForm]);

    const handleSupportSubmit = async (data: SupportFormData) => {
        setIsSubmitting(true);
        try {
            await addDocumentNonBlocking(collection(firestore, 'support_requests'), {
                ...data, status: 'new', createdAt: new Date().toISOString(),
            });
            toast({ title: 'Demande envoyée', description: 'Votre demande de support a été envoyée.' });
            setIsDialogOpen(false);
            supportForm.reset();
        } catch (error) {
            toast({ title: 'Erreur', description: 'Une erreur est survenue.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleMarkAsClosed = (requestId: string) => {
        setDocumentNonBlocking(doc(firestore, 'support_requests', requestId), { status: 'closed' }, { merge: true });
        toast({ title: 'Demande fermée' });
        setRequestToView(null);
    };

    const isLoading = isUserLoading || isUserDataLoading;
    const isConseiller = userData?.role === 'conseiller';
    const isAdmin = userData?.permissions?.includes('FULLACCESS');

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Support</h1>
                    <p className="text-muted-foreground">Accédez à la FAQ et contactez le support si besoin.</p>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button><Send className="mr-2 h-4 w-4" />Contacter le support</Button></DialogTrigger>
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
            
            {isAdmin ? (
                 <Tabs defaultValue="requests">
                    <TabsList className="grid w-full grid-cols-3 h-auto">
                        <TabsTrigger value="requests">Demandes de support</TabsTrigger>
                        <TabsTrigger value="faq-conseiller">FAQ Conseillers</TabsTrigger>
                        <TabsTrigger value="faq-membre">FAQ Membres</TabsTrigger>
                    </TabsList>
                    <TabsContent value="requests">
                        <Card>
                            <CardHeader>
                                <CardTitle>Demandes de support en cours</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Demandeur</TableHead><TableHead>Sujet</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {areRequestsLoading ? <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                        : supportRequests && supportRequests.length > 0 ? (
                                            supportRequests.map(req => (
                                                <TableRow key={req.id}>
                                                    <TableCell>{req.name}</TableCell>
                                                    <TableCell>{req.subject}</TableCell>
                                                    <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => setRequestToView(req)}>Voir</Button></TableCell>
                                                </TableRow>
                                            ))
                                        ) : <TableRow><TableCell colSpan={4} className="h-24 text-center">Aucune demande en cours.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="faq-conseiller">
                        <FaqManager scope="conseiller" title="FAQ pour les Conseillers" description="Gérez les questions fréquentes pour les conseillers." />
                    </TabsContent>
                    <TabsContent value="faq-membre">
                         <FaqManager scope="membre" title="FAQ pour les Membres" description="Gérez les questions fréquentes pour les membres." />
                    </TabsContent>
                </Tabs>
            ) : (
                <FaqManager scope={isConseiller ? 'conseiller' : 'membre'} title="FAQ" description="Retrouvez les réponses aux questions les plus fréquentes." />
            )}

             <Dialog open={!!requestToView} onOpenChange={(open) => !open && setRequestToView(null)}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Demande de {requestToView?.name}</DialogTitle></DialogHeader>
                {requestToView && (
                  <div className="space-y-4 py-4 text-sm">
                    <p><strong>Email:</strong> {requestToView.email}</p>
                    <p><strong>Téléphone:</strong> {requestToView.phone || 'N/A'}</p>
                    <p><strong>Sujet:</strong> {requestToView.subject}</p>
                    <div className="p-3 border rounded-md bg-muted whitespace-pre-wrap">{requestToView.message}</div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRequestToView(null)}>Fermer</Button>
                  <Button onClick={() => handleMarkAsClosed(requestToView!.id)}><Check className="mr-2 h-4 w-4" /> Marquer comme traité</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
    );
}
