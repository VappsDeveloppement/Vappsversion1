
'use client';

import React from 'react';
import { useAgency } from '@/context/agency-provider';

export default function DashboardPage() {
    const { agency } = useAgency();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Tableau de bord</h1>
                <p className="text-muted-foreground">
                    Bienvenue sur le tableau de bord de votre agence, {agency?.name || '...'}.
                </p>
            </div>
            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le tableau de bord de l'agence est en cours de construction.</p>
            </div>
        </div>
    );
}
