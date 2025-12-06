
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type PublicForm = {
    id: string;
    counselorId: string;
    name: string;
    description: string;
    modelId: string;
    modelName: string;
    isEnabled: boolean;
    createdAt: string;
    questions?: any[];
};

type SubmissionFormData = {
    respondent: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
    },
    answers: Record<string, any>;
};

const respondentSchema = z.object({
    firstName: z.string().min(1, 'Le prénom est requis.'),
    lastName: z.string().min(1, 'Le nom est requis.'),
    email: z.string().email('Adresse email invalide.'),
    phone: z.string().optional(),
});

const submissionSchema = z.object({
    respondent: respondentSchema,
    answers: z.record(z.any()),
});

export default function PublicFormPage() {
    const params = useParams();
    const { formId } = params;
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionComplete, setSubmissionComplete] = useState(false);
    
    const formRef = useMemoFirebase(() => {
        if (!formId) return null;
        return doc(firestore, 'public_forms', formId as string);
    }, [firestore, formId]);

    const { data: formDoc, isLoading } = useDoc<PublicForm>(formRef);

    const form = useForm<SubmissionFormData>({
        resolver: zodResolver(submissionSchema),
        defaultValues: {
            respondent: { firstName: '', lastName: '', email: '', phone: '' },
            answers: {},
        },
    });

    const onSubmit = async (data: SubmissionFormData) => {
        if (!formDoc) return;
        setIsSubmitting(true);
        try {
            await addDocumentNonBlocking(collection(firestore, `public_forms/${formDoc.id}/submissions`), {
                formId: formDoc.id,
                counselorId: formDoc.counselorId,
                respondent: data.respondent,
                answers: Object.entries(data.answers).map(([questionId, answer]) => ({ questionId, answer })),
                submittedAt: new Date().toISOString(),
            });
            setSubmissionComplete(true);
        } catch (error) {
            toast({ title: 'Erreur', description: "Impossible de soumettre le formulaire.", variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleAnswerChange = (questionId: string, answer: any) => {
        const currentAnswers = form.getValues('answers');
        form.setValue('answers', { ...currentAnswers, [questionId]: answer });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/30">
                <Card className="w-full max-w-2xl"><CardContent className="p-8"><Skeleton className="h-96 w-full" /></CardContent></Card>
            </div>
        );
    }
    
    if (!formDoc || !formDoc.isEnabled) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/30">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader><CardTitle>Formulaire non disponible</CardTitle></CardHeader>
                    <CardContent><p>Ce formulaire n'est pas disponible ou le lien est incorrect.</p></CardContent>
                </Card>
            </div>
        );
    }

    if(submissionComplete) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-muted/30">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader><CardTitle>Merci !</CardTitle></CardHeader>
                    <CardContent><p>Vos réponses ont été enregistrées avec succès.</p></CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30 py-12 px-4">
            <Card className="w-full max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-3xl">{formDoc.name}</CardTitle>
                    {formDoc.description && <CardDescription>{formDoc.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <div className="p-6 border rounded-lg bg-background">
                                <h3 className="text-lg font-semibold mb-4">Vos informations</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="respondent.firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="respondent.lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="respondent.email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="respondent.phone" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                </div>
                             </div>

                             {(formDoc.questions || []).map((questionBlock, index) => {
                                 const currentAnswers = form.watch('answers');
                                 const blockAnswer = currentAnswers[questionBlock.id];

                                return (
                                     <Card key={questionBlock.id}>
                                         <CardHeader><CardTitle>{questionBlock.title || questionBlock.question || `Question ${index + 1}`}</CardTitle></CardHeader>
                                         <CardContent>
                                             {questionBlock.type === 'scale' && (
                                                <div className="space-y-6">
                                                    {questionBlock.questions.map((q: any) => (
                                                         <div key={q.id}>
                                                            <Label>{q.text}</Label>
                                                             <div className="flex items-center gap-4 mt-2">
                                                                <Slider min={1} max={10} step={1} defaultValue={[5]} onValueChange={(value) => handleAnswerChange(questionBlock.id, {...blockAnswer, [q.id]: value[0]})}/>
                                                                <div className="font-bold text-lg w-10 text-center">{blockAnswer?.[q.id] || ''}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                             )}
                                             {questionBlock.type === 'free-text' && (
                                                <Textarea onChange={(e) => handleAnswerChange(questionBlock.id, e.target.value)} rows={5} />
                                             )}
                                              {questionBlock.type === 'qcm' && (
                                                <div className="space-y-4">
                                                    {questionBlock.questions.map((q: any) => (
                                                        <div key={q.id}>
                                                            <Label className="font-semibold">{q.text}</Label>
                                                             {q.imageUrl && <div className="my-2 relative w-full h-48"><Image src={q.imageUrl} alt={q.text} fill className="object-contain" /></div>}
                                                             <Controller
                                                                name={`answers.${questionBlock.id}.${q.id}`}
                                                                control={form.control}
                                                                render={({ field }) => (
                                                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="mt-2 space-y-2">
                                                                        {q.answers.map((ans: any) => (
                                                                            <FormItem key={ans.id} className="flex items-center space-x-3 space-y-0">
                                                                                <FormControl><RadioGroupItem value={ans.id} /></FormControl>
                                                                                <FormLabel className="font-normal">{ans.text}</FormLabel>
                                                                            </FormItem>
                                                                        ))}
                                                                    </RadioGroup>
                                                                )}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                             {questionBlock.type === 'scorm' && (
                                                <div className="space-y-4">
                                                     {questionBlock.questions.map((q: any) => (
                                                        <div key={q.id}>
                                                            <Label className="font-semibold">{q.text}</Label>
                                                            {q.imageUrl && <div className="my-2 relative w-full h-48"><Image src={q.imageUrl} alt={q.text} fill className="object-contain" /></div>}
                                                            <Controller
                                                                name={`answers.${questionBlock.id}.${q.id}`}
                                                                control={form.control}
                                                                render={({ field }) => (
                                                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="mt-2 space-y-2">
                                                                        {q.answers.map((ans: any) => (
                                                                            <FormItem key={ans.id} className="flex items-center space-x-3 space-y-0">
                                                                                <FormControl><RadioGroupItem value={ans.id} /></FormControl>
                                                                                <FormLabel className="font-normal">{ans.text}</FormLabel>
                                                                            </FormItem>
                                                                        ))}
                                                                    </RadioGroup>
                                                                )}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                         </CardContent>
                                     </Card>
                                )
                             })}

                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Soumettre
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

