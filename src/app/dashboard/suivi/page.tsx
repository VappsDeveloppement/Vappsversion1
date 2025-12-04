
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ClipboardList, Route, PlusCircle, Scale, Trash2, Edit, BrainCog } from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from "@/components/ui/label";
import { BlocQuestionModele } from "@/components/shared/bloc-question-modele";

const scaleQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('scale'),
  questionText: z.string().min(1, 'Le texte de la question est requis.'),
});

const auraBlockSchema = z.object({
  id: z.string(),
  type: z.literal('aura'),
});

const questionSchema = z.discriminatedUnion("type", [
  scaleQuestionSchema,
  auraBlockSchema,
]);

const questionModelSchema = z.object({
  name: z.string().min(1, "Le nom du modèle est requis."),
  questions: z.array(questionSchema).optional(),
});

type QuestionModelFormData = z.infer<typeof questionModelSchema>;

type QuestionModel = {
  id: string;
  counselorId: string;
} & QuestionModelFormData;


function FormTemplateManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<QuestionModel | null>(null);

  const modelsQuery = useMemoFirebase(() => {
      if (!user) return null;
      return query(collection(firestore, `users/${user.uid}/question_models`));
  }, [user, firestore]);
  const { data: models, isLoading } = useCollection<QuestionModel>(modelsQuery);
  
  const form = useForm<QuestionModelFormData>({
    resolver: zodResolver(questionModelSchema),
    defaultValues: { name: '', questions: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  useEffect(() => {
    if (isSheetOpen) {
      if (editingModel) {
        form.reset(editingModel);
      } else {
        form.reset({ name: '', questions: [] });
      }
    }
  }, [isSheetOpen, editingModel, form]);

  const handleNewModel = () => {
    setEditingModel(null);
    setIsSheetOpen(true);
  };
  
  const handleEditModel = (model: QuestionModel) => {
    setEditingModel(model);
    setIsSheetOpen(true);
  };

  const handleDeleteModel = (modelId: string) => {
    if (!user) return;
    const modelRef = doc(firestore, `users/${user.uid}/question_models`, modelId);
    deleteDocumentNonBlocking(modelRef);
    toast({ title: 'Modèle supprimé' });
  };


  const onSubmit = (data: QuestionModelFormData) => {
    if (!user) return;
    const modelData = { ...data, counselorId: user.uid };
    if (editingModel) {
      setDocumentNonBlocking(doc(firestore, `users/${user.uid}/question_models`, editingModel.id), modelData, { merge: true });
      toast({ title: 'Modèle mis à jour' });
    } else {
      addDocumentNonBlocking(collection(firestore, `users/${user.uid}/question_models`), modelData);
      toast({ title: 'Modèle créé' });
    }
    setIsSheetOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
              <CardTitle>Modèles de formulaire</CardTitle>
              <CardDescription>
                Créez et gérez vos modèles de formulaires personnalisés pour le suivi client.
              </CardDescription>
            </div>
            <Button onClick={handleNewModel}><PlusCircle className="mr-2 h-4 w-4" /> Nouveau modèle</Button>
        </div>
      </CardHeader>
      <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nom du modèle</TableHead>
                    <TableHead>Nombre de questions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full"/></TableCell></TableRow>
                : models && models.length > 0 ? (
                    models.map(model => (
                        <TableRow key={model.id}>
                            <TableCell>{model.name}</TableCell>
                            <TableCell>{model.questions?.length || 0}</TableCell>
                            <TableCell className="text-right">
                                 <Button variant="ghost" size="icon" onClick={() => handleEditModel(model)}><Edit className="h-4 w-4" /></Button>
                                 <Button variant="ghost" size="icon" onClick={() => handleDeleteModel(model.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={3} className="text-center h-24">Aucun modèle créé.</TableCell></TableRow>
                )}
            </TableBody>
          </Table>

          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetContent className="sm:max-w-2xl w-full flex flex-col">
                  <SheetHeader>
                      <SheetTitle>{editingModel ? "Modifier le" : "Nouveau"} modèle de formulaire</SheetTitle>
                  </SheetHeader>
                  <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                          <ScrollArea className="flex-1 pr-6 -mr-6">
                              <div className="space-y-6 py-4">
                                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du modèle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                  
                                  <div>
                                      <Label>Questions</Label>
                                      <div className="space-y-4 mt-2">
                                          {fields.map((field, index) => (
                                              <Card key={field.id} className="p-4">
                                                <div className="flex justify-between items-center mb-4">
                                                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                                    {field.type === 'scale' && <><Scale className="h-4 w-4"/>Question sur une échelle</>}
                                                    {field.type === 'aura' && <><BrainCog className="h-4 w-4"/>Bloc d'analyse AURA</>}
                                                  </div>
                                                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                </div>
                                                {field.type === 'scale' && (
                                                  <FormField control={form.control} name={`questions.${index}.questionText`} render={({ field }) => (
                                                      <FormItem>
                                                          <FormLabel>Texte de la question</FormLabel>
                                                          <FormControl><Input {...field} /></FormControl>
                                                          <FormMessage />
                                                      </FormItem>
                                                  )}/>
                                                )}
                                                {field.type === 'aura' && (
                                                    <div className="text-center text-muted-foreground p-4 bg-muted/50 rounded-md">
                                                        Le bloc d'analyse AURA sera inséré ici.
                                                    </div>
                                                )}
                                              </Card>
                                          ))}
                                          <div className="flex flex-wrap gap-2">
                                              <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'scale', questionText: '' })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un bloc "Échelle"
                                              </Button>
                                              <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'aura' })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un bloc "AURA"
                                              </Button>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </ScrollArea>
                          <SheetFooter className="pt-6 border-t mt-auto">
                              <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                              <Button type="submit">Sauvegarder</Button>
                          </SheetFooter>
                      </form>
                  </Form>
              </SheetContent>
          </Sheet>
      </CardContent>
    </Card>
  );
}


export default function SuiviPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Suivi</h1>
        <p className="text-muted-foreground">
          Gérez le suivi de vos clients, vos modèles et vos parcours.
        </p>
      </div>

      <Tabs defaultValue="suivi" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="suivi">
            <ClipboardList className="mr-2 h-4 w-4" /> Suivi
          </TabsTrigger>
          <TabsTrigger value="form-templates">
            <FileText className="mr-2 h-4 w-4" /> Modèle de formulaire
          </TabsTrigger>
           <TabsTrigger value="parcours">
            <Route className="mr-2 h-4 w-4" /> Parcours
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suivi">
          <Card>
            <CardHeader>
              <CardTitle>Suivi des clients</CardTitle>
              <CardDescription>
                Cette section est en cours de développement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>Le module de suivi des clients sera bientôt disponible ici.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="form-templates">
          <FormTemplateManager />
        </TabsContent>
        <TabsContent value="parcours">
            <Card>
                <CardHeader>
                    <CardTitle>Parcours</CardTitle>
                    <CardDescription>
                        Cette section est en cours de développement.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                        <p>Le module de création de parcours sera bientôt disponible ici.</p>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
