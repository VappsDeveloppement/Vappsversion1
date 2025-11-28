
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Training = {
    id: string;
    title: string;
    description?: string;
};

export default function TrainingCurriculumPage() {
    const params = useParams();
    const { trainingId } = params;
    const firestore = useFirestore();

    const trainingRef = useMemoFirebase(() => {
        if (!trainingId) return null;
        return doc(firestore, 'trainings', trainingId as string);
    }, [firestore, trainingId]);

    const { data: training, isLoading } = useDoc<Training>(trainingRef);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
            </div>
        );
    }
    
    if (!training) {
        return (
             <div className="space-y-4">
                <Link href="/dashboard/e-learning" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Retour à la liste des formations
                </Link>
                <h1 className="text-2xl font-bold">Formation non trouvée</h1>
                <p className="text-muted-foreground">Impossible de charger les détails de cette formation.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <Link href="/dashboard/e-learning" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste des formations
            </Link>
            <div>
                <h1 className="text-3xl font-bold font-headline">Parcours de la formation : {training.title}</h1>
                <p className="text-muted-foreground">
                   Gérez les modules, les prérequis et les niveaux de cette formation.
                </p>
            </div>

            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le constructeur de parcours sera implémenté ici.</p>
            </div>
        </div>
    );
}
