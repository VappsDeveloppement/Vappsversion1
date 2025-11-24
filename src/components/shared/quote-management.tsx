
'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function QuoteManagement() {

    return (
        <Card>
            <CardHeader>
                <CardTitle>Devis</CardTitle>
                <CardDescription>
                    Créez, envoyez et suivez vos devis.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                    <h3 className="text-xl font-semibold">Gestion des devis</h3>
                    <p className="text-muted-foreground mt-2 max-w-2xl">Cette section est en cours de construction.</p>
                </div>
            </CardContent>
        </Card>
    );
}
