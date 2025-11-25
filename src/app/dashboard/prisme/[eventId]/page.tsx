
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useMemoFirebase, useCollection, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, User, Calendar as CalendarIcon, Wand, Save, BookOpen, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type PrismeConfig = {
    sessionType?: 'cartomancie' | 'clairvoyance';
    tirageModelId?: string;
    deckId?: string;
    clairvoyanceModelId?: string;
}

type DrawnCard = { card: CardData; position: { positionNumber: number; meaning: string } };

type Consultation = {
    id: string;
    participantName: string;
    participantDob?: string;
    question: string;
    result: {
        drawnCards?: DrawnCard[];
        selectedCharacteristics?: { id: string; text: string }[];
    };
    createdAt: string;
};

type Event = {
    id: string;
    title: string;
    date: string;
    prismeConfig?: PrismeConfig;
    consultations?: Consultation[];
};

type TirageModel = {
  id: string;
  name: string;
  positions: { positionNumber: number; meaning: string }[];
};

type CardDeck = {
  id: string;
  name: string;
};

type CardData = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
};

type ClairvoyanceModel = {
  id: string;
  name: string;
  imageUrl?: string | null;
  characteristics?: { id: string; text: string }[];
};


export default function PrismeLiveSessionPage() {
    const params = useParams();
    const { eventId } = params;
    const firestore = useFirestore();
    const { user } = useUser();

    // Event data
    const eventRef = useMemoFirebase(() => {
        if (!eventId) return null;
        return doc(firestore, 'events', eventId as string);
    }, [firestore, eventId]);
    const { data: event, isLoading: isEventLoading } = useDoc<Event>(eventRef);

    // Session configuration state
    const [sessionType, setSessionType] = useState<'cartomancie' | 'clairvoyance'>('cartomancie');
    const [selectedTirageModelId, setSelectedTirageModelId] = useState<string | null>(null);
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [selectedClairvoyanceModelId, setSelectedClairvoyanceModelId] = useState<string | null>(null);
    
    // New question form state
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [participantName, setParticipantName] = useState('');
    const [participantDob, setParticipantDob] = useState('');
    const [participantQuestion, setParticipantQuestion] = useState('');

    // Consultation result state
    const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
    const [selectedCharacteristics, setSelectedCharacteristics] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (event?.prismeConfig) {
            const config = event.prismeConfig;
            setSessionType(config.sessionType || 'cartomancie');
            setSelectedTirageModelId(config.tirageModelId || null);
            setSelectedDeckId(config.deckId || null);
            setSelectedClairvoyanceModelId(config.clairvoyanceModelId || null);
        }
    }, [event]);


    // Data for selectors
    const tirageModelsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'tirageModels'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: tirageModels, isLoading: areTirageModelsLoading } = useCollection<TirageModel>(tirageModelsQuery);

    const decksQuery = useMemoFirebase(() => user ? query(collection(firestore, 'cardDecks'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: decks, isLoading: areDecksLoading } = useCollection<CardDeck>(decksQuery);

    const clairvoyanceModelsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'clairvoyanceModels'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: clairvoyanceModels, isLoading: areClairvoyanceModelsLoading } = useCollection<ClairvoyanceModel>(clairvoyanceModelsQuery);
    
    const cardsQuery = useMemoFirebase(() => {
        if (!selectedDeckId) return null;
        return collection(firestore, `cardDecks/${selectedDeckId}/cards`);
    }, [selectedDeckId, firestore]);
    const { data: cards, isLoading: areCardsLoading } = useCollection<CardData>(cardsQuery);
    
    const selectedTirageModel = useMemo(() => tirageModels?.find(m => m.id === selectedTirageModelId), [tirageModels, selectedTirageModelId]);
    const selectedClairvoyanceModel = useMemo(() => clairvoyanceModels?.find(m => m.id === selectedClairvoyanceModelId), [clairvoyanceModels, selectedClairvoyanceModelId]);

    const updatePrismeConfig = (newConfig: PrismeConfig) => {
        if (!eventRef) return;
        setDocumentNonBlocking(eventRef, {
            prismeConfig: newConfig
        }, { merge: true });
    };

    const handleSessionTypeChange = (type: 'cartomancie' | 'clairvoyance') => {
        setSessionType(type);
        const currentConfig = event?.prismeConfig || {};
        if (type === 'cartomancie') {
            updatePrismeConfig({ ...currentConfig, sessionType: type, clairvoyanceModelId: '' });
        } else {
             updatePrismeConfig({ ...currentConfig, sessionType: type, tirageModelId: '', deckId: '' });
        }
    };
    
    const handleTirageModelChange = (modelId: string) => {
        setSelectedTirageModelId(modelId);
        updatePrismeConfig({ ...event?.prismeConfig, sessionType: 'cartomancie', tirageModelId: modelId });
    };

    const handleDeckChange = (deckId: string) => {
        setSelectedDeckId(deckId);
        updatePrismeConfig({ ...event?.prismeConfig, sessionType: 'cartomancie', deckId: deckId });
    };
    
    const handleClairvoyanceModelChange = (modelId: string) => {
        setSelectedClairvoyanceModelId(modelId);
        updatePrismeConfig({ ...event?.prismeConfig, sessionType: 'clairvoyance', clairvoyanceModelId: modelId });
    };

    const handleDrawCards = () => {
        if (!selectedTirageModel || !cards || cards.length === 0) return;
        const numberOfCardsToDraw = selectedTirageModel.positions.length;
        if (cards.length < numberOfCardsToDraw) {
            alert("Le jeu de cartes ne contient pas assez de cartes pour ce tirage.");
            return;
        }
        const shuffled = [...cards].sort(() => 0.5 - Math.random());
        const newDrawnCards = selectedTirageModel.positions.map((pos, index) => ({
            card: shuffled[index],
            position: pos,
        }));
        setDrawnCards(newDrawnCards);
    };

    const handleCheckboxChange = (characteristicId: string) => {
        setSelectedCharacteristics(prev => ({
            ...prev,
            [characteristicId]: !prev[characteristicId],
        }));
    };

    const resetQuestionForm = () => {
        setParticipantName('');
        setParticipantDob('');
        setParticipantQuestion('');
        setDrawnCards([]);
        setSelectedCharacteristics({});
        setShowQuestionForm(false);
    };

    const handleSaveConsultation = async () => {
        if (!eventRef) return;
        const newConsultation: Consultation = {
            id: `consult-${Date.now()}`,
            participantName,
            participantDob,
            question: participantQuestion,
            result: {},
            createdAt: new Date().toISOString(),
        };

        if (sessionType === 'cartomancie') {
            newConsultation.result.drawnCards = drawnCards;
        } else {
            newConsultation.result.selectedCharacteristics = selectedClairvoyanceModel?.characteristics?.filter(c => selectedCharacteristics[c.id]) || [];
        }

        await updateDoc(eventRef, {
            consultations: arrayUnion(newConsultation)
        });
        
        resetQuestionForm();
    };

    const isLoading = isEventLoading || areTirageModelsLoading || areDecksLoading || areClairvoyanceModelsLoading;

    if (isLoading && !event) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-8 w-1/2" />
                <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
            </div>
        );
    }

    if (!event) {
        return (
            <div>
                <h1 className="text-2xl font-bold">Événement non trouvé</h1>
                <p className="text-muted-foreground">L'événement que vous essayez de gérer n'existe pas.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <Link href="/dashboard/events" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste des événements
            </Link>
             <div>
                <h1 className="text-3xl font-bold font-headline">Session Live: {event.title}</h1>
                <p className="text-muted-foreground">Préparez et gérez votre session en direct pour l'événement du {new Date(event.date).toLocaleDateString('fr-FR')}.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Configuration de la session</CardTitle>
                    <CardDescription>Choisissez le type de séance et le modèle à utiliser. Vos choix sont sauvegardés automatiquement.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={sessionType} onValueChange={(value) => handleSessionTypeChange(value as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="cartomancie">Cartomancie</TabsTrigger>
                            <TabsTrigger value="clairvoyance">Clairvoyance/Pendule</TabsTrigger>
                        </TabsList>
                        <TabsContent value="cartomancie" className="pt-6">
                            <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Modèle de Tirage</Label><Select onValueChange={handleTirageModelChange} value={selectedTirageModelId || ''} disabled={areTirageModelsLoading}><SelectTrigger><SelectValue placeholder="Choisir un modèle..." /></SelectTrigger><SelectContent>{tirageModels?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Jeu de Cartes</Label><Select onValueChange={handleDeckChange} value={selectedDeckId || ''} disabled={areDecksLoading}><SelectTrigger><SelectValue placeholder="Choisir un jeu..." /></SelectTrigger><SelectContent>{decks?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div></div></div>
                        </TabsContent>
                        <TabsContent value="clairvoyance" className="pt-6"><div className="space-y-4"><div className="space-y-2"><Label>Modèle de Clairvoyance/Pendule</Label><Select onValueChange={handleClairvoyanceModelChange} value={selectedClairvoyanceModelId || ''} disabled={areClairvoyanceModelsLoading}><SelectTrigger><SelectValue placeholder="Choisir un modèle..." /></SelectTrigger><SelectContent>{clairvoyanceModels?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div></div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div><CardTitle>Questions des participants</CardTitle><CardDescription>Ajoutez et gérez les questions des participants pendant l'événement.</CardDescription></div>
                        <Button onClick={() => setShowQuestionForm(prev => !prev)}><PlusCircle className="mr-2 h-4 w-4" />{showQuestionForm ? 'Fermer' : 'Ajouter une question'}</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {showQuestionForm && (
                        <div className="p-4 border rounded-lg bg-muted/50 mb-6 space-y-6">
                            <h4 className="font-semibold">Nouvelle question</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="participant-name">Nom du participant</Label><Input id="participant-name" placeholder="Ex: Jean Dupont" value={participantName} onChange={(e) => setParticipantName(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="participant-dob">Date de naissance</Label><Input id="participant-dob" type="date" value={participantDob} onChange={(e) => setParticipantDob(e.target.value)} /></div></div>
                            <div className="space-y-2"><Label htmlFor="participant-question">Question</Label><Textarea id="participant-question" placeholder="Quelle est la question du participant ?" value={participantQuestion} onChange={(e) => setParticipantQuestion(e.target.value)} /></div>
                            
                             {sessionType === 'cartomancie' && (
                                <div className="space-y-4 pt-4 border-t">
                                    <Button onClick={handleDrawCards} disabled={!selectedTirageModel || !cards || areCardsLoading}><Wand className="mr-2 h-4 w-4" />Lancer le tirage</Button>
                                    {drawnCards.length > 0 && (<div className="space-y-4">{drawnCards.map((item, index) => (<div key={index} className="flex gap-4 p-4 border rounded-lg bg-background"><div className="flex-shrink-0">{item.card.imageUrl ? <Image src={item.card.imageUrl} alt={item.card.name} width={80} height={120} className="rounded-md object-cover" /> : <div className="w-20 h-[120px] bg-muted rounded-md" />}</div><div><p className="text-sm text-muted-foreground">{item.position.meaning}</p><h4 className="text-lg font-bold">{item.card.name}</h4><p className="text-sm">{item.card.description}</p></div></div>))}</div>)}
                                </div>
                            )}

                            {sessionType === 'clairvoyance' && selectedClairvoyanceModel && (
                                <div className="space-y-4 pt-4 border-t">
                                    {selectedClairvoyanceModel.imageUrl && (<div className="relative w-full aspect-square max-w-sm mx-auto"><Image src={selectedClairvoyanceModel.imageUrl} alt={selectedClairvoyanceModel.name} fill className="object-contain" /></div>)}
                                    {selectedClairvoyanceModel.characteristics && selectedClairvoyanceModel.characteristics.length > 0 && (<div className="space-y-3"><h4 className="font-medium">Caractéristiques / Réponses</h4><div className="space-y-2">{selectedClairvoyanceModel.characteristics.map(char => (<div key={char.id} className="flex items-center space-x-2"><Checkbox id={char.id} checked={!!selectedCharacteristics[char.id]} onCheckedChange={() => handleCheckboxChange(char.id)} /><label htmlFor={char.id} className="text-sm font-medium">{char.text}</label></div>))}</div></div>)}
                                </div>
                            )}
                            
                            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={resetQuestionForm}>Annuler</Button><Button onClick={handleSaveConsultation}><Save className="mr-2 h-4 w-4"/>Enregistrer la consultation</Button></div>
                        </div>
                    )}
                    
                     <Accordion type="multiple" className="w-full">
                        {event.consultations && event.consultations.length > 0 ? (
                            event.consultations.map(c => (
                                <AccordionItem key={c.id} value={c.id}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between w-full pr-4">
                                            <div className="flex items-center gap-2"><User className="h-4 w-4" /> {c.participantName}</div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> {new Date(c.createdAt).toLocaleTimeString('fr-FR')}</div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 space-y-4">
                                        <p className="text-muted-foreground whitespace-pre-wrap border-b pb-4"><strong>Question :</strong> {c.question}</p>
                                        {c.result.drawnCards && c.result.drawnCards.length > 0 && (
                                            <div className="space-y-4">{c.result.drawnCards.map((item, index) => (<div key={index} className="flex gap-4 p-4 border rounded-lg bg-background"><div className="flex-shrink-0">{item.card.imageUrl ? <Image src={item.card.imageUrl} alt={item.card.name} width={80} height={120} className="rounded-md object-cover" /> : <div className="w-20 h-[120px] bg-muted rounded-md" />}</div><div><p className="text-sm text-muted-foreground">{item.position.meaning}</p><h4 className="text-lg font-bold">{item.card.name}</h4><p className="text-sm">{item.card.description}</p></div></div>))}</div>
                                        )}
                                        {c.result.selectedCharacteristics && c.result.selectedCharacteristics.length > 0 && (
                                            <ul className="list-disc pl-5 space-y-1">{c.result.selectedCharacteristics.map(char => <li key={char.id}>{char.text}</li>)}</ul>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center py-8">Aucune question enregistrée pour cet événement.</p>
                        )}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
