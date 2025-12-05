
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useMemoFirebase, setDocumentNonBlocking, useUser, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { VitaeAnalysisBlock } from '@/components/shared/vitae-analysis-block';
import { BlocQuestionModele } from '@/components/shared/bloc-question-modele';
import { PrismeAnalysisBlock } from '@/components/shared/prisme-analysis-block';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';


type FollowUp = {
    id: string;
    clientId: string;
    clientName: string;
    modelId: string;
    modelName: string;
    status: 'pending' | 'completed';
    answers?: { questionId: string; answer: any }[];
};

type Partner = {
    id: string;
    name: string;
    specialties: string[];
    sectors: string[];
};

type ScormAnswer = { id: string; text: string; value: string; };
type ScormQuestion = { id: string; text: string; answers: ScormAnswer[]; };
type ScormResult = { id: string; value: string; text: string; };

type QcmAnswer = { id: string; text: string; resultText?: string; };
type QcmQuestion = { id: string; text: string; answers: QcmAnswer[]; };

type QuestionBlock = 
    | { id: string; type: 'scale'; title?: string, questions: { id: string; text: string }[] } 
    | { id: string; type: 'aura' }
    | { id: string; type: 'vitae' }
    | { id: string; type: 'prisme' }
    | { id: string; type: 'scorm', title: string; questions: ScormQuestion[]; results: ScormResult[] }
    | { id: string; type: 'qcm', title: string; questions: QcmQuestion[]; }
    | { id: string; type: 'free-text', question: string; }
    | { id: string; type: 'report', title: string; };

type QuestionModel = {
    id: string;
    name: string;
    questions?: QuestionBlock[];
};

const cleanDataForFirestore = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => cleanDataForFirestore(item));
    }
    if (data !== null && typeof data === 'object') {
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            if (data[key] !== undefined) {
                newData[key] = cleanDataForFirestore(data[key]);
            }
        }
        return newData;
    }
    return data;
};

function ReportBlock({ questionBlock, initialAnswer, onAnswerChange, onSaveBlock }: any) {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const [reportText, setReportText] = useState(initialAnswer?.text || '');
    const [selectedPartners, setSelectedPartners] = useState<any[]>(initialAnswer?.partners || []);
    const [specialtySearch, setSpecialtySearch] = useState('');
    const [sectorSearch, setSectorSearch] = useState('');
    
    const partnersQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/partners`));
    }, [user, firestore]);
    const { data: allPartners, isLoading } = useCollection<Partner>(partnersQuery);
    
    const filteredPartners = useMemo(() => {
        if (!allPartners) return [];
        return allPartners.filter(partner => {
            const specialtyMatch = specialtySearch 
                ? partner.specialties?.some(s => s.toLowerCase().includes(specialtySearch.toLowerCase())) 
                : true;
            const sectorMatch = sectorSearch 
                ? partner.sectors?.some(s => s.toLowerCase().includes(sectorSearch.toLowerCase())) 
                : true;
            return specialtyMatch && sectorMatch;
        });
    }, [allPartners, specialtySearch, sectorSearch]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setReportText(e.target.value);
        onAnswerChange({ text: e.target.value, partners: selectedPartners });
    };
    
    const handlePartnerSelect = (partner: Partner) => {
        const isSelected = selectedPartners.some(p => p.id === partner.id);
        if (isSelected) return; // Prevent duplicates

        const newSelection = [...selectedPartners, partner];
        setSelectedPartners(newSelection);
        onAnswerChange({ text: reportText, partners: newSelection });
    };

    const removePartner = (partnerId: string) => {
        const newSelection = selectedPartners.filter(p => p.id !== partnerId);
        setSelectedPartners(newSelection);
        onAnswerChange({ text: reportText, partners: newSelection });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{questionBlock.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Compte Rendu</Label>
                    <Textarea
                        value={reportText}
                        onChange={handleTextChange}
                        rows={10}
                        placeholder="Rédigez votre compte rendu ici..."
                    />
                </div>
                 <div className="space-y-4">
                    <Label>Associer des partenaires</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            placeholder="Rechercher par spécialité..."
                            value={specialtySearch}
                            onChange={(e) => setSpecialtySearch(e.target.value)}
                        />
                         <Input 
                            placeholder="Rechercher par secteur..."
                            value={sectorSearch}
                            onChange={(e) => setSectorSearch(e.target.value)}
                        />
                    </div>
                    {isLoading ? <Skeleton className="h-20 w-full" /> : (
                        <Card className="max-h-48 overflow-y-auto">
                            <CardContent className="p-2">
                                {filteredPartners.length > 0 ? (
                                    filteredPartners.map(partner => (
                                        <div key={partner.id} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded-md">
                                            <span>{partner.name}</span>
                                            <Button size="sm" variant="outline" onClick={() => handlePartnerSelect(partner)}>Ajouter</Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-sm text-muted-foreground p-4">Aucun partenaire ne correspond à la recherche.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {selectedPartners.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium mb-2">Partenaires attachés :</h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedPartners.map(partner => (
                                    <Badge key={partner.id} variant="secondary">
                                        {partner.name}
                                        <button onClick={() => removePartner(partner.id)} className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                 <div className="flex justify-end">
                    <Button onClick={onSaveBlock}><Save className="mr-2 h-4 w-4" /> Enregistrer le compte rendu</Button>
                </div>
            </CardContent>
        </Card>
    );
}

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
    
    const persistAnswers = async (updatedAnswers: Record<string, any>) => {
        if (!followUpRef) return;
        
        const cleanedAnswers = cleanDataForFirestore(updatedAnswers);
        
        const answersArray = Object.entries(cleanedAnswers).map(([questionId, answer]) => ({
            questionId,
            answer
        }));
        await setDocumentNonBlocking(followUpRef, { answers: answersArray }, { merge: true });
    };

    const handleSave = async () => {
        if (!followUpRef || !followUp) return;
        setIsSubmitting(true);
        
        const cleanedAnswers = cleanDataForFirestore(answers);
        
        const answersArray = Object.entries(cleanedAnswers).map(([questionId, answer]) => ({
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
                    if (questionBlock.type === 'vitae') {
                         return (
                            <Card key={questionBlock.id}>
                                <CardHeader>
                                    <CardTitle>Analyse de Parcours Professionnel (Vitae)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <VitaeAnalysisBlock 
                                        savedAnalysis={answers[questionBlock.id]} 
                                        onSaveAnalysis={(result) => handleAnswerChange(questionBlock.id, result)}
                                        onSaveBlock={async () => {
                                            const newAnswers = { ...answers, [questionBlock.id]: answers[questionBlock.id] };
                                            await persistAnswers(newAnswers);
                                        }}
                                        clientId={followUp.clientId}
                                    />
                                </CardContent>
                            </Card>
                        )
                    }
                     if (questionBlock.type === 'prisme') {
                        return (
                            <Card key={questionBlock.id}>
                                <CardHeader>
                                    <CardTitle>Tirage Prisme</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <PrismeAnalysisBlock 
                                        savedAnalysis={answers[questionBlock.id]} 
                                        onSaveAnalysis={(result) => handleAnswerChange(questionBlock.id, result)}
                                        onSaveBlock={async () => {
                                            const newAnswers = { ...answers, [questionBlock.id]: answers[questionBlock.id] };
                                            await persistAnswers(newAnswers);
                                        }}
                                    />
                                </CardContent>
                            </Card>
                        );
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
                     if (questionBlock.type === 'qcm') {
                        return (
                            <Card key={questionBlock.id}>
                                <CardHeader>
                                    <CardTitle>{questionBlock.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    {(questionBlock.questions || []).map(question => {
                                        const selectedAnswerId = answers[question.id];
                                        const selectedAnswer = question.answers.find(a => a.id === selectedAnswerId);
                                        return (
                                            <div key={question.id}>
                                                <Label className="font-semibold">{question.text}</Label>
                                                <RadioGroup
                                                    value={selectedAnswerId}
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
                                                {selectedAnswer && selectedAnswer.resultText && (
                                                    <div className="mt-4 p-4 bg-muted rounded-md border">
                                                        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedAnswer.resultText }} />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        )
                    }
                     if (questionBlock.type === 'free-text') {
                        return (
                             <Card key={questionBlock.id}>
                                <CardHeader>
                                    <CardTitle>{questionBlock.question}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                     <Textarea
                                        value={answers[questionBlock.id] || ''}
                                        onChange={(e) => handleAnswerChange(questionBlock.id, e.target.value)}
                                        rows={8}
                                        placeholder="Votre réponse ici..."
                                    />
                                </CardContent>
                            </Card>
                        );
                    }
                    if (questionBlock.type === 'report') {
                        return (
                            <ReportBlock
                                key={questionBlock.id}
                                questionBlock={questionBlock}
                                initialAnswer={answers[questionBlock.id]}
                                onAnswerChange={(value: any) => handleAnswerChange(questionBlock.id, value)}
                                onSaveBlock={async () => {
                                    const newAnswers = { ...answers, [questionBlock.id]: answers[questionBlock.id] };
                                    await persistAnswers(newAnswers);
                                    toast({ title: "Compte rendu enregistré" });
                                }}
                            />
                        );
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
