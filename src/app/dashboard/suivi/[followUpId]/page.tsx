
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useMemoFirebase, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BlocQuestionModele } from '@/components/shared/bloc-question-modele';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


type FollowUp = {
    id: string;
    clientId: string;
    clientName: string;
    modelId: string;
    modelName: string;
    status: 'pending' | 'completed';
    answers?: { questionId: string; answer: any }[];
};

type ScormAnswer = { id: string; text: string; value: string; };
type ScormQuestion = { id: string; text: string; answers: ScormAnswer[]; };
type ScormResult = { id: string; value: string; text: string; };

type QuestionBlock = 
    | { id: string; type: 'scale'; title?: string, questions: { id: string; text: string }[] } 
    | { id: string; type: 'aura' }
    | { id: string; type: 'scorm', title: string; questions: ScormQuestion[]; results: ScormResult[] };

type QuestionModel = {
    id: string;
    name: string;
    questions?: QuestionBlock[];
};

export default function FollowUpPage() {
    const params = useParams();
    const { followUpId } = params;
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const followUpRef = useMemoFirebase(() => {
        if (!user || !followUpId) return null;
        return doc(firestore, `users/${user.uid}/follow_ups`, followUpId as string);
    }, [user, firestore, followUpId]);
    const { data: followUp, isLoading: isFollowUpLoading } = useDoc<FollowUp>(followUpRef);

    const modelRef = useMemoFirebase(() => {
        if (!user || !followUp?.modelId) return null;
        return doc(firestore, `users/${user.uid}/question_models`, followUp.modelId);
    }, [user, firestore, followUp]);
    const { data: model, isLoading: isModelLoading } = useDoc<QuestionModel>(modelRef);

    useEffect(() => {
        if (followUp?.answers) {
            const initialAnswers = followUp.answers.reduce((acc, current) => {
                acc[current.questionId] = current.answer;
                return acc;
            }, {} as Record<string, any>);
            setAnswers(initialAnswers);
        }
    }, [followUp]);

    const handleAnswerChange = (questionId: string, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSave = async () => {
        if (!followUpRef || !followUp) return;
        setIsSubmitting(true);
        
        const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer
        }));

        try {
            await setDocumentNonBlocking(followUpRef, { answers: answersArray, status: 'completed' }, { merge: true });
            toast({ title: "Suivi enregistré", description: "Vos réponses ont été sauvegardées." });
            router.push('/dashboard/suivi');
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de sauvegarder le suivi.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const calculateScormResult = (scormBlock: Extract<QuestionBlock, { type: 'scorm' }>) => {
        if (!scormBlock.questions || scormBlock.questions.length === 0) return null;

        const totalValue = scormBlock.questions.reduce((sum, question) => {
            const answerId = answers[question.id];
            if (!answerId) return sum;
            const answer = question.answers.find(a => a.id === answerId);
            return sum + (answer ? parseInt(answer.value, 10) : 0);
        }, 0);

        // Simple result logic: find the result whose value is the closest floor.
        // This can be adapted for more complex range-based logic.
        const result = scormBlock.results
            .filter(r => parseInt(r.value, 10) <= totalValue)
            .sort((a, b) => parseInt(b.value, 10) - parseInt(a.value, 10))[0];

        return result;
    };


    const isLoading = isFollowUpLoading || isModelLoading;

    if (isLoading) {
        return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>
    }

    if (!followUp || !model) {
        return (
             <div className="p-8 space-y-4">
                <Link href="/dashboard/suivi" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Retour à la liste des suivis
                </Link>
                <Card><CardContent className="p-8 text-center">Suivi ou modèle introuvable.</CardContent></Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Link href="/dashboard/suivi" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste des suivis
            </Link>

            <div>
                <h1 className="text-3xl font-bold font-headline">Suivi: {followUp.modelName}</h1>
                <p className="text-muted-foreground">Pour {followUp.clientName}</p>
            </div>
            
            <div className="space-y-8">
                {model.questions?.map(questionBlock => {
                    if (questionBlock.type === 'scale') {
                        return (
                             <Card key={questionBlock.id}>
                                <CardHeader>
                                    <CardTitle>{questionBlock.title || "Questions sur une échelle"}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {questionBlock.questions.map(question => (
                                         <div key={question.id} className="space-y-3">
                                            <Label>{question.text}</Label>
                                            <div className="flex items-center gap-4">
                                                <Slider
                                                    min={1}
                                                    max={10}
                                                    step={1}
                                                    value={[answers[question.id] || 5]}
                                                    onValueChange={(value) => handleAnswerChange(question.id, value[0])}
                                                />
                                                <div className="font-bold text-lg w-10 text-center">{answers[question.id] || '5'}</div>
                                            </div>
                                         </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )
                    }
                    if (questionBlock.type === 'aura') {
                        return (
                             <Card key={questionBlock.id}>
                                <CardHeader>
                                    <CardTitle>Analyse AURA</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <BlocQuestionModele />
                                </CardContent>
                            </Card>
                        )
                    }
                     if (questionBlock.type === 'scorm') {
                        const result = calculateScormResult(questionBlock);
                        return (
                            <Card key={questionBlock.id}>
                                <CardHeader>
                                    <CardTitle>{questionBlock.title}</CardTitle>
                                    <CardDescription>Répondez aux questions suivantes.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    {(questionBlock.questions || []).map(question => (
                                        <div key={question.id}>
                                            <Label className="font-semibold">{question.text}</Label>
                                            <RadioGroup
                                                value={answers[question.id]}
                                                onValueChange={(value) => handleAnswerChange(question.id, value)}
                                                className="mt-2 space-y-2"
                                            >
                                                {question.answers.map(answer => (
                                                    <div key={answer.id} className="flex items-center space-x-2">
                                                        <RadioGroupItem value={answer.id} id={`${question.id}-${answer.id}`} />
                                                        <Label htmlFor={`${question.id}-${answer.id}`} className="font-normal">{answer.text}</Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    ))}
                                    {result && (
                                        <div className="pt-6 mt-6 border-t">
                                            <h4 className="font-semibold text-lg mb-2">Résultat</h4>
                                            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: result.text }} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    }
                    return null;
                })}
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer et Terminer le Suivi
                </Button>
            </div>

        </div>
    );
}
