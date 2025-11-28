
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Loader2, Image as ImageIcon, Wand2, X, Video, FileText, Upload, Link as LinkIcon, BookOpen, ScrollText, Users, EyeOff, CheckCircle } from 'lucide-react';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useStorage } from '@/firebase';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, SheetDescription } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';


const categorySchema = z.object({
  name: z.string().min(1, "Le nom de la catégorie est requis."),
});

type TrainingCategory = {
    id: string;
    counselorId: string;
    name: string;
};

type CategoryFormData = z.infer<typeof categorySchema>;

function CategoryManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<TrainingCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<TrainingCategory | null>(null);

    const categoriesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'training_categories'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: categories, isLoading } = useCollection<TrainingCategory>(categoriesQuery);

    const form = useForm<CategoryFormData>({ resolver: zodResolver(categorySchema) });

    useEffect(() => {
        if (isSheetOpen) {
            form.reset(editingCategory || { name: '' });
        }
    }, [isSheetOpen, editingCategory, form]);

    const handleNew = () => {
        setEditingCategory(null);
        setIsSheetOpen(true);
    };

    const handleEdit = (category: TrainingCategory) => {
        setEditingCategory(category);
        setIsSheetOpen(true);
    };
    
    const onSubmit = (data: CategoryFormData) => {
        if (!user) return;
        const categoryData = { counselorId: user.uid, ...data };
        if (editingCategory) {
            setDocumentNonBlocking(doc(firestore, 'training_categories', editingCategory.id), categoryData, { merge: true });
            toast({ title: 'Catégorie mise à jour' });
        } else {
            addDocumentNonBlocking(collection(firestore, 'training_categories'), categoryData);
            toast({ title: 'Catégorie créée' });
        }
        setIsSheetOpen(false);
    };

    const handleDelete = () => {
        if (!categoryToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'training_categories', categoryToDelete.id));
        toast({ title: 'Catégorie supprimée' });
        setCategoryToDelete(null);
    };


    return (
         <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Catégories de Formation</CardTitle>
                        <CardDescription>Organisez vos formations en différentes catégories.</CardDescription>
                    </div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4" />Nouvelle Catégorie</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow><TableHead>Nom de la catégorie</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? <TableRow><TableCell colSpan={2}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            : categories && categories.length > 0 ? (
                                categories.map(cat => (
                                    <TableRow key={cat.id}>
                                        <TableCell className="font-medium">{cat.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setCategoryToDelete(cat)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={2} className="h-24 text-center">Aucune catégorie créée.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-lg w-full">
                        <SheetHeader>
                            <SheetTitle>{editingCategory ? 'Modifier la' : 'Nouvelle'} catégorie</SheetTitle>
                        </SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <SheetFooter className="pt-6">
                                    <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                    <Button type="submit">Sauvegarder</Button>
                                </SheetFooter>
                            </form>
                        </Form>
                    </SheetContent>
                </Sheet>
                 <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}

const questionSchema = z.object({
  questionText: z.string().min(1, 'Le texte de la question est requis.'),
  options: z.array(z.object({ text: z.string().min(1, "L'option ne peut pas être vide.") })).min(2, "Il faut au moins 2 options."),
  correctAnswerIndex: z.coerce.number().min(0, "Veuillez sélectionner une bonne réponse."),
});

const quizSchema = z.object({
  title: z.string().min(1, "Le titre du quiz est requis."),
  successPercentage: z.number().min(0).max(100).default(80),
  questions: z.array(questionSchema).optional(),
});

const moduleSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.'),
  description: z.string().optional(),
  videoUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  pdfUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  content: z.string().optional(),
  quiz: quizSchema.optional(),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

type TrainingModule = ModuleFormData & {
    id: string;
    counselorId: string;
};

function ModuleManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
    const [moduleToDelete, setModuleToDelete] = useState<TrainingModule | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const modulesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'training_modules'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: modules, isLoading: areModulesLoading } = useCollection<TrainingModule>(modulesQuery);

    const form = useForm<ModuleFormData>({
        resolver: zodResolver(moduleSchema),
    });

    const { fields: quizQuestions, append: appendQuestion, remove: removeQuestion } = useFieldArray({
        control: form.control,
        name: "quiz.questions",
    });
    
    useEffect(() => {
        if (isSheetOpen) {
            let initialData: ModuleFormData = editingModule ? { ...editingModule } : {
                title: '', description: '', videoUrl: '', pdfUrl: '', content: '',
                quiz: { title: '', successPercentage: 80, questions: [] }
            };
            if (initialData.pdfUrl?.startsWith('data:')) {
                initialData.pdfUrl = '';
            }
            form.reset(initialData);
        }
    }, [isSheetOpen, editingModule, form]);
    
    const handleNew = () => { setEditingModule(null); setIsSheetOpen(true); };
    const handleEdit = (mod: TrainingModule) => { setEditingModule(mod); setIsSheetOpen(true); };

    const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !storage || !user) return;

        setIsUploading(true);
        toast({ title: 'Téléversement en cours...', description: 'Veuillez patienter.' });
        
        const filePath = `Formation/${file.name}`;
        const fileRef = ref(storage, filePath);

        try {
            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);
            form.setValue('pdfUrl', downloadURL, { shouldValidate: true });
            toast({ title: 'Téléversement réussi', description: 'Le fichier PDF a été ajouté.' });
        } catch (error) {
            console.error("PDF Upload Error:", error);
            toast({ title: 'Erreur de téléversement', description: "Impossible d'envoyer le fichier.", variant: 'destructive' });
        } finally {
            setIsUploading(false);
             if (pdfInputRef.current) {
                pdfInputRef.current.value = "";
            }
        }
    }

    const onSubmit = (data: ModuleFormData) => {
        if (!user) return;
        const moduleData = { counselorId: user.uid, ...data };
        if (editingModule) {
            setDocumentNonBlocking(doc(firestore, 'training_modules', editingModule.id), moduleData, { merge: true });
            toast({ title: "Module mis à jour" });
        } else {
            addDocumentNonBlocking(collection(firestore, 'training_modules'), moduleData);
            toast({ title: "Module créé" });
        }
        setIsSheetOpen(false);
    };
    
    const handleDelete = () => {
        if (!moduleToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'training_modules', moduleToDelete.id));
        toast({ title: 'Module supprimé' });
        setModuleToDelete(null);
    }
    
    const watchPdfUrl = form.watch('pdfUrl');

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Gestion des Modules & Évaluations</CardTitle>
                        <CardDescription>Créez les briques de contenu pour vos formations.</CardDescription>
                    </div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4"/>Nouveau Module</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow><TableHead>Titre du Module</TableHead><TableHead>Quiz associé ?</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {areModulesLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-10 w-full"/></TableCell></TableRow>
                            : modules && modules.length > 0 ? (
                                modules.map(mod => (
                                    <TableRow key={mod.id}>
                                        <TableCell className="font-medium">{mod.title}</TableCell>
                                        <TableCell>{mod.quiz?.title ? 'Oui' : 'Non'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(mod)}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setModuleToDelete(mod)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center">Aucun module créé.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-4xl w-full">
                        <SheetHeader><SheetTitle>{editingModule ? "Modifier le" : "Nouveau"} module</SheetTitle></SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <ScrollArea className="h-[calc(100vh-8rem)]">
                                    <div className="space-y-6 py-4 pr-6">
                                        <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre du module</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage/></FormItem>)}/>
                                        <FormField control={form.control} name="videoUrl" render={({ field }) => (<FormItem><FormLabel>URL Vidéo (Optionnel)</FormLabel><FormControl><div className="flex items-center gap-2"><Video className="h-4 w-4 text-muted-foreground"/><Input {...field} placeholder="https://youtube.com/embed/..."/></div></FormControl><FormMessage/></FormItem>)}/>
                                        
                                        <FormField control={form.control} name="pdfUrl" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Document PDF (Optionnel)</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-muted-foreground"/>
                                                        <Input {...field} placeholder="URL du PDF..." disabled />
                                                        <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => pdfInputRef.current?.click()} disabled={isUploading}>
                                                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                                                        </Button>
                                                        {watchPdfUrl && (
                                                            <a href={watchPdfUrl} target="_blank" rel="noopener noreferrer">
                                                                <Button type="button" variant="outline" size="icon" className="h-10 w-10">
                                                                    <LinkIcon className="h-4 w-4" />
                                                                </Button>
                                                            </a>
                                                        )}
                                                        <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} className="hidden" accept="application/pdf" />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>

                                        <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Contenu du cours</FormLabel><FormControl><RichTextEditor content={field.value || ''} onChange={field.onChange}/></FormControl><FormMessage/></FormItem>)}/>
                                        
                                        <div className="space-y-6 pt-6 border-t">
                                            <h3 className="text-lg font-medium">Évaluation (Quiz)</h3>
                                            <FormField control={form.control} name="quiz.title" render={({ field }) => (<FormItem><FormLabel>Titre du quiz</FormLabel><FormControl><Input {...field} placeholder="Laissez vide pour ne pas avoir de quiz"/></FormControl><FormMessage/></FormItem>)}/>
                                            <FormField control={form.control} name="quiz.successPercentage" render={({ field }) => (<FormItem><FormLabel>Pourcentage de réussite requis: {field.value}%</FormLabel><FormControl><Slider defaultValue={[80]} max={100} step={5} onValueChange={(value) => field.onChange(value[0])} /></FormControl></FormItem>)}/>

                                            <div>
                                                <h4 className="font-medium mb-4">Questions du quiz</h4>
                                                <div className="space-y-4">
                                                {quizQuestions.map((question, qIndex) => (
                                                    <Card key={question.id} className="p-4">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <h5 className="font-semibold">Question {qIndex + 1}</h5>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <FormField control={form.control} name={`quiz.questions.${qIndex}.questionText`} render={({ field }) => (<FormItem><FormLabel>Texte de la question</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem>)}/>
                                                            <FormField
                                                                control={form.control}
                                                                name={`quiz.questions.${qIndex}.correctAnswerIndex`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Options (cochez la bonne réponse)</FormLabel>
                                                                        <FormControl>
                                                                            <RadioGroup onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)} className="space-y-2">
                                                                                {form.getValues(`quiz.questions.${qIndex}.options`)?.map((_, oIndex) => (
                                                                                    <div key={oIndex} className="flex items-center gap-2">
                                                                                         <RadioGroupItem value={String(oIndex)} id={`q${qIndex}-o${oIndex}`} />
                                                                                        <FormField control={form.control} name={`quiz.questions.${qIndex}.options.${oIndex}.text`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>
                                                                                        <Button type="button" size="icon" variant="ghost" onClick={() => {
                                                                                            const options = form.getValues(`quiz.questions.${qIndex}.options`);
                                                                                            form.setValue(`quiz.questions.${qIndex}.options`, options.filter((_, i) => i !== oIndex));
                                                                                        }}><Trash2 className="h-4 w-4 text-destructive/70"/></Button>
                                                                                    </div>
                                                                                ))}
                                                                            </RadioGroup>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                             <Button type="button" variant="outline" size="sm" onClick={() => {
                                                                const options = form.getValues(`quiz.questions.${qIndex}.options`) || [];
                                                                form.setValue(`quiz.questions.${qIndex}.options`, [...options, {text: ''}]);
                                                            }}><PlusCircle className="mr-2 h-4 w-4"/>Ajouter une option</Button>
                                                        </div>
                                                    </Card>
                                                ))}
                                                </div>
                                                <Button type="button" variant="outline" size="sm" onClick={() => appendQuestion({ questionText: '', options: [{text:''}, {text:''}], correctAnswerIndex: 0 })} className="mt-4"><PlusCircle className="mr-2 h-4 w-4"/>Ajouter une question</Button>
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
                 <AlertDialog open={!!moduleToDelete} onOpenChange={(open) => !open && setModuleToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce module ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible. Le module "{moduleToDelete?.title}" sera définitivement supprimé.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}

const trainingFormSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Veuillez sélectionner une catégorie."),
  imageUrl: z.string().nullable().optional(),
  price: z.coerce.number().min(0, "Le prix doit être positif.").optional(),
  duration: z.coerce.number().min(0, "La durée doit être positive.").optional(),
  isPublic: z.boolean().default(false),
  type: z.enum(['internal', 'external']).default('internal'),
  externalUrl: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
}).refine((data) => {
    if (data.type === 'external' && !data.externalUrl) {
        return false;
    }
    return true;
}, {
    message: "L'URL externe est requise pour ce type de formation.",
    path: ["externalUrl"],
});


type TrainingFormData = z.infer<typeof trainingFormSchema>;

type Training = {
    id: string;
    authorId: string;
    title: string;
    description?: string;
    categoryId: string;
    imageUrl?: string | null;
    price?: number;
    duration?: number;
    isPublic?: boolean;
    type?: 'internal' | 'external';
    externalUrl?: string;
};

function TrainingManager() {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingTraining, setEditingTraining] = useState<Training | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const categoriesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'training_categories'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<TrainingCategory>(categoriesQuery);

    const trainingsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'trainings'), where('authorId', '==', user.uid));
    }, [user, firestore]);
    const { data: trainings, isLoading: areTrainingsLoading } = useCollection<Training>(trainingsQuery);

    const form = useForm<TrainingFormData>({ resolver: zodResolver(trainingFormSchema) });
    
    useEffect(() => {
        if (isSheetOpen) {
            if (editingTraining) {
                form.reset(editingTraining);
            } else {
                 form.reset({
                    title: '',
                    description: '',
                    categoryId: '',
                    imageUrl: null,
                    price: 0,
                    duration: 0,
                    isPublic: false,
                    type: 'internal',
                    externalUrl: '',
                });
            }
        }
    }, [isSheetOpen, editingTraining, form]);

    const handleNew = () => {
        setEditingTraining(null);
        setIsSheetOpen(true);
    };

    const handleEdit = (training: Training) => {
        setEditingTraining(training);
        setIsSheetOpen(true);
    };

    const handleDelete = (trainingId: string) => {
        deleteDocumentNonBlocking(doc(firestore, 'trainings', trainingId));
        toast({ title: 'Formation supprimée' });
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !storage || !user) return;

        setIsUploading(true);
        toast({ title: 'Téléversement en cours...' });
        
        const filePath = `FormationImages/${file.name}`;
        const fileRef = ref(storage, filePath);

        try {
            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);
            form.setValue('imageUrl', downloadURL, { shouldValidate: true });
            toast({ title: 'Image téléversée' });
        } catch (error) {
            console.error("Image Upload Error:", error);
            toast({ title: "Erreur de téléversement", variant: 'destructive' });
        } finally {
            setIsUploading(false);
            if(imageInputRef.current) imageInputRef.current.value = "";
        }
    };


    const onSubmit = (data: TrainingFormData) => {
        if (!user) return;
        const trainingData = { authorId: user.uid, ...data };
        if (editingTraining) {
            setDocumentNonBlocking(doc(firestore, 'trainings', editingTraining.id), trainingData, { merge: true });
            toast({ title: 'Formation mise à jour' });
        } else {
            addDocumentNonBlocking(collection(firestore, 'trainings'), trainingData);
            toast({ title: 'Formation créée' });
        }
        setIsSheetOpen(false);
    };
        
    const watchTrainingType = form.watch("type");
    const watchImageUrl = form.watch("imageUrl");

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Catalogue de Formations</CardTitle>
                        <CardDescription>Créez et gérez les "coquilles" de vos formations.</CardDescription>
                    </div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4"/>Nouvelle Formation</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Titre</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead>Prix</TableHead>
                                <TableHead>Publique</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {areTrainingsLoading ? <TableRow><TableCell colSpan={5}><Skeleton className="h-10 w-full"/></TableCell></TableRow>
                            : trainings && trainings.length > 0 ? (
                                trainings.map(training => {
                                    const categoryName = categories?.find(c => c.id === training.categoryId)?.name || 'N/A';
                                    return (
                                        <TableRow key={training.id}>
                                            <TableCell className="font-medium">{training.title}</TableCell>
                                            <TableCell>{categoryName}</TableCell>
                                            <TableCell>{training.price ? `${training.price}€` : '-'}</TableCell>
                                            <TableCell>{training.isPublic ? <CheckCircle className="h-5 w-5 text-green-500" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}</TableCell>
                                            <TableCell className="text-right">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={`/dashboard/e-learning/path/${training.id}`} passHref>
                                                                <Button variant="ghost" size="icon">
                                                                    <FileText className="h-4 w-4"/>
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Gérer le parcours</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(training)}><Edit className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(training.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Aucune formation créée.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-2xl w-full">
                        <SheetHeader>
                            <SheetTitle>{editingTraining ? 'Modifier la' : 'Nouvelle'} formation</SheetTitle>
                        </SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <ScrollArea className="h-[calc(100vh-8rem)]">
                                <div className="space-y-6 py-4 pr-6">
                                    <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description courte</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Catégorie</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger disabled={areCategoriesLoading}><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Prix (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="duration" render={({ field }) => (<FormItem><FormLabel>Durée (heures)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <div>
                                        <Label>Image de couverture</Label>
                                        <div className="flex items-center gap-4 mt-2">
                                            {watchImageUrl ? <Image src={watchImageUrl} alt="Aperçu" width={160} height={90} className="rounded-md object-cover border" /> : <div className="w-40 h-[90px] bg-muted rounded-md" />}
                                            <input type="file" ref={imageInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                            <div className="flex flex-col gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={isUploading}>
                                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />} Uploader
                                                </Button>
                                                {watchImageUrl && <Button type="button" variant="destructive" size="sm" onClick={() => form.setValue('imageUrl', null)}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</Button>}
                                            </div>
                                        </div>
                                    </div>
                                    <FormField control={form.control} name="type" render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Type de formation</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} value={field.value} className="flex space-x-4">
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="internal" /></FormControl><FormLabel className="font-normal">Interne</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="external" /></FormControl><FormLabel className="font-normal">Externe</FormLabel></FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     {watchTrainingType === 'external' && (
                                        <FormField control={form.control} name="externalUrl" render={({ field }) => (<FormItem><FormLabel>URL Externe</FormLabel><FormControl><Input {...field} placeholder="https://example.com/training" /></FormControl><FormMessage /></FormItem>)} />
                                    )}
                                    <FormField control={form.control} name="isPublic" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-1 leading-none"><FormLabel>Prestation Publique</FormLabel></div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                                </ScrollArea>
                                <SheetFooter className="pt-6 border-t mt-4">
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

function MemberManagement() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestion des Membres</CardTitle>
                <CardDescription>
                    Inscrivez vos clients à des formations ou parcours et suivez leur progression.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                    <Users className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">Suivi de l'Assiduité</h3>
                    <p className="text-muted-foreground mt-2 max-w-2xl">Un tableau de bord vous permettra d'inscrire vos clients aux différents parcours et de visualiser leur avancement et leurs résultats.</p>
                </div>
            </CardContent>
        </Card>
    );
}


export default function ElearningPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">E-Learning</h1>
                <p className="text-muted-foreground">
                    Gérez vos formations, modules, tests et parcours d'apprentissage.
                </p>
            </div>

            <Tabs defaultValue="catalog">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto">
                    <TabsTrigger value="catalog">
                        <BookOpen className="mr-2 h-4 w-4" /> Catalogue de Formations
                    </TabsTrigger>
                    <TabsTrigger value="modules">
                        <ScrollText className="mr-2 h-4 w-4" /> Modules & Évaluations
                    </TabsTrigger>
                     <TabsTrigger value="members">
                        <Users className="mr-2 h-4 w-4" /> Gestion des Membres
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="catalog">
                   <div className="space-y-8">
                        <CategoryManager />
                        <TrainingManager />
                    </div>
                </TabsContent>

                <TabsContent value="modules">
                     <ModuleManager />
                </TabsContent>
                
                <TabsContent value="members">
                    <MemberManagement />
                </TabsContent>
            </Tabs>
        </div>
    );
}
