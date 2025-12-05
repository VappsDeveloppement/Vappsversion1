

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useMemoFirebase, setDocumentNonBlocking, useUser, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Save, Search, Download, Image as ImageIcon } from 'lucide-react';
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
import { X, Mail, Phone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';


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
    email?: string;
    phone?: string;
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

function ReportBlock({ questionBlock, initialAnswer, onAnswerChange, onSaveBlock }: any) {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const [reportText, setReportText] = useState(initialAnswer?.text || '');
    const [selectedPartners, setSelectedPartners] = useState<any[]>(initialAnswer?.partners || []);
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
        allPartners.forEach(p => p.sectors?.forEach(s => sectors.add(s)));
        return Array.from(sectors).sort();
    }, [allPartners]);
    
    const filteredPartners = useMemo(() => {
        if (!allPartners) return [];
        return allPartners.filter(partner => {
            const specialtyMatch = specialtyFilter === 'all' || partner.specialties?.includes(specialtyFilter);
            const sectorMatch = sectorFilter === 'all' || partner.sectors?.includes(sectorFilter);
            return specialtyMatch && sectorMatch;
        });
    }, [allPartners, specialtyFilter, sectorFilter]);

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
                                                    {partner.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3"/>{partner.email}</p>}
                                                    {partner.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3"/>{partner.phone}</p>}
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

                    {selectedPartners.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium">Partenaires attachés :</h4>
                             <div className="space-y-2">
                                {selectedPartners.map(partner => (
                                    <div key={partner.id} className="flex justify-between items-start p-3 border rounded-lg bg-secondary/50">
                                         <div>
                                            <p className="font-semibold">{partner.name}</p>
                                            <div className="text-xs text-muted-foreground space-y-1 mt-1">
                                                {partner.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3"/>{partner.email}</p>}
                                                {partner.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3"/>{partner.phone}</p>}
                                                {partner.specialties && partner.specialties.length > 0 && <p><strong>Spéc:</strong> {partner.specialties.join(', ')}</p>}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePartner(partner.id)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
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

function AuraAnalysisResultBlockPreview({ savedAnalysis }: { savedAnalysis: any }) {
    if (!savedAnalysis) {
        return <p className="text-muted-foreground">Analyse non effectuée.</p>;
    }

    const renderSuggestions = (title: string, data: { products: any[], protocoles: any[] }) => {
        if (!data || (!data.products?.length && !data.protocoles?.length)) {
             return (
                <div key={title} className="mb-4">
                    <h4 className="font-semibold text-primary">{title}</h4>
                    <p className="text-sm text-muted-foreground">Aucune suggestion.</p>
                </div>
            );
        }
        return (
            <div key={title} className="mb-4">
                <h4 className="font-semibold text-primary">{title}</h4>
                {data.products && data.products.length > 0 && <p className="text-sm"><b>Produits:</b> {data.products.map(p => p.title).join(', ')}</p>}
                {data.protocoles && data.protocoles.length > 0 && <p className="text-sm"><b>Protocoles:</b> {data.protocoles.map(p => p.name).join(', ')}</p>}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div>
                 <h3 className="font-bold text-lg mb-2">Correspondance par Pathologie</h3>
                 {savedAnalysis.byPathology && savedAnalysis.byPathology.length > 0 ? savedAnalysis.byPathology.map((item: any, index: number) => renderSuggestions(item.pathology, { products: item.products, protocoles: item.protocoles })) : <p className="text-sm text-muted-foreground">Aucune.</p>}
            </div>
             <div className="pt-4 border-t">
                <h3 className="font-bold text-lg mb-2">Adapté au Profil Holistique</h3>
                {renderSuggestions('', savedAnalysis.byHolisticProfile)}
            </div>
            <div className="pt-4 border-t">
                <h3 className="font-bold text-lg mb-2">Cohérence Parfaite</h3>
                 {renderSuggestions('', savedAnalysis.perfectMatch)}
            </div>
        </div>
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
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    
    const followUpRef = useMemoFirebase(() => {
        if (!user || !followUpId) return null;
        return doc(firestore, `users/${user.uid}/follow_ups`, followUpId as string);
    }, [firestore, user, followUpId]);
    
    const { data: followUp, isLoading: isFollowUpLoading } = useDoc<FollowUp>(followUpRef);

    const modelRef = useMemoFirebase(() => {
        if (!user || !followUp) return null;
        return doc(firestore, `users/${user.uid}/question_models`, followUp.modelId);
    }, [firestore, user, followUp]);
    
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

    const persistAnswers = async (currentAnswers: Record<string, any>) => {
        if (!followUpRef) return;
        const answersToSave = Object.entries(currentAnswers).map(([questionId, answer]) => ({
            questionId,
            answer,
        }));
        const cleanedAnswers = cleanDataForFirestore(answersToSave);
        await setDocumentNonBlocking(followUpRef, { answers: cleanedAnswers }, { merge: true });
        toast({title: "Progression enregistrée"});
    };

    const handleSave = async () => {
        if (!followUpRef) return;
        setIsSubmitting(true);
        const answersToSave = Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer,
        }));
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
                                                    value={[(blockAnswer?.[question.id] || 5)]}
                                                    onValueChange={(value) => handleAnswerChange(questionBlock.id, {...blockAnswer, [question.id]: value[0]})}
                                                />
                                                <div className="font-bold text-lg w-10 text-center">{blockAnswer?.[question.id] || '5'}</div>
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
                                    <BlocQuestionModele
                                        savedAnalysis={blockAnswer}
                                        onSaveAnalysis={(result) => handleAnswerChange(questionBlock.id, result)}
                                        onSaveBlock={() => persistAnswers({ ...answers, [questionBlock.id]: answers[questionBlock.id] || {} })}
                                        followUpClientId={followUp.clientId}
                                    />
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
                                        savedAnalysis={blockAnswer} 
                                        onSaveAnalysis={(result) => handleAnswerChange(questionBlock.id, result)}
                                        onSaveBlock={() => persistAnswers({ ...answers, [questionBlock.id]: answers[questionBlock.id] })}
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
                                        savedAnalysis={blockAnswer} 
                                        onSaveAnalysis={(result) => handleAnswerChange(questionBlock.id, result)}
                                        onSaveBlock={() => persistAnswers({ ...answers, [questionBlock.id]: answers[questionBlock.id] })}
                                    />
                                </CardContent>
                            </Card>
                        );
                    }
                   if (questionBlock.type === 'scorm') {
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
                                                value={blockAnswer?.[question.id]}
                                                onValueChange={(value) => handleAnswerChange(questionBlock.id, {...blockAnswer, [question.id]: value})}
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
                                </CardContent>
                            </Card>
                        );
                    }
                     if (questionBlock.type === 'qcm') {
                         const qcmAnswers = blockAnswer || {};
                        return (
                            <Card key={questionBlock.id}>
                                <CardHeader>
                                    <CardTitle>{questionBlock.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    {(questionBlock.questions || []).map(question => {
                                        const selectedAnswerId = qcmAnswers[question.id];
                                        const selectedAnswer = question.answers.find(a => a.id === selectedAnswerId);
                                        return (
                                            <div key={question.id}>
                                                <Label className="font-semibold">{question.text}</Label>
                                                <RadioGroup
                                                    value={selectedAnswerId}
                                                     onValueChange={(value) => handleAnswerChange(questionBlock.id, {...qcmAnswers, [question.id]: value})}
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
                                        value={blockAnswer || ''}
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
                                initialAnswer={blockAnswer}
                                onAnswerChange={(value: any) => handleAnswerChange(questionBlock.id, value)}
                                onSaveBlock={async () => await persistAnswers({ ...answers, [questionBlock.id]: answers[questionBlock.id] })}
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
    
const PdfPreviewModal = ({ isOpen, onOpenChange, suivi, model, liveAnswers }: { isOpen: boolean, onOpenChange: (open: boolean) => void, suivi: FollowUp, model: QuestionModel | null, liveAnswers: Record<string, any> }) => {
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

            const answer = liveAnswers[block.id];
            
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
                            const answer = liveAnswers[block.id];
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
                                {answer.drawnCards.map((item: any, index: number) => (
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
            const renderSuggestions = (title: string, data: { products: any[], protocoles: any[] }) => {
                if (!data || (!data.products?.length && !data.protocoles?.length)) {
                    return (
                        <div key={title} className="mb-4">
                            <h4 className="font-semibold text-primary">{title}</h4>
                            <p className="text-sm text-muted-foreground">Aucune suggestion.</p>
                        </div>
                    );
                }
                return (
                    <div key={title} className="mb-4">
                        <h4 className="font-semibold text-primary">{title}</h4>
                        {data.products && data.products.length > 0 && <p className="text-sm"><b>Produits:</b> {data.products.map(p => p.title).join(', ')}</p>}
                        {data.protocoles && data.protocoles.length > 0 && <p className="text-sm"><b>Protocoles:</b> {data.protocoles.map(p => p.name).join(', ')}</p>}
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
                             {answer.byPathology && answer.byPathology.length > 0 ? answer.byPathology.map((item: any, index: number) => renderSuggestions(item.pathology, { products: item.products, protocoles: item.protocoles })) : <p className="text-sm text-muted-foreground">Aucune.</p>}
                        </div>
                         <div className="pt-4 border-t">
                            <h3 className="font-bold text-lg mb-2">Adapté au Profil Holistique</h3>
                            {renderSuggestions('', answer.byHolisticProfile)}
                        </div>
                        <div className="pt-4 border-t">
                            <h3 className="font-bold text-lg mb-2">Cohérence Parfaite</h3>
                             {renderSuggestions('', answer.perfectMatch)}
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
