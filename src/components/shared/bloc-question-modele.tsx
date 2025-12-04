
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, List, TextCursorInput } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';


const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Le texte de la question est requis.'),
  type: z.enum(['text', 'textarea', 'radio', 'checkbox', 'select']),
  options: z.array(z.string()).optional(),
});

const questionModelSchema = z.object({
  name: z.string().min(1, 'Le nom du modèle est requis.'),
  questions: z.array(questionSchema).min(1, 'Un modèle doit contenir au moins une question.'),
});

type QuestionModelFormData = z.infer<typeof questionModelSchema>;

type QuestionModel = {
  id: string;
  counselorId: string;
  name: string;
  questions: z.infer<typeof questionSchema>[];
};


export function BlocQuestionModele() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<QuestionModel | null>(null);
    const [modelToDelete, setModelToDelete] = useState<QuestionModel | null>(null);

    const modelsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/question_models`));
    }, [user, firestore]);
    const { data: models, isLoading } = useCollection<QuestionModel>(modelsQuery);

    const form = useForm<QuestionModelFormData>({
        resolver: zodResolver(questionModelSchema),
    });

    const { fields: questionFields, append: appendQuestion, remove: removeQuestion, update: updateQuestion } = useFieldArray({
        control: form.control,
        name: "questions",
    });

    useEffect(() => {
        if (isSheetOpen) {
            if (editingModel) {
                form.reset(editingModel);
            } else {
                form.reset({
                    name: '',
                    questions: [{ id: `q-${Date.now()}`, text: '', type: 'text', options: [] }],
                });
            }
        }
    }, [isSheetOpen, editingModel, form]);

    const handleNew = () => {
        setEditingModel(null);
        setIsSheetOpen(true);
    };

    const handleEdit = (model: QuestionModel) => {
        setEditingModel(model);
        setIsSheetOpen(true);
    };

    const handleDelete = () => {
        if (!modelToDelete || !user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/question_models`, modelToDelete.id));
        toast({ title: "Modèle supprimé" });
        setModelToDelete(null);
    };

    const onSubmit = async (data: QuestionModelFormData) => {
        if (!user) return;

        const modelData = {
            counselorId: user.uid,
            name: data.name,
            questions: data.questions,
        };

        if (editingModel) {
            await setDocumentNonBlocking(doc(firestore, `users/${user.uid}/question_models`, editingModel.id), modelData, { merge: true });
            toast({ title: 'Modèle mis à jour' });
        } else {
            await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/question_models`), modelData);
            toast({ title: 'Modèle créé' });
        }
        setIsSheetOpen(false);
    };
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Bloc : Modèles de Questions</CardTitle>
                        <CardDescription>Créez des questionnaires réutilisables pour vos différents formulaires.</CardDescription>
                    </div>
                    <Button onClick={handleNew}><PlusCircle className="mr-2 h-4 w-4"/>Nouveau Modèle</Button>
                </div>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom du Modèle</TableHead>
                            <TableHead>Nombre de questions</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-10"/></TableCell></TableRow>
                        : models && models.length > 0 ? (
                            models.map(model => (
                                <TableRow key={model.id}>
                                    <TableCell className="font-medium">{model.name}</TableCell>
                                    <TableCell>{model.questions.length}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(model)}><Edit className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setModelToDelete(model)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={3} className="text-center h-24">Aucun modèle créé.</TableCell></TableRow>
                        )}
                    </TableBody>
                 </Table>
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-2xl w-full">
                        <SheetHeader>
                            <SheetTitle>{editingModel ? 'Modifier le' : 'Nouveau'} modèle de questions</SheetTitle>
                        </SheetHeader>
                         <Form {...form}>
                             <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                                 <ScrollArea className="flex-1 pr-4 -mr-4">
                                    <div className="py-4 space-y-6">
                                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom du modèle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div>
                                            <h3 className="text-lg font-medium">Questions</h3>
                                            <div className="space-y-4 mt-2">
                                                {questionFields.map((field, index) => {
                                                    const questionType = form.watch(`questions.${index}.type`);
                                                    return (
                                                         <Card key={field.id} className="p-4 bg-muted/50">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h4 className="font-semibold">Question {index + 1}</h4>
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <FormField control={form.control} name={`questions.${index}.text`} render={({ field }) => (<FormItem><FormLabel>Texte de la question</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`questions.${index}.type`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Type de réponse</FormLabel>
                                                                            <FormControl>
                                                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="text"/></FormControl><FormLabel>Texte court</FormLabel></FormItem>
                                                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="textarea"/></FormControl><FormLabel>Texte long</FormLabel></FormItem>
                                                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="radio"/></FormControl><FormLabel>Choix unique</FormLabel></FormItem>
                                                                                </RadioGroup>
                                                                            </FormControl>
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                 {['radio', 'checkbox', 'select'].includes(questionType) && (
                                                                    <FormField
                                                                        control={form.control}
                                                                        name={`questions.${index}.options`}
                                                                        render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel>Options (une par ligne)</FormLabel>
                                                                                <FormControl>
                                                                                    <Textarea
                                                                                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                                                                                        value={field.value?.join('\n') || ''}
                                                                                        onChange={(e) => field.onChange(e.target.value.split('\n'))}
                                                                                    />
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                )}
                                                            </div>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendQuestion({ id: `q-${Date.now()}`, text: '', type: 'text', options: [] })}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une question
                                            </Button>
                                        </div>
                                    </div>
                                 </ScrollArea>
                                 <SheetFooter className="pt-4 border-t mt-auto">
                                    <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                    <Button type="submit">Sauvegarder le modèle</Button>
                                </SheetFooter>
                             </form>
                         </Form>
                    </SheetContent>
                 </Sheet>
                 <AlertDialog open={!!modelToDelete} onOpenChange={open => !open && setModelToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
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
