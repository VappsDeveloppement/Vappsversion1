

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, useWatch, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, GripVertical, FilePlus, X, Send, Download } from 'lucide-react';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { BlocQuestionModele } from "@/components/shared/bloc-question-modele";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useAgency } from '@/context/agency-provider';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { VitaeAnalysisBlock } from "@/components/shared/vitae-analysis-block";
import { PrismeAnalysisBlock } from "@/components/shared/prisme-analysis-block";
import { FileText, ClipboardList, Route, Scale, BrainCog, ChevronsUpDown, Check, MoreHorizontal, Eye, BookCopy, FileQuestion, Bot, Pyramid, FileSignature, Loader2, Mail, Phone, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DragDropContext, Droppable, Draggable, OnDragEndResponder } from '@hello-pangea/dnd';

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

const prismeBlockSchema = z.object({
  id: z.string(),
  type: z.literal('prisme'),
});

const vitaeAnalysisBlockSchema = z.object({
  id: z.string(),
  type: z.literal('vitae'),
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

const qcmAnswerSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Le texte de la réponse est requis."),
  resultText: z.string().optional(),
});

const qcmQuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Le texte de la question est requis."),
  answers: z.array(qcmAnswerSchema).min(1, "Une question doit avoir au moins une réponse."),
});

const qcmBlockSchema = z.object({
    id: z.string(),
    type: z.literal('qcm'),
    title: z.string().min(1, "Le titre du bloc QCM est requis."),
    questions: z.array(qcmQuestionSchema).optional(),
});

const freeTextBlockSchema = z.object({
  id: z.string(),
  type: z.literal('free-text'),
  question: z.string().min(1, "La question est requise."),
});

const reportBlockSchema = z.object({
  id: z.string(),
  type: z.literal('report'),
  title: z.string().min(1, "Le titre est requis."),
});


const questionSchema = z.discriminatedUnion("type", [
  scaleQuestionSchema,
  auraBlockSchema,
  scormBlockSchema,
  qcmBlockSchema,
  vitaeAnalysisBlockSchema,
  prismeBlockSchema,
  freeTextBlockSchema,
  reportBlockSchema,
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
    answers?: { questionId: string; answer: any }[];
    type?: 'form';
};

type PathEnrollment = {
    id: string;
    counselorId: string;
    userId: string;
    clientName: string;
    pathId: string;
    pathName: string;
    enrolledAt: string;
    status: 'pending' | 'completed';
    type?: 'path';
};

const newFollowUpSchema = z.object({
    assignationType: z.enum(['form', 'path']).default('form'),
    clientId: z.string().min(1, "Veuillez sélectionner un client."),
    modelId: z.string().optional(),
    pathId: z.string().optional(),
}).refine(data => {
    if (data.assignationType === 'form') return !!data.modelId;
    if (data.assignationType === 'path') return !!data.pathId;
    return false;
}, {
    message: "Veuillez sélectionner un formulaire ou un parcours.",
    path: ['modelId'], 
});


type NewFollowUpFormData = z.infer<typeof newFollowUpSchema>;

function FollowUpManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [selectedSuivi, setSelectedSuivi] = useState<FollowUp | null>(null);
    
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
    
    const learningPathsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/learning_paths`));
    }, [user, firestore]);
    const { data: learningPaths, isLoading: arePathsLoading } = useCollection<LearningPath>(learningPathsQuery);

    const followUpsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/follow_ups`));
    }, [user, firestore]);
    const { data: followUpsData, isLoading: areFollowUpsLoading } = useCollection<FollowUp>(followUpsQuery);

    const pathEnrollmentsQuery = useMemoFirebase(() => {
      if (!user) return null;
      return query(collection(firestore, `users/${user.uid}/path_enrollments`));
    }, [user, firestore]);
    const { data: pathEnrollmentsData, isLoading: areEnrollmentsLoading } = useCollection<PathEnrollment>(pathEnrollmentsQuery);

    const combinedFollowUps = useMemo(() => {
        const forms = (followUpsData || []).map(f => ({ ...f, type: 'form' as const, pathName: f.modelName, enrolledAt: f.createdAt, userId: f.clientId }));
        const paths = (pathEnrollmentsData || []).map(p => ({ ...p, type: 'path' as const, modelId: p.pathId, modelName: p.pathName, createdAt: p.enrolledAt }));
        return [...forms, ...paths].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [followUpsData, pathEnrollmentsData]);

    const onSubmit = (data: NewFollowUpFormData) => {
        if (!user) return;
        
        const client = clients?.find(c => c.id === data.clientId);
        if (!client) return;

        if (data.assignationType === 'form' && data.modelId) {
            const model = models?.find(m => m.id === data.modelId);
            if (!model) return;
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
            toast({title: "Suivi de formulaire créé"});
        } else if (data.assignationType === 'path' && data.pathId) {
            const path = learningPaths?.find(p => p.id === data.pathId);
            if(!path) return;
            const newEnrollment: Omit<PathEnrollment, 'id'> = {
                counselorId: user.uid,
                userId: client.id,
                clientName: `${client.firstName} ${client.lastName}`,
                pathId: path.id,
                pathName: path.title,
                enrolledAt: new Date().toISOString(),
                status: 'pending',
            };
            addDocumentNonBlocking(collection(firestore, `users/${user.uid}/path_enrollments`), newEnrollment);
            toast({title: "Suivi de parcours créé"});
        }
        
        setIsSheetOpen(false);
        form.reset();
    };
    
     const handleDeleteFollowUp = (item: FollowUp | PathEnrollment) => {
        if (!user) return;
        const collectionName = item.type === 'path' ? 'path_enrollments' : 'follow_ups';
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/${collectionName}`, item.id));
        toast({ title: 'Suivi supprimé' });
    };

    const handleOpenPdfModal = (suivi: FollowUp) => {
        setSelectedSuivi(suivi);
        setIsPdfModalOpen(true);
    };
    
    const assignationType = form.watch('assignationType');
    const isLoading = areFollowUpsLoading || areEnrollmentsLoading;

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
                                <SheetDescription>Sélectionnez un client et un modèle de formulaire ou un parcours.</SheetDescription>
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
                                        name="assignationType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type d'assignation</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="form">Formulaire simple</SelectItem>
                                                        <SelectItem value="path">Parcours complet</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    {assignationType === 'form' && (
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
                                    )}

                                     {assignationType === 'path' && (
                                         <FormField
                                            control={form.control}
                                            name="pathId"
                                            render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Parcours</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                                {field.value ? learningPaths?.find(p => p.id === field.value)?.title : "Sélectionner un parcours"}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Rechercher un parcours..." />
                                                            <CommandEmpty>Aucun parcours trouvé.</CommandEmpty>
                                                            <CommandList>
                                                                {learningPaths?.map((path) => (
                                                                    <CommandItem value={path.title} key={path.id} onSelect={() => { form.setValue("pathId", path.id) }}>
                                                                        <Check className={cn("mr-2 h-4 w-4", path.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                        {path.title}
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
                                    )}

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
                            <TableHead>Type</TableHead>
                            <TableHead>Nom du modèle/parcours</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {isLoading ? <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                         : combinedFollowUps && combinedFollowUps.length > 0 ? (
                            combinedFollowUps.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.clientName}</TableCell>
                                    <TableCell><Badge variant={item.type === 'path' ? 'default': 'secondary'}>{item.type === 'path' ? 'Parcours' : 'Formulaire'}</Badge></TableCell>
                                    <TableCell>{item.modelName || item.pathName}</TableCell>
                                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell><Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>{item.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/suivi/${item.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" /> Ouvrir
                                                    </Link>
                                                </DropdownMenuItem>
                                                {item.type === 'form' && (
                                                     <DropdownMenuItem onClick={() => handleOpenPdfModal(item as FollowUp)}>
                                                        <Download className="mr-2 h-4 w-4" /> Exporter PDF
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteFollowUp(item)}>Supprimer</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                         ) : (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucun suivi en cours.</TableCell></TableRow>
                         )}
                    </TableBody>
                </Table>
            </CardContent>
             {selectedSuivi && models && (
                <PdfPreviewModal
                    isOpen={isPdfModalOpen}
                    onOpenChange={setIsPdfModalOpen}
                    suivi={selectedSuivi}
                    model={models.find(m => m.id === selectedSuivi.modelId) || null}
                />
            )}
        </Card>
    )
}

function FormTemplateManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userData } = useDoc(userDocRef);
  const { personalization } = useAgency();
  
  const userPlan = useMemo(() => {
    if (!userData?.planId || !personalization?.whiteLabelSection?.plans) {
      return null;
    }
    return personalization.whiteLabelSection.plans.find(p => p.id === userData.planId);
  }, [userData, personalization]);
  
  const showPrisme = userPlan?.hasPrismeAccess || (userData as any)?.role === 'superadmin';

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
                                              if (field.type === 'scale') {
                                                  return <ScaleBlockEditor key={field.id} index={index} form={form} update={update} remove={remove} />;
                                              }
                                              if (field.type === 'aura') {
                                                  return <AuraBlockEditor key={field.id} remove={() => remove(index)} />;
                                              }
                                              if (field.type === 'vitae') {
                                                  return <VitaeBlockEditor key={field.id} remove={() => remove(index)} />;
                                              }
                                               if (field.type === 'prisme') {
                                                  return <PrismeBlockEditor key={field.id} remove={() => remove(index)} />;
                                              }
                                              if (field.type === 'scorm') {
                                                  return <ScormBlockEditor key={field.id} index={index} form={form} update={update} remove={remove} />;
                                              }
                                              if (field.type === 'qcm') {
                                                  return <QcmBlockEditor key={field.id} index={index} form={form} update={update} remove={remove} />;
                                              }
                                              if (field.type === 'free-text') {
                                                  return <FreeTextBlockEditor key={field.id} index={index} form={form} remove={remove} />;
                                              }
                                              if (field.type === 'report') {
                                                  return <ReportBlockEditor key={field.id} index={index} form={form} remove={remove} />;
                                              }
                                              return null;
                                          })}
                                          <div className="flex flex-wrap gap-2">
                                              <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'scale', title: '', questions: [{id: `sq-${Date.now()}`, text: ''}] })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> Bloc "Échelle"
                                              </Button>
                                              <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'aura' })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> "Analyse AURA"
                                              </Button>
                                               <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'vitae' })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> "Analyse Vitae"
                                              </Button>
                                               {showPrisme && (
                                                <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'prisme' })}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> "Bloc Prisme"
                                                </Button>
                                               )}
                                               <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'scorm', title: 'Nouveau bloc SCORM', questions: [], results: [] })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> Bloc "SCORM"
                                              </Button>
                                               <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'qcm', title: 'Nouveau QCM', questions: [] })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> Bloc "QCM"
                                              </Button>
                                               <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'free-text', question: '' })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> Bloc "Texte libre"
                                              </Button>
                                               <Button type="button" variant="outline" onClick={() => append({ id: `q-${Date.now()}`, type: 'report', title: 'Compte rendu' })}>
                                                  <PlusCircle className="mr-2 h-4 w-4" /> Bloc "Compte rendu"
                                              </Button>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </ScrollArea>
                          <SheetFooter className="pt-4 border-t mt-auto">
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

// ----- Child Editor Components -----
type EditorProps = {
    index: number;
    form: ReturnType<typeof useForm<QuestionModelFormData>>;
    update: ReturnType<typeof useFieldArray<QuestionModelFormData>>['update'];
    remove: ReturnType<typeof useFieldArray<QuestionModelFormData>>['remove'];
}

function ScaleBlockEditor({ index, form, update, remove }: EditorProps) {
    const field = form.watch(`questions.${index}`) as z.infer<typeof scaleQuestionSchema>;

    return (
        <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Scale className="h-4 w-4"/>Bloc de questions sur une échelle</div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
            <div className='space-y-4'>
                <FormField
                    control={form.control}
                    name={`questions.${index}.title`}
                    render={({ field }) => (
                        <FormItem><FormLabel>Titre du bloc</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                         }}><Trash2 className="h-4 w-4 text-destructive/70"/></Button>
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
        </Card>
    )
}

function FreeTextBlockEditor({ index, form, remove }: Omit<EditorProps, 'update'>) {
    return (
        <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><FileText className="h-4 w-4"/>Bloc Texte Libre</div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
            <FormField
                control={form.control}
                name={`questions.${index}.question`}
                render={({ field }) => (
                    <FormItem><FormLabel>Texte de la question</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}
            />
        </Card>
    );
}

function ReportBlockEditor({ index, form, remove }: Omit<EditorProps, 'update'>) {
    return (
        <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><FileSignature className="h-4 w-4"/>Bloc Compte Rendu</div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
            <FormField
                control={form.control}
                name={`questions.${index}.title`}
                render={({ field }) => (
                    <FormItem><FormLabel>Titre du bloc</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}
            />
        </Card>
    );
}

function AuraBlockEditor({ remove }: { remove: () => void }) {
    return (
        <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><BrainCog className="h-4 w-4"/>Analyse AURA</div>
                <Button type="button" variant="ghost" size="icon" onClick={remove}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
            <div className="text-center text-muted-foreground p-4 rounded-md mt-4">
                Le bloc d'analyse AURA sera inséré ici lors du suivi.
            </div>
        </Card>
    );
}

function VitaeBlockEditor({ remove }: { remove: () => void }) {
    return (
        <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Bot className="h-4 w-4"/>Analyse Vitae</div>
                <Button type="button" variant="ghost" size="icon" onClick={remove}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
            <div className="text-center text-muted-foreground p-4 rounded-md mt-4">
                Le bloc d'analyse Vitae sera inséré ici lors du suivi.
            </div>
        </Card>
    );
}

function PrismeBlockEditor({ remove }: { remove: () => void }) {
    return (
        <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Pyramid className="h-4 w-4"/>Bloc Prisme</div>
                <Button type="button" variant="ghost" size="icon" onClick={remove}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
            <div className="text-center text-muted-foreground p-4 rounded-md mt-4">
                Le bloc de tirage Prisme sera inséré ici lors du suivi.
            </div>
        </Card>
    );
}


function ScormAnswersEditor({ control, qIndex, questionIndex }: { control: Control<any>, qIndex: number, questionIndex: number}) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `questions.${questionIndex}.questions.${qIndex}.answers`
    });

    return (
        <div className="pl-4 border-l ml-4 space-y-3">
            {fields.map((answer, aIndex) => (
                 <div key={answer.id} className="flex gap-2 items-end">
                     <FormField control={control} name={`questions.${questionIndex}.questions.${qIndex}.answers.${aIndex}.text`} render={({field}) => (<FormItem className="flex-1"><FormLabel>Réponse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name={`questions.${questionIndex}.questions.${qIndex}.answers.${aIndex}.value`} render={({field}) => (<FormItem className="w-24"><FormLabel>Valeur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <Button type="button" variant="ghost" size="icon" onClick={() => remove(aIndex)}><Trash2 className="h-4 w-4"/></Button>
                 </div>
            ))}
             <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `ans-${Date.now()}`, text: '', value: '' })}>+ Réponse</Button>
        </div>
    )
}


function ScormBlockEditor({ index, form, remove }: EditorProps) {
    const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
        control: form.control,
        name: `questions.${index}.questions`
    });
    
    const { fields: resultFields, append: appendResult, remove: removeResult } = useFieldArray({
        control: form.control,
        name: `questions.${index}.results`
    });

    return (
         <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><BookCopy className="h-4 w-4"/>Bloc SCORM</div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
            <div className="space-y-4">
                <FormField control={form.control} name={`questions.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Titre du bloc SCORM</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div>
                    <h4 className="font-medium text-sm my-2">Questions</h4>
                    {questionFields.map((question, qIndex) => (
                        <Card key={question.id} className="p-3 mb-3 bg-background">
                            <div className="flex justify-between items-center mb-2">
                                <Label>Question {qIndex + 1}</Label>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                            <FormField control={form.control} name={`questions.${index}.questions.${qIndex}.text`} render={({field}) => (<FormItem className="mb-2"><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <ScormAnswersEditor control={form.control} qIndex={qIndex} questionIndex={index} />
                        </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendQuestion({id: `scorm-q-${Date.now()}`, text: '', answers: []})}>+ Question</Button>
                </div>
                 <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm my-2">Résultats</h4>
                     {resultFields.map((result, rIndex) => (
                        <div key={result.id} className="p-3 mb-3 border rounded-md bg-background">
                            <div className="flex justify-between items-center mb-2">
                                <Label>Résultat {rIndex + 1}</Label>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeResult(rIndex)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <FormField control={form.control} name={`questions.${index}.results.${rIndex}.value`} render={({field}) => (<FormItem><FormLabel>Valeur du résultat (seuil)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`questions.${index}.results.${rIndex}.text`} render={({field}) => (<FormItem><FormLabel>Texte du résultat</FormLabel><FormControl><RichTextEditor content={field.value || ''} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendResult({id: `scorm-r-${Date.now()}`, value: '', text: ''})}>+ Résultat</Button>
                </div>
            </div>
        </Card>
    );
}

function QcmAnswersEditor({ control, qIndex, questionIndex }: { control: Control<any>, qIndex: number, questionIndex: number}) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `questions.${questionIndex}.questions.${qIndex}.answers`
    });

    return (
        <div className="pl-4 border-l ml-4 space-y-4">
            {fields.map((answer, aIndex) => (
                 <div key={answer.id} className="flex flex-col gap-2 p-3 border rounded-md bg-white">
                    <div className="flex justify-between items-center">
                        <Label>Réponse {aIndex + 1}</Label>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(aIndex)}><Trash2 className="h-4 w-4 text-destructive/70"/></Button>
                    </div>
                     <FormField control={control} name={`questions.${questionIndex}.questions.${qIndex}.answers.${aIndex}.text`} render={({field}) => (<FormItem><FormLabel>Texte de la réponse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name={`questions.${questionIndex}.questions.${qIndex}.answers.${aIndex}.resultText`} render={({field}) => (<FormItem><FormLabel>Texte de résultat personnalisé</FormLabel><FormControl><RichTextEditor content={field.value || ''} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                 </div>
            ))}
             <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `qcm-ans-${Date.now()}`, text: '', resultText: '' })}>+ Réponse</Button>
        </div>
    )
}

function QcmBlockEditor({ index, form, remove }: EditorProps) {
    const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
        control: form.control,
        name: `questions.${index}.questions`
    });

    return (
        <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><FileQuestion className="h-4 w-4"/>Bloc QCM</div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
            <div className="space-y-4">
                <FormField control={form.control} name={`questions.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Titre du bloc QCM</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div>
                    <h4 className="font-medium text-sm my-2">Questions</h4>
                    {questionFields.map((question, qIndex) => (
                        <Card key={question.id} className="p-3 mb-3 bg-background">
                            <div className="flex justify-between items-center mb-2">
                                <Label>Question {qIndex + 1}</Label>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                            <FormField control={form.control} name={`questions.${index}.questions.${qIndex}.text`} render={({field}) => (<FormItem className="mb-2"><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <QcmAnswersEditor control={form.control} qIndex={qIndex} questionIndex={index} />
                        </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendQuestion({id: `qcm-q-${Date.now()}`, text: '', answers: []})}>+ Question</Button>
                </div>
            </div>
        </Card>
    );
}

const learningPathSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.'),
  description: z.string().optional(),
  steps: z.array(z.object({
    modelId: z.string(),
    modelName: z.string(),
  })).min(1, "Un parcours doit contenir au moins un formulaire."),
});

type LearningPathFormData = z.infer<typeof learningPathSchema>;
type LearningPath = {
    id: string;
    counselorId: string;
} & LearningPathFormData;


function LearningPathManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingPath, setEditingPath] = useState<LearningPath | null>(null);

    const pathsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/learning_paths`));
    }, [user, firestore]);
    const { data: paths, isLoading } = useCollection<LearningPath>(pathsQuery);
    
    const modelsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/question_models`));
    }, [user, firestore]);
    const { data: models, isLoading: areModelsLoading } = useCollection<QuestionModel>(modelsQuery);

    const form = useForm<LearningPathFormData>({
        resolver: zodResolver(learningPathSchema),
    });

    const { fields, append, remove, move } = useFieldArray({
        control: form.control,
        name: "steps"
    });
    
     useEffect(() => {
        if (isSheetOpen) {
            if (editingPath) {
                form.reset(editingPath);
            } else {
                form.reset({ title: '', description: '', steps: [] });
            }
        }
    }, [isSheetOpen, editingPath, form]);

    const onDragEnd: OnDragEndResponder = (result) => {
        if (!result.destination) return;
        move(result.source.index, result.destination.index);
    };

    const onModelSelect = (model: QuestionModel) => {
        if (fields.some(field => field.modelId === model.id)) {
            toast({
                title: "Modèle déjà présent",
                description: "Ce modèle de formulaire est déjà dans le parcours.",
                variant: "destructive"
            });
            return;
        }
        append({ modelId: model.id, modelName: model.name });
    };

    const onSubmit = (data: LearningPathFormData) => {
        if (!user) return;
        const pathData = { counselorId: user.uid, ...data };
        if (editingPath) {
            setDocumentNonBlocking(doc(firestore, `users/${user.uid}/learning_paths`, editingPath.id), pathData, { merge: true });
            toast({ title: "Parcours mis à jour" });
        } else {
            addDocumentNonBlocking(collection(firestore, `users/${user.uid}/learning_paths`), pathData);
            toast({ title: "Parcours créé" });
        }
        setIsSheetOpen(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Gestion des Parcours</CardTitle>
                        <CardDescription>Combinez plusieurs formulaires pour créer un parcours de suivi complet.</CardDescription>
                    </div>
                    <Button onClick={() => { setEditingPath(null); setIsSheetOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Parcours
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Titre du Parcours</TableHead>
                            <TableHead>Nombre d'étapes</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full"/></TableCell></TableRow>
                        : paths && paths.length > 0 ? (
                            paths.map(path => (
                                <TableRow key={path.id}>
                                    <TableCell>{path.title}</TableCell>
                                    <TableCell>{path.steps.length}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingPath(path); setIsSheetOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/learning_paths`, path.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : <TableRow><TableCell colSpan={3} className="h-24 text-center">Aucun parcours créé.</TableCell></TableRow>}
                    </TableBody>
                </Table>
                
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-4xl w-full flex flex-col">
                        <SheetHeader>
                            <SheetTitle>{editingPath ? 'Modifier le' : 'Nouveau'} Parcours</SheetTitle>
                        </SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                                <ScrollArea className="flex-1 pr-6 -mr-6">
                                    <div className="space-y-6 py-4">
                                        <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre du parcours</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Étapes du parcours</Label>
                                                <p className="text-xs text-muted-foreground">Faites glisser pour réorganiser.</p>
                                                <div className="mt-2 border rounded-lg p-2 min-h-48">
                                                    <DragDropContext onDragEnd={onDragEnd}>
                                                        <Droppable droppableId="steps">
                                                            {(provided) => (
                                                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                                                    {fields.map((step, index) => (
                                                                        <Draggable key={step.id} draggableId={step.id} index={index}>
                                                                            {(provided) => (
                                                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="flex items-center gap-2 p-2 rounded-md bg-background border">
                                                                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                                                    <span className="flex-1 text-sm">{step.modelName}</span>
                                                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive/70" /></Button>
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))}
                                                                    {provided.placeholder}
                                                                </div>
                                                            )}
                                                        </Droppable>
                                                    </DragDropContext>
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Modèles de formulaires disponibles</Label>
                                                <ScrollArea className="h-96 mt-2 border rounded-lg">
                                                    <div className="p-2 space-y-2">
                                                        {areModelsLoading ? <Skeleton className="h-20 w-full" /> : models?.map(model => (
                                                            <div key={model.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                                                <span className="text-sm">{model.name}</span>
                                                                <Button type="button" size="sm" variant="outline" onClick={() => onModelSelect(model)}>Ajouter</Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                                <SheetFooter className="pt-4 border-t mt-auto">
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
            <LearningPathManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
    
    
const PdfPreviewModal = ({ isOpen, onOpenChange, suivi, model }: { isOpen: boolean, onOpenChange: (open: boolean) => void, suivi: FollowUp, model: QuestionModel | null }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: currentUserData } = useDoc(userDocRef);

    const handleExportPdf = async () => {
        if (!suivi || !model || !currentUserData) return;
        const docJs = new jsPDF();
        let yPos = 20;

        docJs.setFontSize(22);
        docJs.text(`Suivi pour ${suivi.clientName}`, docJs.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
        yPos += 8;
        docJs.setFontSize(14);
        docJs.text(`Modèle: ${suivi.modelName}`, docJs.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
        yPos += 15;

        const answers = (suivi.answers || []).reduce((acc, current) => {
            acc[current.questionId] = current.answer;
            return acc;
        }, {} as Record<string, any>);

        for (const block of model.questions || []) {
            if (yPos > 250) {
                docJs.addPage();
                yPos = 20;
            }
            docJs.setFontSize(16);
            docJs.setFont('helvetica', 'bold');
            const title = (block as any).title || (block.type === 'free-text' ? (block as any).question : `Bloc ${block.type}`);
            docJs.text(title, 15, yPos);
            yPos += 10;
            docJs.setFontSize(12);
            docJs.setFont('helvetica', 'normal');

            const answer = answers[block.id]
            
            switch (block.type) {
                case 'scale':
                    if (!answer) break;
                    if (block.questions.length > 1) {
                         const body = block.questions.map(q => [q.text, answer[q.id] !== undefined ? answer[q.id] : 'N/A']);
                        autoTable(docJs, { head: [['Question', 'Score']], body, startY: yPos });
                        yPos = (docJs as any).lastAutoTable.finalY + 10;
                    } else if (block.questions.length === 1) {
                        const q = block.questions[0];
                        const value = answer[q.id] || 0;
                        docJs.text(q.text, 15, yPos);
                        yPos += 8;
                        docJs.rect(15, yPos, 180, 8);
                        docJs.setFillColor(136, 132, 216); // #8884d8
                        docJs.rect(15, yPos, (180 * value) / 10, 8, 'F');
                        docJs.text(`${value}/10`, 200, yPos + 6, { align: 'right' });
                        yPos += 15;
                    }
                    break;
                case 'report':
                    if (answer?.text) {
                        const reportLines = docJs.splitTextToSize(answer.text, 180);
                        docJs.text(reportLines, 15, yPos);
                        yPos += reportLines.length * 7 + 5;
                    }
                    if (answer?.partners?.length > 0) {
                        docJs.text("Partenaires associés:", 15, yPos);
                        yPos += 8;
                        autoTable(docJs, { head: [['Nom', 'Spécialités']], body: answer.partners.map((p: any) => [p.name, p.specialties?.join(', ') || '']), startY: yPos });
                        yPos = (docJs as any).lastAutoTable.finalY + 10;
                    }
                    break;
                case 'scorm':
                    const calculateScormResult = (scormBlock: Extract<typeof block, { type: 'scorm' }>, scormAnswers: any): ScormResult | null => {
                         if (!scormBlock.questions || !scormBlock.results || !scormAnswers) return null;
                        const questionIds = scormBlock.questions.map(q => q.id);
                        if (questionIds.some(qId => !scormAnswers[qId])) {
                            return null;
                        }
                    
                        const valueCounts: Record<string, number> = {};
                        for (const qId of questionIds) {
                            const answerId = scormAnswers[qId];
                            if (!answerId) continue;
                            const question = scormBlock.questions.find(q => q.id === qId);
                            const answerData = question?.answers.find(a => a.id === answerId);
                            if (answerData?.value) {
                                valueCounts[answerData.value] = (valueCounts[answerData.value] || 0) + 1;
                            }
                        }
                    
                        if (Object.keys(valueCounts).length === 0) return null;
                    
                        const dominantValue = Object.keys(valueCounts).reduce((a, b) => valueCounts[a] > valueCounts[b] ? a : b);
                        return scormBlock.results.find(r => r.value === dominantValue) || null;
                    };

                    const scormResult = calculateScormResult(block, answer);
                    if (scormResult?.text) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = scormResult.text;
                        const textContent = tempDiv.textContent || tempDiv.innerText || "";
                        const lines = docJs.splitTextToSize(textContent, 180);
                        docJs.text(lines, 15, yPos);
                        yPos += lines.length * 7 + 5;
                    } else {
                        docJs.text("Résultat non calculé.", 15, yPos);
                        yPos += 12;
                    }
                    break;
                default:
                    const answerText = answer !== undefined ? JSON.stringify(answer, null, 2) : "Non répondu";
                    const lines = docJs.splitTextToSize(answerText, 180);
                    docJs.text(lines, 15, yPos);
                    yPos += lines.length * 7 + 5;
                    break;
            }
            yPos += 5;
        }

        docJs.save(`Suivi_${suivi.clientName.replace(' ', '_')}_${new Date().toLocaleDateString()}.pdf`);
    };

    if (!model) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Aperçu du Suivi - {suivi.clientName}</DialogTitle>
                    <DialogDescription>Modèle: {suivi.modelName}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                        {model.questions?.map(block => {
                            const answer = suivi.answers?.find(a => a.questionId === block.id)?.answer;
                            return <ResultDisplayBlock key={block.id} block={block} answer={answer} suivi={suivi} />;
                        })}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button onClick={handleExportPdf}>
                        <Download className="mr-2 h-4 w-4" /> Télécharger en PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ResultDisplayBlock = ({ block, answer, suivi }: { block: QuestionModel['questions'][number], answer: any, suivi: FollowUp }) => {
    
    switch (block.type) {
        case 'scale':
            const scaleAnswers = answer || {};
            return (
                <Card>
                    <CardHeader><CardTitle>{block.title || "Échelle"}</CardTitle></CardHeader>
                    <CardContent>
                        {block.questions.length > 1 ? (
                             <ResponsiveContainer width="100%" height={300}>
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={block.questions.map(q => ({ subject: q.text, A: scaleAnswers[q.id] || 0, fullMark: 10 }))}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 10]} />
                                    <Radar name={suivi.clientName} dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : block.questions.map(q => (
                             <div key={q.id}>
                                <p>{q.text}: <strong>{scaleAnswers[q.id] || 'N/A'}/10</strong></p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            );
        case 'free-text':
            return (
                <Card><CardHeader><CardTitle>{block.question}</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap">{answer || 'Non répondu'}</p></CardContent></Card>
            );
        case 'report':
             return (
                <Card><CardHeader><CardTitle>{block.title}</CardTitle></CardHeader>
                    <CardContent>
                        <h4 className="font-semibold mb-2">Compte rendu</h4>
                        <p className="whitespace-pre-wrap mb-4">{answer?.text || 'Non rédigé'}</p>
                        {answer?.partners?.length > 0 && <>
                            <h4 className="font-semibold mb-2">Partenaires associés</h4>
                            <div className="space-y-2">
                                {answer.partners.map((p: any) => (
                                    <div key={p.id} className="text-sm p-3 border rounded-lg bg-muted">
                                        <p className="font-bold">{p.name}</p>
                                        <div className="text-muted-foreground text-xs mt-1 space-y-0.5">
                                            {p.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3"/>{p.email}</p>}
                                            {p.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3"/>{p.phone}</p>}
                                            {p.specialties && p.specialties.length > 0 && <p><strong>Spéc:</strong> {p.specialties.join(', ')}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>}
                    </CardContent>
                </Card>
            );
        case 'scorm':
            const calculateScormResult = (scormBlock: Extract<typeof block, { type: 'scorm' }>, scormAnswers: any): ScormResult | null => {
                 if (!scormBlock.questions || !scormBlock.results || !scormAnswers) return null;
                const questionIds = scormBlock.questions.map(q => q.id);
                if (questionIds.some(qId => !scormAnswers[qId])) {
                    return null;
                }
            
                const valueCounts: Record<string, number> = {};
                for (const qId of questionIds) {
                    const answerId = scormAnswers[qId];
                    if (!answerId) continue;
                    const question = scormBlock.questions.find(q => q.id === qId);
                    const answerData = question?.answers.find(a => a.id === answerId);
                    if (answerData?.value) {
                        valueCounts[answerData.value] = (valueCounts[answerData.value] || 0) + 1;
                    }
                }
            
                if (Object.keys(valueCounts).length === 0) return null;
            
                const dominantValue = Object.keys(valueCounts).reduce((a, b) => valueCounts[a] > valueCounts[b] ? a : b);
                return scormBlock.results.find(r => r.value === dominantValue) || null;
            };

            const scormResult = calculateScormResult(block, answer);
             return (
                <Card><CardHeader><CardTitle>{block.title}</CardTitle></CardHeader>
                    <CardContent>
                         {scormResult ? (
                            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: scormResult.text }} />
                        ) : 'Résultat non calculé.'}
                    </CardContent>
                </Card>
             );
        case 'qcm':
             return (
                <Card><CardHeader><CardTitle>{block.title}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {(block.questions || []).map(q => {
                             const selectedAnswerId = answer?.[q.id];
                             const selectedAnswer = q.answers.find(a => a.id === selectedAnswerId);
                             return (
                                 <div key={q.id}>
                                     <p className="font-semibold">{q.text}</p>
                                     <p className="text-sm text-muted-foreground">Réponse: {selectedAnswer?.text || 'Non répondu'}</p>
                                      {selectedAnswer?.resultText && (
                                        <div className="mt-2 text-sm prose dark:prose-invert max-w-none border-l-2 pl-4" dangerouslySetInnerHTML={{ __html: selectedAnswer.resultText}}/>
                                      )}
                                 </div>
                             )
                        })}
                    </CardContent>
                </Card>
            );
        case 'prisme':
            return (
                <Card><CardHeader><CardTitle>Analyse Prisme</CardTitle></CardHeader>
                    <CardContent>
                         {answer?.drawnCards?.length > 0 ? (
                            <div className="space-y-4">
                                {answer.drawnCards.map((item: any, index: React.Key) => (
                                    <div key={index} className="flex gap-4 p-4 border rounded-lg bg-background">
                                        <div className="flex-shrink-0">
                                            {item.card.imageUrl ? <Image src={item.card.imageUrl} alt={item.card.name} width={80} height={120} className="rounded-md object-cover" /> : <div className="w-20 h-[120px] bg-muted rounded-md" />}
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{item.position.meaning}</p>
                                            <h4 className="text-lg font-bold">{item.card.name}</h4>
                                            <p className="text-sm">{item.card.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : 'Aucun tirage effectué.'}
                    </CardContent>
                </Card>
            );
        case 'vitae':
            return (
                <Card>
                    <CardHeader><CardTitle>Analyse Vitae</CardTitle></CardHeader>
                    <CardContent>
                        <VitaeAnalysisBlock savedAnalysis={answer} onSaveAnalysis={() => {}} onSaveBlock={async () => {}} readOnly />
                    </CardContent>
                </Card>
            );
        case 'aura':
            const renderSuggestions = (title: string, data: { products: any[], protocoles: any[] }, key: string) => {
                if (!data || (!data.products?.length && !data.protocoles?.length)) {
                    return (
                        <div key={key} className="mb-4">
                            <h4 className="font-semibold text-primary">{title}</h4>
                            <p className="text-sm text-muted-foreground">Aucune suggestion.</p>
                        </div>
                    );
                }
                return (
                    <div key={key} className="mb-4">
                        <h4 className="font-semibold text-primary">{title}</h4>
                        {data.products && data.products.length > 0 && <p className="text-sm"><b>Produits:</b> {data.products.map((p: any) => p.title).join(', ')}</p>}
                        {data.protocoles && data.protocoles.length > 0 && <p className="text-sm"><b>Protocoles:</b> {data.protocoles.map((p: any) => p.name).join(', ')}</p>}
                    </div>
                );
             };

            if (!answer) {
                return (
                    <Card>
                        <CardHeader><CardTitle>Analyse AURA</CardTitle></CardHeader>
                        <CardContent><p className="text-muted-foreground">Analyse non effectuée.</p></CardContent>
                    </Card>
                );
            }

            return (
                <Card>
                    <CardHeader><CardTitle>Analyse AURA</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                             <h3 className="font-bold text-lg mb-2">Correspondance par Pathologie</h3>
                             {answer.byPathology && answer.byPathology.length > 0 ? answer.byPathology.map((item: any, index: number) => renderSuggestions(item.pathology, { products: item.products, protocoles: item.protocoles }, `pathology-${index}`)) : <p className="text-sm text-muted-foreground">Aucune.</p>}
                        </div>
                         <div className="pt-4 border-t">
                            <h3 className="font-bold text-lg mb-2">Adapté au Profil Holistique</h3>
                            {renderSuggestions('', answer.byHolisticProfile, 'holistic')}
                        </div>
                        <div className="pt-4 border-t">
                            <h3 className="font-bold text-lg mb-2">Cohérence Parfaite</h3>
                             {renderSuggestions('', answer.perfectMatch, 'perfect')}
                        </div>
                    </CardContent>
                </Card>
            );
        default:
             const unknownAnswerText = answer ? JSON.stringify(answer, null, 2) : "Non répondu";
            return (
                <Card>
                    <CardHeader><CardTitle>{(block as any).title || block.type}</CardTitle></CardHeader>
                    <CardContent>
                        <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded-md">{unknownAnswerText}</pre>
                    </CardContent>
                </Card>
            );
    }
}
