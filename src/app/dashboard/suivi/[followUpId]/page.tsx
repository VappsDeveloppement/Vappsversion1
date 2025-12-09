
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useMemoFirebase, setDocumentNonBlocking, useUser, useCollection } from '@/firebase';
import { doc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Save, Download, Check, Phone, Mail, X, Scale, FileText, FileSignature, BookCopy, Bot, Pyramid, BrainCog, FileQuestion, Select as SelectIcon } from 'lucide-react';
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
import 'jspdf-autotable';
import { PdfPreviewModal, ResultDisplayBlock as FullResultDisplayBlock } from '@/components/shared/suivi-pdf-preview';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types pour le suivi simple (formulaire)
type FollowUp = {
    id: string;
    clientId: string;
    clientName: string;
    modelId: string;
    modelName: string;
    status: 'pending' | 'completed';
    answers?: { questionId: string; answer: any }[];
    counselorId: string;
    createdAt: string;
    pathEnrollmentId?: string; // Lien vers l'inscription au parcours
};

type QuestionBlock = 
    | { id: string; type: 'scale'; title?: string, questions: { id: string; text: string }[] } 
    | { id: string; type: 'aura' }
    | { id: string; type: 'vitae' }
    | { id: string; type: 'prisme' }
    | { id: string; type: 'scorm', title: string; questions: any[]; results: any[] }
    | { id: string; type: 'qcm', title: string; questions: any[]; }
    | { id: string; type: 'free-text', question: string; }
    | { id: string; type: 'report', title: string; };

type QuestionModel = {
    id: string;
    name: string;
    questions?: QuestionBlock[];
};

// Types pour le suivi de parcours
type PathEnrollment = {
    id: string;
    userId: string;
    clientName: string;
    pathId: string;
    pathName: string;
    status: 'pending' | 'completed';
    counselorId: string;
    enrolledAt: string;
};

type LearningPath = {
    id: string;
    title: string;
    steps: { modelId: string, modelName: string }[];
};


// Main Component
export default function FollowUpPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { followUpId } = params; 
    const { user } = useUser();
    const firestore = useFirestore();

    const isViewMode = searchParams.get('mode') === 'view';
    const counselorIdForFetch = searchParams.get('counselorId');

    const followUpRef = useMemoFirebase(() => {
        if (!counselorIdForFetch || !followUpId) return null;
        return doc(firestore, `users/${counselorIdForFetch}/follow_ups`, followUpId as string);
    }, [firestore, counselorIdForFetch, followUpId]);
    const { data: followUp, isLoading: isFollowUpLoading } = useDoc<FollowUp>(followUpRef);

    const pathEnrollmentRef = useMemoFirebase(() => {
         if (!counselorIdForFetch || !followUpId) return null;
        return doc(firestore, `users/${counselorIdForFetch}/path_enrollments`, followUpId as string);
    }, [firestore, counselorIdForFetch, followUpId]);
    const { data: pathEnrollment, isLoading: isPathEnrollmentLoading } = useDoc<PathEnrollment>(pathEnrollmentRef);

    const modelOwnerId = isViewMode ? (followUp?.counselorId || pathEnrollment?.counselorId) : user?.uid;

    const modelRef = useMemoFirebase(() => {
        if (!modelOwnerId || !followUp?.modelId) return null;
        return doc(firestore, `users/${modelOwnerId}/question_models`, followUp.modelId);
    }, [firestore, modelOwnerId, followUp]);
    const { data: model, isLoading: isModelLoading } = useDoc<QuestionModel>(modelRef);
    
    const learningPathRef = useMemoFirebase(() => {
        if (!modelOwnerId || !pathEnrollment?.pathId) return null;
        return doc(firestore, `users/${modelOwnerId}/learning_paths`, pathEnrollment.pathId);
    }, [firestore, modelOwnerId, pathEnrollment]);
    const { data: learningPath, isLoading: isPathLoading } = useDoc<LearningPath>(learningPathRef);

    const isLoading = isFollowUpLoading || isPathEnrollmentLoading || isModelLoading || isPathLoading;

    if (isLoading) {
        return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
    }

    if (pathEnrollment && learningPath) {
        return <LearningPathFollowUpView pathEnrollment={pathEnrollment} learningPath={learningPath} isViewMode={isViewMode} />;
    }

    if (followUp && model) {
        return <SingleFormFollowUpView followUp={followUp} model={model} isViewMode={isViewMode} />;
    }
    
    return (
        <div className="p-8 space-y-4">
            <Link href="/dashboard/suivi" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste des suivis
            </Link>
            <Card><CardContent className="p-8 text-center">Suivi ou modèle introuvable.</CardContent></Card>
        </div>
    );
}

// =====================================================================
// COMPONENT FOR LEARNING PATH FOLLOW-UP
// =====================================================================

function LearningPathFollowUpView({ pathEnrollment, learningPath, isViewMode }: { pathEnrollment: PathEnrollment, learningPath: LearningPath, isViewMode: boolean }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const counselorId = pathEnrollment.counselorId;
    
    const clientFollowUpsQuery = useMemoFirebase(() => {
        if (!counselorId) return null;
        return query(
            collection(firestore, `users/${counselorId}/follow_ups`),
            where('pathEnrollmentId', '==', pathEnrollment.id)
        );
    }, [counselorId, firestore, pathEnrollment.id]);
    
    const { data: clientFollowUps, isLoading: areFollowUpsLoading } = useCollection<FollowUp>(clientFollowUpsQuery);

    const handleOpenOrCreateFollowUp = async (step: { modelId: string, modelName: string }) => {
        if (!user || areFollowUpsLoading) return;
        const existingFollowUp = clientFollowUps?.find(f => f.modelId === step.modelId);
        
        const counselorIdToUse = isViewMode ? pathEnrollment.counselorId : user.uid;

        if (existingFollowUp) {
            router.push(`/dashboard/suivi/${existingFollowUp.id}?mode=${isViewMode ? 'view' : 'edit'}&counselorId=${counselorIdToUse}`);
        } else {
            if(isViewMode) return; // Members can't create new follow-ups
            const newFollowUpData: Omit<FollowUp, 'id'> = { counselorId: user.uid, clientId: pathEnrollment.userId, clientName: pathEnrollment.clientName, modelId: step.modelId, modelName: step.modelName, pathEnrollmentId: pathEnrollment.id, createdAt: new Date().toISOString(), status: 'pending' };
            const newDoc = await addDoc(collection(firestore, `users/${user.uid}/follow_ups`), newFollowUpData);
            router.push(`/dashboard/suivi/${newDoc.id}?counselorId=${user.uid}`);
        }
    };


    return (
        <div className="space-y-6">
             <Link href="/dashboard/suivi" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste des suivis
            </Link>
             <div>
                <h1 className="text-3xl font-bold font-headline">Parcours: {learningPath.title}</h1>
                <p className="text-muted-foreground">Pour {pathEnrollment.clientName}</p>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Étapes du Parcours</CardTitle>
                    <CardDescription>Voici les formulaires à compléter pour ce parcours.</CardDescription>
                </CardHeader>
                <CardContent>
                    {areFollowUpsLoading ? <Skeleton className="h-40 w-full" /> : (
                        <div className="space-y-4">
                            {learningPath.steps.map((step, index) => {
                                const followUpForStep = clientFollowUps?.find(f => f.modelId === step.modelId);
                                const isCompleted = followUpForStep?.status === 'completed';
                                
                                return (
                                    <div key={step.modelId} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex items-center justify-center h-8 w-8 rounded-full ${isCompleted ? 'bg-green-500 text-white' : 'bg-muted'}`}>
                                                {isCompleted ? <Check className="h-5 w-5" /> : <span className="font-bold">{index + 1}</span>}
                                            </div>
                                            <p className="font-medium">{step.modelName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" onClick={() => handleOpenOrCreateFollowUp(step)}>
                                                {isViewMode ? 'Voir' : (followUpForStep ? 'Continuer' : 'Démarrer')}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// =====================================================================
// COMPONENT FOR SINGLE FORM FOLLOW-UP
// =====================================================================

function SingleFormFollowUpView({ followUp, model, isViewMode }: { followUp: FollowUp, model: QuestionModel, isViewMode: boolean }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    
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

    const persistAnswers = async (currentAnswers: Record<string, any>) => {
        if (isViewMode || !user) return;
        const followUpRef = doc(firestore, `users/${user.uid}/follow_ups`, followUp.id);
        const answersToSave = Object.entries(currentAnswers).map(([questionId, answer]) => ({ questionId, answer }));
        const cleanedAnswers = cleanDataForFirestore(answersToSave);
        await setDocumentNonBlocking(followUpRef, { answers: cleanedAnswers }, { merge: true });
        toast({title: "Progression enregistrée"});
    };

    const handleSave = async () => {
        if (!user) return;
        const followUpRef = doc(firestore, `users/${user.uid}/follow_ups`, followUp.id);
        setIsSubmitting(true);
        const answersToSave = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
        const cleanedAnswers = cleanDataForFirestore(answersToSave);
        try {
            await setDocumentNonBlocking(followUpRef, { answers: cleanedAnswers, status: 'completed' }, { merge: true });
            toast({ title: 'Suivi terminé', description: 'Le suivi a été marqué comme complété.' });
            router.push('/dashboard/suivi');
        } catch (e) {
            toast({ title: 'Erreur', description: 'Impossible de sauvegarder le suivi.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Member View: Show only the results overview
    if (isViewMode) {
        return (
             <div className="space-y-6">
                <Link href="/dashboard/suivi" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Retour à la liste des suivis
                </Link>
                <div>
                    <h1 className="text-3xl font-bold font-headline">Résultats du Suivi: {followUp.modelName}</h1>
                    <p className="text-muted-foreground">Voici la synthèse de vos réponses.</p>
                </div>
                 <div className="space-y-8">
                    {model.questions?.map(questionBlock => {
                        const blockAnswer = answers[questionBlock.id];
                        return <FullResultDisplayBlock key={questionBlock.id} block={questionBlock} answer={blockAnswer} suivi={followUp} />;
                    })}
                </div>
                 <Button onClick={() => setIsPdfModalOpen(true)} variant="outline">Aperçu et Téléchargement PDF</Button>
                 <PdfPreviewModal
                    isOpen={isPdfModalOpen}
                    onOpenChange={setIsPdfModalOpen}
                    suivi={followUp}
                    model={model}
                    liveAnswers={answers}
                />
            </div>
        );
    }
    
    // Counselor View: Show the editable form
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Link href="/dashboard/suivi" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Retour à la liste des suivis
                </Link>
                 <Button onClick={() => setIsPdfModalOpen(true)} variant="outline">Aperçu des résultats</Button>
            </div>

            <div>
                <h1 className="text-3xl font-bold font-headline">Suivi: {followUp.modelName}</h1>
                <p className="text-muted-foreground">Pour {followUp.clientName}</p>
            </div>
            
            <div className="space-y-8">
                {model.questions?.map(questionBlock => {
                    const blockAnswer = answers[questionBlock.id];
                    
                    switch (questionBlock.type) {
                        case 'scale':
                            return (
                                <Card key={questionBlock.id}>
                                    <CardHeader><CardTitle>{questionBlock.title || "Questions sur une échelle"}</CardTitle></CardHeader>
                                    <CardContent className="space-y-6">
                                        {questionBlock.questions.map(question => (
                                            <div key={question.id} className="space-y-3">
                                                <Label>{question.text}</Label>
                                                <div className="flex items-center gap-4">
                                                    <Slider min={1} max={10} step={1} value={[(blockAnswer?.[question.id] || 5)]} onValueChange={(value) => handleAnswerChange(questionBlock.id, {...blockAnswer, [question.id]: value[0]})}/>
                                                    <div className="font-bold text-lg w-10 text-center">{blockAnswer?.[question.id] || ''}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        case 'aura':
                            return (
                                <Card key={questionBlock.id}>
                                    <CardHeader><CardTitle>Analyse AURA</CardTitle></CardHeader>
                                    <CardContent>
                                        <BlocQuestionModele savedAnalysis={blockAnswer} onSaveAnalysis={(result) => handleAnswerChange(questionBlock.id, result)} onSaveBlock={() => persistAnswers({ ...answers, [questionBlock.id]: answers[questionBlock.id] || {} })} followUpClientId={followUp.clientId} />
                                    </CardContent>
                                </Card>
                            );
                        case 'vitae':
                            return (
                                <Card key={questionBlock.id}>
                                    <CardHeader><CardTitle>Analyse de Parcours Professionnel (Vitae)</CardTitle></CardHeader>
                                    <CardContent>
                                        <VitaeAnalysisBlock savedAnalysis={blockAnswer} onSaveAnalysis={(result) => handleAnswerChange(questionBlock.id, result)} onSaveBlock={() => persistAnswers({ ...answers, [questionBlock.id]: answers[questionBlock.id] })} clientId={followUp.clientId} />
                                    </CardContent>
                                </Card>
                            );
                        case 'prisme':
                            return (
                                <Card key={questionBlock.id}>
                                    <CardHeader><CardTitle>Tirage Prisme</CardTitle></CardHeader>
                                    <CardContent>
                                        <PrismeAnalysisBlock savedAnalysis={blockAnswer} onSaveAnalysis={(result) => handleAnswerChange(questionBlock.id, result)} onSaveBlock={() => persistAnswers({ ...answers, [questionBlock.id]: answers[questionBlock.id] })} />
                                    </CardContent>
                                </Card>
                            );
                        case 'scorm':
                            return (
                                <Card key={questionBlock.id}>
                                    <CardHeader><CardTitle>{questionBlock.title}</CardTitle><CardDescription>Répondez aux questions suivantes.</CardDescription></CardHeader>
                                    <CardContent className="space-y-8">
                                        {(questionBlock.questions || []).map((question: any) => (
                                            <div key={question.id}>
                                                <Label className="font-semibold">{question.text}</Label>
                                                <RadioGroup value={blockAnswer?.[question.id]} onValueChange={(value) => handleAnswerChange(questionBlock.id, {...blockAnswer, [question.id]: value})} className="mt-2 space-y-2">
                                                    {question.answers.map((answer: any) => (
                                                        <div key={answer.id} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={answer.id} id={`${question.id}-${answer.id}`} />
                                                            <Label htmlFor={`${question.id}-${answer.id}`} className="font-normal">{answer.text}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        case 'qcm':
                            const qcmAnswers = blockAnswer || {};
                            return (
                                <Card key={questionBlock.id}>
                                    <CardHeader><CardTitle>{questionBlock.title}</CardTitle></CardHeader>
                                    <CardContent className="space-y-8">
                                        {(questionBlock.questions || []).map((question: any) => {
                                            const selectedAnswerId = qcmAnswers[question.id];
                                            const selectedAnswer = question.answers.find((a:any) => a.id === selectedAnswerId);
                                            return (
                                                <div key={question.id}>
                                                    <Label className="font-semibold">{question.text}</Label>
                                                    {question.imageUrl && ( <div className="my-4 relative w-full max-w-sm h-64"><Image src={question.imageUrl} alt={question.text} fill className="object-contain rounded-md border" /></div> )}
                                                    <RadioGroup value={selectedAnswerId} onValueChange={(value) => handleAnswerChange(questionBlock.id, {...qcmAnswers, [question.id]: value})} className="mt-2 space-y-2">
                                                        {question.answers.map((answer: any) => (
                                                            <div key={answer.id} className="flex items-center space-x-2"><RadioGroupItem value={answer.id} id={`${question.id}-${answer.id}`} /><Label htmlFor={`${question.id}-${answer.id}`} className="font-normal">{answer.text}</Label></div>
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
                        case 'free-text':
                            return (
                                <Card key={questionBlock.id}>
                                    <CardHeader><CardTitle>{questionBlock.question}</CardTitle></CardHeader>
                                    <CardContent><Textarea value={blockAnswer || ''} onChange={(e) => handleAnswerChange(questionBlock.id, e.target.value)} rows={8} placeholder="Votre réponse ici..."/></CardContent>
                                </Card>
                            );
                        case 'report':
                            return (<ReportBlock key={questionBlock.id} questionBlock={questionBlock} initialAnswer={blockAnswer} onAnswerChange={(value: any) => handleAnswerChange(questionBlock.id, value)} onSaveBlock={async () => await persistAnswers({ ...answers, [questionBlock.id]: answers[questionBlock.id] })} readOnly={isViewMode} />);
                        default: return null;
                    }
                })}
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer et Terminer le Suivi
                </Button>
            </div>
            
            <PdfPreviewModal
                isOpen={isPdfModalOpen}
                onOpenChange={setIsPdfModalOpen}
                suivi={followUp}
                model={model}
                liveAnswers={answers}
            />
        </div>
    );
}
    
// Helper functions and sub-components
const cleanDataForFirestore = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => cleanDataForFirestore(item));
    }
    if (data !== null && typeof data === 'object') {
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            const value = data[key];
            if (value !== undefined) {
                const cleanedValue = cleanDataForFirestore(value);
                if (cleanedValue !== undefined) {
                    newData[key] = cleanedValue;
                }
            }
        }
        return newData;
    }
    return data;
};

type Partner = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialties: string[];
};

function ReportBlock({ questionBlock, initialAnswer, onAnswerChange, onSaveBlock, readOnly }: any) {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const [reportText, setReportText] = useState(initialAnswer?.text || '');
    const [selectedPartners, setSelectedPartners] = useState<any[]>(initialAnswer?.partners || []);
    
    useEffect(() => {
        setReportText(initialAnswer?.text || '');
        setSelectedPartners(initialAnswer?.partners || []);
    }, [initialAnswer]);

    const [specialtyFilter, setSpecialtyFilter] = useState('all');
    const [sectorFilter, setSectorFilter] = useState('all');
    
    const partnersQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/partners`));
    }, [user, firestore]);
    const { data: allPartners, isLoading } = useCollection<Partner>(partnersQuery);

    const allSpecialties = useMemo(() => {
        if (!allPartners) return [];
        const specialties = new Set<string>();
        allPartners.forEach(p => p.specialties?.forEach(s => specialties.add(s)));
        return Array.from(specialties).sort();
    }, [allPartners]);

    const allSectors = useMemo(() => {
        if (!allPartners) return [];
        const sectors = new Set<string>();
        (allPartners as any[]).forEach(p => p.sectors?.forEach((s:string) => sectors.add(s)));
        return Array.from(sectors).sort();
    }, [allPartners]);
    
    const filteredPartners = useMemo(() => {
        if (!allPartners) return [];
        return allPartners.filter(partner => {
            const specialtyMatch = specialtyFilter === 'all' || partner.specialties?.includes(specialtyFilter);
            const sectorMatch = sectorFilter === 'all' || (partner as any).sectors?.includes(sectorFilter);
            return specialtyMatch && sectorMatch;
        });
    }, [allPartners, specialtyFilter, sectorFilter]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (readOnly) return;
        setReportText(e.target.value);
        onAnswerChange({ text: e.target.value, partners: selectedPartners });
    };
    
    const handlePartnerSelect = (partner: Partner) => {
        if (readOnly) return;
        const isSelected = selectedPartners.some(p => p.id === partner.id);
        if (isSelected) return; // Prevent duplicates

        const newSelection = [...selectedPartners, partner];
        setSelectedPartners(newSelection);
        onAnswerChange({ text: reportText, partners: newSelection });
    };

    const removePartner = (partnerId: string) => {
        if (readOnly) return;
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
                        placeholder={readOnly ? "Aucun compte rendu rédigé." : "Rédigez votre compte rendu ici..."}
                        disabled={readOnly}
                    />
                </div>
                 <div className="space-y-4">
                    <Label>Associer des partenaires</Label>
                    {!readOnly && (
                        <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                                <SelectTrigger><SelectValue placeholder="Filtrer par spécialité" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Toutes les spécialités</SelectItem>
                                    {allSpecialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={sectorFilter} onValueChange={setSectorFilter}>
                                <SelectTrigger><SelectValue placeholder="Filtrer par secteur" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les secteurs</SelectItem>
                                    {allSectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {isLoading ? <Skeleton className="h-40 w-full" /> : (
                            <Card className="max-h-60 overflow-y-auto">
                                <CardContent className="p-2 space-y-2">
                                    {filteredPartners.length > 0 ? (
                                        filteredPartners.map(partner => (
                                            <div key={partner.id} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded-md">
                                                <div>
                                                    <p className="font-semibold">{partner.name}</p>
                                                    <div className="text-xs text-muted-foreground space-y-1">
                                                        {partner.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3"/>{partner.email}</div>}
                                                        {partner.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3"/>{partner.phone}</div>}
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => handlePartnerSelect(partner)}>Ajouter</Button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-sm text-muted-foreground p-4">Aucun partenaire ne correspond à la recherche.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                        </>
                    )}

                    {selectedPartners.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium">Partenaires attachés :</h4>
                             <div className="space-y-2">
                                {selectedPartners.map(partner => (
                                    <div key={partner.id} className="flex justify-between items-start p-3 border rounded-lg bg-secondary/50">
                                         <div>
                                            <p className="font-semibold">{partner.name}</p>
                                            <div className="text-muted-foreground text-xs mt-1 space-y-0.5">
                                                {partner.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3"/>{partner.email}</div>}
                                                {partner.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3"/>{partner.phone}</div>}
                                                {partner.specialties && partner.specialties.length > 0 && <p><strong>Spéc:</strong> {partner.specialties.join(', ')}</p>}
                                            </div>
                                        </div>
                                        {!readOnly && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePartner(partner.id)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                 {!readOnly && (
                    <div className="flex justify-end">
                        <Button onClick={onSaveBlock}><Save className="mr-2 h-4 w-4" /> Enregistrer le compte rendu</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    