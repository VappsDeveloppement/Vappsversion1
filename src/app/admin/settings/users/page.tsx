
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ban } from "lucide-react";

export default function UsersPage() {

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Utilisateurs</h1>
        <p className="text-muted-foreground">La gestion des utilisateurs a été désactivée.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalité désactivée</CardTitle>
          <CardDescription>La gestion manuelle des utilisateurs n'est plus disponible.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center">
                <Ban className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Gestion des utilisateurs désactivée</h3>
                <p className="mt-2 text-sm text-muted-foreground">Cette fonctionnalité a été supprimée.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
