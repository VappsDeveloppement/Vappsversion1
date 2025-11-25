
'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Event = {
    id: string;
    title: string;
    date: string;
};

export default function PrismeLiveSessionPage() {
    const params = useParams();
    const { eventId } = params;
    const firestore = useFirestore();

    const eventRef = useMemoFirebase(() => {
        if (!eventId) return null;
        return doc(firestore, 'events', eventId as string);
    }, [firestore, eventId]);

    const { data: event, isLoading } = useDoc<Event>(eventRef);

    if (isLoading) {
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
                        Choisissez le type de séance et le modèle à utiliser.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Les options de configuration apparaîtront ici.</p>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Questions des participants</CardTitle>
                    <CardDescription>
                        Ajoutez et gérez les questions des participants pendant l'événement.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">La liste des questions et les outils de tirage apparaîtront ici.</p>
                </CardContent>
            </Card>
        </div>
    );
}

