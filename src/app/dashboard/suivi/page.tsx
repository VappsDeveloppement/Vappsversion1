
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ClipboardList, Route, PlusCircle, Scale, Trash2, Edit, BrainCog, ChevronsUpDown, Check, MoreHorizontal, Eye, BookCopy } from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const scaleSubQuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Le texte de la question est requis.'),
});

const scaleQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('scale'),
  title: z.string().optional(),
  questions: z.array(scaleSubQuestionSchema).min(1, "Le bloc doit contenir au moins une question."),
});

const auraBlockSchema = z.object({
  id: z.string(),
  type: z.literal('aura'),
});

const scormAnswerSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Le texte de la réponse est requis."),
  value: z.string().min(1, "La valeur est requise."),
});

const scormQuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Le texte de la question est requis."),
  answers: z.array(scormAnswerSchema).min(2, "Une question doit avoir au moins deux réponses."),
});

const scormResultSchema = z.object({
    id: z.string(),
    value: z.string().min(1, "La valeur de résultat est requise."),
    text: z.string().min(1, "Le texte du résultat est requis."),
});

const scormBlockSchema = z.object({
    id: z.string(),
    type: z.literal('scorm'),
    title: z.string().min(1, "Le titre du bloc SCORM est requis."),
    questions: z.array(scormQuestionSchema).optional(),
    results: z.array(scormResultSchema).optional(),
});

const questionSchema = z.discriminatedUnion("type", [
  scaleQuestionSchema,
  auraBlockSchema,
  scormBlockSchema,
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

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
};

type FollowUp = {
    id: string;
    counselorId: string;
    clientId: string;
    clientName: string;
    modelId: string;
    modelName: string;
    createdAt: string;
    status: 'pending' | 'completed';
};

const newFollowUpSchema = z.object({
    clientId: z.string().min(1, "Veuillez sélectionner un client."),
    modelId: z.string().min(1, "Veuillez sélectionner un modèle."),
});

type NewFollowUpFormData = z.infer<typeof newFollowUpSchema>;

function FollowUpManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const form = useForm<NewFollowUpFormData>({
        resolver: zodResolver(newFollowUpSchema)
    });

    const clientsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);

    const modelsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/question_models`));
    }, [user, firestore]);
    const { data: models, isLoading: areModelsLoading } = useCollection<QuestionModel>(modelsQuery);
    
    const followUpsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/follow_ups`));
    }, [user, firestore]);
    const { data: followUps, isLoading: areFollowUpsLoading } = useCollection<FollowUp>(followUpsQuery);


    const onSubmit = (data: NewFollowUpFormData) => {
        if (!user) return;
        
        const client = clients?.find(c => c.id === data.clientId);
        const model = models?.find(m => m.id === data.modelId);

        if (!client || !model) return;

        const newFollowUp: Omit<FollowUp, 'id'> = {
            counselorId: user.uid,
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            modelId: model.id,
            modelName: model.name,
            createdAt: new Date().toISOString(),
            status: 'pending',
        };
        
        addDocumentNonBlocking(collection(firestore, `users/${user.uid}/follow_ups`), newFollowUp);
        setIsSheetOpen(false);
        form.reset();
    };
    
     const handleDeleteFollowUp = (followUpId: string) => {
        if (!user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/follow_ups`, followUpId));
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Suivi des clients</CardTitle>
                        <CardDescription>
                            Associez un client à un modèle de formulaire pour initier un nouveau suivi.
                        </CardDescription>
                    </div>
                     <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> Nouveau Suivi</Button>
                        </SheetTrigger>
                        <SheetContent>
                             <SheetHeader>
                                <SheetTitle>Lancer un nouveau suivi</SheetTitle>
                                <SheetDescription>Sélectionnez un client et un modèle de formulaire.</SheetDescription>
                            </SheetHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
                                     <FormField
                                        control={form.control}
                                        name="clientId"
                                        render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Client</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                            {field.value ? clients?.find(c => c.id === field.value)?.email : "Sélectionner un client"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Rechercher un client..." />
                                                        <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                                                        <CommandList>
                                                            {clients?.map((client) => (
                                                                <CommandItem value={client.email} key={client.id} onSelect={() => { form.setValue("clientId", client.id) }}>
                                                                    <Check className={cn("mr-2 h-4 w-4", client.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                    <div>
                                                                        <p>{client.firstName} {client.lastName}</p>
                                                                        <p className="text-xs text-muted-foreground">{client.email}</p>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="modelId"
                                        render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Modèle de formulaire</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                            {field.value ? models?.find(m => m.id === field.value)?.name : "Sélectionner un modèle"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                     <Command>
                                                        <CommandInput placeholder="Rechercher un modèle..." />
                                                        <CommandEmpty>Aucun modèle trouvé.</CommandEmpty>
                                                        <CommandList>
                                                            {models?.map((model) => (
                                                                <CommandItem value={model.name} key={model.id} onSelect={() => { form.setValue("modelId", model.id) }}>
                                                                    <Check className={cn("mr-2 h-4 w-4", model.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                    {model.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full">Démarrer le suivi</Button>
                                </form>
                            </Form>
                        </SheetContent>
                    </Sheet>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Modèle</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {areFollowUpsLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                         : followUps && followUps.length > 0 ? (
                            followUps.map(suivi => (
                                <TableRow key={suivi.id}>
                                    <TableCell>{suivi.clientName}</TableCell>
                                    <TableCell>{suivi.modelName}</TableCell>
                                    <TableCell>{new Date(suivi.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell><Badge>{suivi.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/suivi/${suivi.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" /> Ouvrir
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem disabled>Exporter PDF</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteFollowUp(suivi.id)}>Supprimer</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                         ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Aucun suivi en cours.</TableCell>
                            </TableRow>
                         )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

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

  const { fields, append, remove, update } = useFieldArray({
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
                    <TableHead>Nombre de blocs</TableHead>
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
              <SheetContent className="sm:max-w-3xl w-full flex flex-col">
                  <SheetHeader>
                      <SheetTitle>{editingModel ? "Modifier le" : "Nouveau"} modèle de formulaire</SheetTitle>
                  </SheetHeader>
                  <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                          <ScrollArea className="flex-1 pr-6 -mr-6">
                              <div className="space-y-6 py-4">
                                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du modèle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                  
                                  <div>
                                      <Label>Blocs de questions</Label>
                                      <div className="space-y-4 mt-2">
                                          {fields.map((field, index) => {
                                              const scormQuestions = (form.watch(`questions.${index}`) as any).questions;
                                              const scormResults = (form.watch(`questions.${index}`) as any).results;
                                              return (
                                              <Card key={field.id} className="p-4">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                                        {field.type === 'scale' && <><Scale className="h-4 w-4"/>Bloc de questions sur une échelle</>}
                                                        {field.type === 'aura' && <><BrainCog className="h-4 w-4"/>Analyse AURA</>}
                                                        {field.type === 'scorm' && <><BookCopy className="h-4 w-4"/>Bloc SCORM</>}
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                </div>
                                                {field.type === 'scale' && (
                                                   <div className='space-y-4'>
                                                        <FormField
                                                            control={form.control}
                                                            name={`questions.${index}.title`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Titre du bloc</FormLabel>
                                                                    <FormControl><Input {...field} /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        {(field.questions || []).map((subQuestion, subIndex) => (
                                                             <div key={subQuestion.id} className="flex items-end gap-2">
                                                                <FormField 
                                                                    control={form.control} 
                                                                    name={`questions.${index}.questions.${subIndex}.text`}
                                                                    render={({ field }) => (
                                                                        <FormItem className='flex-1'>
                                                                            <FormLabel>Texte de la question {subIndex + 1}</FormLabel>
                                                                            <FormControl><Input {...field} /></FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                 <Button type="button" variant="ghost" size="icon" onClick={() => {
                                                                     const currentQuestions = (form.getValues(`questions.${index}.questions`) || []);
                                                                     update(index, {
                                                                         ...field,
                                                                         questions: currentQuestions.filter((_, i) => i !== subIndex)
                                                                     });
                                                                 }}>
                                                                    <Trash2 className="h-4 w-4 text-destructive/70"/>
                                                                 </Button>
                                                            </div>
                                                        ))}
                                                        <Button type="button" variant="outline" size="sm" onClick={() => {
                                                            const currentQuestions = form.getValues(`questions.${index}.questions`) || [];
                                                            update(index, {
                                                                ...field,
                                                                questions: [...currentQuestions, { id: `sq-${Date.now()}`, text: '' }]
                                                            });
                                                        }}>
                                                            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une question
                                                        </Button>
                                                   </div>
                                                )}
                                                {field.type === 'aura' && (
                                                    <div className="text-center text-muted-foreground p-4 bg-muted/50 rounded-md">
                                                        Le bloc d'analyse AURA sera inséré ici.
                                                    </div>
                                                )}
                                                {field.type === 'scorm' && (
                                                    <div className="space-y-4">
                                                        <FormField control={form.control} name={`questions.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Titre du bloc SCORM</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                        
                                                        {/* Gestion des questions SCORM */}
                                                        <div>
                                                            <h4 className="font-medium text-sm my-2">Questions</h4>
                                                            {scormQuestions?.map((q: any, qIndex: number) => (
                                                                <Card key={q.id} className="p-3 mb-3">
                                                                    <FormField control={form.control} name={`questions.${index}.questions.${qIndex}.text`} render={({field}) => (<FormItem className="mb-2"><FormLabel>Question {qIndex + 1}</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                                    {q.answers?.map((ans: any, aIndex: number) => (
                                                                        <div key={ans.id} className="flex gap-2 items-end mb-2">
                                                                             <FormField control={form.control} name={`questions.${index}.questions.${qIndex}.answers.${aIndex}.text`} render={({field}) => (<FormItem className="flex-1"><FormLabel>Réponse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                                             <FormField control={form.control} name={`questions.${index}.questions.${qIndex}.answers.${aIndex}.value`} render={({field}) => (<FormItem className="w-24"><FormLabel>Valeur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                                             <Button type="button" variant="ghost" size="icon" onClick={() => {
                                                                                const currentQuestions = (form.getValues(`questions.${index}`) as any)?.questions || [];
                                                                                const currentAnswers = currentQuestions[qIndex]?.answers || [];
                                                                                const newAnswers = currentAnswers.filter((_: any, idx: number) => idx !== aIndex);
                                                                                const newQuestions = [...currentQuestions];
                                                                                newQuestions[qIndex] = { ...newQuestions[qIndex], answers: newAnswers };
                                                                                update(index, { ...field, questions: newQuestions });
                                                                            }}><Trash2 className="h-4 w-4"/></Button>
                                                                        </div>
                                                                    ))}
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => {
                                                                        const currentQuestions = (form.getValues(`questions.${index}`) as any)?.questions || [];
                                                                        const currentAnswers = currentQuestions[qIndex]?.answers || [];
                                                                        const newAnswers = [...currentAnswers, { id: `ans-${Date.now()}`, text: '', value: '' }];
                                                                        const newQuestions = [...currentQuestions];
                                                                        newQuestions[qIndex] = { ...newQuestions[qIndex], answers: newAnswers };
                                                                        update(index, { ...field, questions: newQuestions });
                                                                    }}>+ Réponse</Button>
                                                                </Card>
                                                            ))}
                                                            <Button type="button" variant="outline" size="sm" onClick={() => {
                                                                const currentQuestions = (form.getValues(`questions.${index}`) as any)?.questions || [];
                                                                update(index, { ...field, questions: [...currentQuestions, {id: `scorm-q-${Date.now()}`, text: '', answers: []}]});
                                                            }}>+ Question</Button>
                                                        </div>

                                                        {/* Gestion des résultats SCORM (placeholder) */}
                                                        <div className="mt-4">
                                                             <h4 className="font-medium text-sm my-2">Résultats</h4>
                                                            <p className="text-xs text-muted-foreground p-3 border rounded-md">La gestion des textes de résultats sera disponible ici bientôt.</p>
                                                        </div>
                                                    </div>
                                                )}
                                              </Card>
                                          )})}
                                          <div className="flex flex-wrap gap-2">
                                              <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'scale', title: '', questions: [{id: `sq-${Date.now()}`, text: ''}] })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un bloc "Échelle"
                                              </Button>
                                              <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'aura' })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter "Analyse AURA"
                                              </Button>
                                               <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'scorm', title: 'Nouveau bloc SCORM' })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un bloc "SCORM"
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
            <FollowUpManager />
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
