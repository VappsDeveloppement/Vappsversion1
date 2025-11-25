
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useMemoFirebase, useCollection, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type PrismeConfig = {
    sessionType?: 'cartomancie' | 'clairvoyance';
    tirageModelId?: string;
    deckId?: string;
    clairvoyanceModelId?: string;
}

type Event = {
    id: string;
    title: string;
    date: string;
    prismeConfig?: PrismeConfig;
};

// Types from prisme/page.tsx
type TirageModel = {
  id: string;
  name: string;
};

type CardDeck = {
  id: string;
  name: string;
};

type ClairvoyanceModel = {
  id: string;
  name: string;
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

    // Session configuration state, initialized from the event doc if available
    const [sessionType, setSessionType] = useState<'cartomancie' | 'clairvoyance'>('cartomancie');
    const [selectedTirageModelId, setSelectedTirageModelId] = useState<string | null>(null);
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [selectedClairvoyanceModelId, setSelectedClairvoyanceModelId] = useState<string | null>(null);
    const [showQuestionForm, setShowQuestionForm] = useState(false);

     // Effect to update local state when event data (including prismeConfig) is loaded
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

    // Function to save configuration to Firestore
    const updatePrismeConfig = (newConfig: PrismeConfig) => {
        if (!eventRef) return;
        setDocumentNonBlocking(eventRef, {
            prismeConfig: newConfig
        }, { merge: true });
    };

    // Handlers to update state and save to Firestore
    const handleSessionTypeChange = (type: 'cartomancie' | 'clairvoyance') => {
        setSessionType(type);
        if (type === 'cartomancie') {
            updatePrismeConfig({ 
                sessionType: type,
                clairvoyanceModelId: '',
                tirageModelId: selectedTirageModelId || '',
                deckId: selectedDeckId || '',
            });
        } else {
             updatePrismeConfig({ 
                sessionType: type,
                tirageModelId: '', 
                deckId: '',
                clairvoyanceModelId: selectedClairvoyanceModelId || '',
            });
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

    const isLoading = isEventLoading || areTirageModelsLoading || areDecksLoading || areClairvoyanceModelsLoading;

    if (isLoading && !event) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-8 w-1/2" />
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
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
                <p className="text-muted-foreground">
                    Préparez et gérez votre session en direct pour l'événement du {new Date(event.date).toLocaleDateString('fr-FR')}.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Configuration de la session</CardTitle>
                    <CardDescription>
                        Choisissez le type de séance et le modèle à utiliser. Vos choix sont sauvegardés automatiquement.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={sessionType} onValueChange={(value) => handleSessionTypeChange(value as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="cartomancie">Cartomancie</TabsTrigger>
                            <TabsTrigger value="clairvoyance">Clairvoyance/Pendule</TabsTrigger>
                        </TabsList>
                        <TabsContent value="cartomancie" className="pt-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Modèle de Tirage</Label>
                                        <Select onValueChange={handleTirageModelChange} value={selectedTirageModelId || ''} disabled={areTirageModelsLoading}>
                                            <SelectTrigger><SelectValue placeholder="Choisir un modèle..." /></SelectTrigger>
                                            <SelectContent>{tirageModels?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Jeu de Cartes</Label>
                                         <Select onValueChange={handleDeckChange} value={selectedDeckId || ''} disabled={areDecksLoading}>
                                            <SelectTrigger><SelectValue placeholder="Choisir un jeu..." /></SelectTrigger>
                                            <SelectContent>{decks?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="clairvoyance" className="pt-6">
                             <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Modèle de Clairvoyance/Pendule</Label>
                                    <Select onValueChange={handleClairvoyanceModelChange} value={selectedClairvoyanceModelId || ''} disabled={areClairvoyanceModelsLoading}>
                                        <SelectTrigger><SelectValue placeholder="Choisir un modèle..." /></SelectTrigger>
                                        <SelectContent>{clairvoyanceModels?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Questions des participants</CardTitle>
                            <CardDescription>
                                Ajoutez et gérez les questions des participants pendant l'événement.
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowQuestionForm(prev => !prev)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {showQuestionForm ? 'Fermer' : 'Ajouter une question'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {showQuestionForm && (
                        <div className="p-4 border rounded-lg bg-muted/50 mb-6 space-y-4">
                            <h4 className="font-semibold">Nouvelle question</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="participant-name">Nom du participant</Label>
                                    <Input id="participant-name" placeholder="Ex: Jean Dupont" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="participant-dob">Date de naissance</Label>
                                    <Input id="participant-dob" type="date" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="participant-question">Question</Label>
                                <Textarea id="participant-question" placeholder="Quelle est la question du participant ?" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setShowQuestionForm(false)}>Annuler</Button>
                                <Button>Enregistrer la question</Button>
                            </div>
                        </div>
                    )}
                    <p className="text-muted-foreground text-center py-8">Aucune question pour le moment.</p>
                </CardContent>
            </Card>
        </div>
    );
}
