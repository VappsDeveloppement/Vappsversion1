'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemoFirebase, useCollection } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, PlusCircle, Edit, Trash2, FileText, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useState } from "react";

type SupportRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'closed';
  createdAt: string;
  agencyId: string;
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
  pdfs: z.array(z.object({
    name: z.string().min(1, "Le nom du document est requis."),
    url: z.string().url("Veuillez entrer une URL valide."),
  })).optional()
});

type FaqFormData = z.infer<typeof faqFormSchema>;

function GeneralFaqManager() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const form = useForm<FaqFormData>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: { category: '', question: '', content: '', pdfs: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pdfs",
  });

  const onSubmit = (data: FaqFormData) => {
    console.log(data);
    setIsSheetOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
              <CardTitle>Gestion de la FAQ</CardTitle>
              <CardDescription>Créez et modifiez les questions-réponses pour la page d'aide.</CardDescription>
            </div>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ajouter une question
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-3xl w-full overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Ajouter/Modifier une question</SheetTitle>
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
                            <FormField control={form.control} name={`pdfs.${index}.name`} render={({ field }) => (
                              <Input {...field} placeholder="Nom du document" className="flex-1" />
                            )} />
                            <FormField control={form.control} name={`pdfs.${index}.url`} render={({ field }) => (
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
                      <Button type="submit">Sauvegarder</Button>
                    </SheetFooter>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
        </div>
      </CardHeader>
      <CardContent>
          <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-lg text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Aucune question dans la FAQ</h3>
              <p className="mt-2 text-sm text-muted-foreground">Cliquez sur "Ajouter une question" pour commencer.</p>
          </div>
      </CardContent>
    </Card>
  )
}


export default function SupportPage() {
    const firestore = useFirestore();

    const supportRequestsCollectionRef = useMemoFirebase(() => {
        return query(collection(firestore, 'support_requests'));
    }, [firestore]);

    const { data: supportRequests, isLoading } = useCollection<SupportRequest>(supportRequestsCollectionRef);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Support Technique</h1>
                <p className="text-muted-foreground">
                    Gérez les demandes de support et la FAQ de la plateforme.
                </p>
            </div>
            <Tabs defaultValue="requests">
                <TabsList>
                    <TabsTrigger value="requests">Liste des demandes</TabsTrigger>
                    <TabsTrigger value="faq">Gestion de contenu (FAQ)</TabsTrigger>
                </TabsList>
                <TabsContent value="requests">
                    <Card>
                        <CardHeader>
                            <CardTitle>Demandes de support</CardTitle>
                            <CardDescription>Liste de toutes les demandes de support envoyées via le formulaire de contact.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Demandeur</TableHead>
                                    <TableHead>Message</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                    ) : supportRequests && supportRequests.length > 0 ? (
                                        supportRequests.map(request => (
                                        <TableRow key={request.id}>
                                            <TableCell>
                                            <div className="font-medium">{request.name}</div>
                                            <div className="text-sm text-muted-foreground">{request.email}</div>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">{request.message}</TableCell>
                                            <TableCell>{new Date(request.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                                            <TableCell><Badge variant={statusVariant[request.status]}>{statusText[request.status]}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                {/* Actions to be implemented */}
                                            </TableCell>
                                        </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Aucune demande de support.
                                        </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="faq">
                     <GeneralFaqManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
