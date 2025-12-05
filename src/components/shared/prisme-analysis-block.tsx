
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand, Save, BookOpen } from 'lucide-react';
import Image from 'next/image';

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

type DrawnCard = {
  card: CardData;
  position: { positionNumber: number; meaning: string };
};

interface PrismeAnalysisBlockProps {
    savedAnalysis: any | null;
    onSaveAnalysis: (result: any) => void;
    onSaveBlock: () => Promise<void>;
}

export function PrismeAnalysisBlock({ savedAnalysis, onSaveAnalysis, onSaveBlock }: PrismeAnalysisBlockProps) {
    const { user } = useUser();
    const firestore = useFirestore();

    const [selectedTirageModelId, setSelectedTirageModelId] = useState<string>('');
    const [selectedDeckId, setSelectedDeckId] = useState<string>('');
    const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
    const [isFanShown, setIsFanShown] = useState(false);
    
    useEffect(() => {
        if(savedAnalysis) {
            setSelectedTirageModelId(savedAnalysis.tirageModelId || '');
            setSelectedDeckId(savedAnalysis.deckId || '');
            setDrawnCards(savedAnalysis.drawnCards || []);
        }
    }, [savedAnalysis]);

    const tirageModelsQuery = useMemoFirebase(() => user ? query(collection(firestore, 'tirageModels'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: tirageModels, isLoading: areTirageModelsLoading } = useCollection<TirageModel>(tirageModelsQuery);

    const decksQuery = useMemoFirebase(() => user ? query(collection(firestore, 'cardDecks'), where('counselorId', '==', user.uid)) : null, [user, firestore]);
    const { data: decks, isLoading: areDecksLoading } = useCollection<CardDeck>(decksQuery);

    const cardsQuery = useMemoFirebase(() => selectedDeckId ? collection(firestore, `cardDecks/${selectedDeckId}/cards`) : null, [selectedDeckId, firestore]);
    const { data: cards, isLoading: areCardsLoading } = useCollection<CardData>(cardsQuery);
    
    const selectedTirageModel = useMemo(() => tirageModels?.find(m => m.id === selectedTirageModelId), [tirageModels, selectedTirageModelId]);

    const handleRandomDraw = () => {
        if (!selectedTirageModel || !cards || cards.length === 0) return;
        
        const numberOfCardsToDraw = selectedTirageModel.positions.length;
        if (cards.length < numberOfCardsToDraw) {
            alert("Le jeu ne contient pas assez de cartes pour ce tirage.");
            return;
        }

        const shuffled = [...cards].sort(() => 0.5 - Math.random());
        const newDrawnCards = selectedTirageModel.positions
            .sort((a, b) => a.positionNumber - b.positionNumber)
            .map((pos, index) => ({
                card: shuffled[index],
                position: pos,
            }));
        setDrawnCards(newDrawnCards);
        onSaveAnalysis({ tirageModelId: selectedTirageModelId, deckId: selectedDeckId, drawnCards: newDrawnCards });
    };

    const handleFanCardClick = (card: CardData) => {
        if (!selectedTirageModel) return;

        const nextPositionIndex = drawnCards.length;
        if (nextPositionIndex >= selectedTirageModel.positions.length) return; // All positions filled

        // Check if card is already drawn
        if (drawnCards.some(dc => dc.card.id === card.id)) return;
        
        const nextPosition = selectedTirageModel.positions.find(p => p.positionNumber === nextPositionIndex + 1);
        if(!nextPosition) return;
        
        const newDrawnCard = { card, position: nextPosition };
        const updatedDrawnCards = [...drawnCards, newDrawnCard].sort((a, b) => a.position.positionNumber - b.position.positionNumber);
        
        setDrawnCards(updatedDrawnCards);
        onSaveAnalysis({ tirageModelId: selectedTirageModelId, deckId: selectedDeckId, drawnCards: updatedDrawnCards });
    };

    const handleSave = async () => {
        onSaveAnalysis({ tirageModelId: selectedTirageModelId, deckId: selectedDeckId, drawnCards });
        await onSaveBlock();
    };
    
    const fanCards = useMemo(() => {
        if(!cards) return [];
        return [...cards].sort(() => 0.5 - Math.random());
    }, [cards]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Modèle de Tirage</Label>
                    <Select onValueChange={setSelectedTirageModelId} value={selectedTirageModelId} disabled={areTirageModelsLoading}>
                        <SelectTrigger><SelectValue placeholder="Choisir un modèle..." /></SelectTrigger>
                        <SelectContent>{tirageModels?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Jeu de Cartes</Label>
                    <Select onValueChange={setSelectedDeckId} value={selectedDeckId} disabled={areDecksLoading}>
                        <SelectTrigger><SelectValue placeholder="Choisir un jeu..." /></SelectTrigger>
                        <SelectContent>{decks?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex flex-wrap gap-4">
                <Button onClick={handleRandomDraw} disabled={!selectedTirageModel || !cards || areCardsLoading}><Wand className="mr-2 h-4 w-4" />Tirage Aléatoire</Button>
                <Button variant="outline" onClick={() => setIsFanShown(!isFanShown)} disabled={!selectedTirageModel || !cards || areCardsLoading}><BookOpen className="mr-2 h-4 w-4" />Tirage en Éventail</Button>
            </div>
            
            {isFanShown && (
                <div className="relative h-64 w-full flex items-center justify-center p-8 bg-muted rounded-lg overflow-hidden">
                    {fanCards.map((card, index) => {
                        const isDrawn = drawnCards.some(dc => dc.card.id === card.id);
                        return (
                            <div
                                key={card.id}
                                className={`absolute transition-all duration-300 ${isDrawn ? 'opacity-20' : 'cursor-pointer hover:!z-20 hover:-translate-y-4'}`}
                                style={{
                                    transform: `rotate(${(index - fanCards.length / 2) * 8}deg) translateY(20px)`,
                                    transformOrigin: 'bottom center',
                                    zIndex: isDrawn ? 0 : 1
                                }}
                                onClick={() => !isDrawn && handleFanCardClick(card)}
                            >
                                <div className="relative w-20 h-28 bg-background border-2 border-primary rounded-lg shadow-lg" />
                            </div>
                        );
                    })}
                </div>
            )}

            {drawnCards.length > 0 && (
                <div className="mt-6 pt-6 border-t space-y-4">
                     <h3 className="text-xl font-semibold mb-4">Résultat du Tirage</h3>
                     {drawnCards.map((item, index) => (
                        <div key={index} className="flex gap-4 p-4 border rounded-lg bg-background">
                            <div className="flex-shrink-0">
                                {item.card.imageUrl ? <Image src={item.card.imageUrl} alt={item.card.name} width={80} height={120} className="rounded-md object-cover" /> : <div className="w-20 h-[120px] bg-muted rounded-md" />}
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Position {item.position.positionNumber}: {item.position.meaning}</p>
                                <h4 className="text-lg font-bold">{item.card.name}</h4>
                                <p className="text-sm">{item.card.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
             <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={drawnCards.length === 0}><Save className="mr-2 h-4 w-4" /> Enregistrer le tirage</Button>
            </div>
        </div>
    );
}

    