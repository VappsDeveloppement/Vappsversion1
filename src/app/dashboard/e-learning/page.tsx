
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCopy, CheckSquare, Users, Presentation, ScrollText, PlusCircle, Edit, Trash2, Loader2, Video, FileText, Upload } from "lucide-react";
import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useStorage } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Schemas
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

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });


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
            if (editingModule) {
                form.reset(editingModule);
            } else {
                form.reset({
                    title: '', description: '', videoUrl: '', pdfUrl: '', content: '',
                    quiz: { title: '', successPercentage: 80, questions: [] }
                });
            }
        }
    }, [isSheetOpen, editingModule, form]);
    
    const handleNew = () => { setEditingModule(null); setIsSheetOpen(true); };
    const handleEdit = (mod: TrainingModule) => { setEditingModule(mod); setIsSheetOpen(true); };

    const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !storage) return;

        setIsUploading(true);
        toast({ title: 'Téléversement en cours...', description: 'Veuillez patienter.' });
        
        const filePath = `Formation/${Date.now()}-${file.name}`;
        const fileRef = ref(storage, filePath);

        try {
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            form.setValue('pdfUrl', downloadURL);
            toast({ title: 'Téléversement réussi', description: 'Le fichier PDF a été ajouté.' });
        } catch (error) {
            console.error("PDF Upload Error:", error);
            toast({ title: 'Erreur de téléversement', description: "Impossible d'envoyer le fichier.", variant: 'destructive' });
        } finally {
            setIsUploading(false);
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
                                                        <Button type="button" variant="outline" size="sm" onClick={() => pdfInputRef.current?.click()} disabled={isUploading}>
                                                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
                                                        </Button>
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

export default function ElearningPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">E-Learning</h1>
                <p className="text-muted-foreground">
                    Gérez vos formations, modules, tests et parcours d'apprentissage.
                </p>
            </div>

            <Tabs defaultValue="modules">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto">
                    <TabsTrigger value="catalog">
                        <BookCopy className="mr-2 h-4 w-4" /> Catalogue de Formations
                    </TabsTrigger>
                    <TabsTrigger value="modules">
                        <ScrollText className="mr-2 h-4 w-4" /> Modules & Évaluations
                    </TabsTrigger>
                     <TabsTrigger value="members">
                        <Users className="mr-2 h-4 w-4" /> Gestion des Membres
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="catalog">
                    <Card>
                        <CardHeader>
                            <CardTitle>Catalogue de Formations</CardTitle>
                            <CardDescription>
                                Créez la structure globale de vos formations. Celles-ci pourront être affichées sur votre page d'accueil.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <BookCopy className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Gestion des Formations</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">Cette section vous permettra de créer vos formations (internes ou externes) et de les organiser dans un catalogue complet.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="modules">
                     <ModuleManager />
                </TabsContent>
                
                <TabsContent value="members">
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
                </TabsContent>
            </Tabs>
        </div>
    );
}
