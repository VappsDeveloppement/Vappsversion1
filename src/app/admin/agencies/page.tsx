
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, PlusCircle } from "lucide-react";

export default function AgencyManagementPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Gestion des Agences</h1>
                    <p className="text-muted-foreground">Créez, modifiez et gérez les agences de la plateforme.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouvelle Agence
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Liste des Agences</CardTitle>
                    <CardDescription>Vue d'ensemble de toutes les agences enregistrées.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                        <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">Aucune agence trouvée</h3>
                        <p className="text-muted-foreground mt-2 max-w-md">Cliquez sur "Nouvelle Agence" pour en créer une. La liste de toutes les agences s'affichera ici.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
