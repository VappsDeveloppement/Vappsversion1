import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseZap } from "lucide-react";

export default function AgencyApiPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Gestion API - Agence</h1>
                <p className="text-muted-foreground">Gérez les informations de votre agence via l'API.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Points de terminaison de l'API Agence</CardTitle>
                    <CardDescription>
                        Utilisez ces points de terminaison pour interagir avec les données de votre agence par programmation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                        <DatabaseZap className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">Documentation de l'API</h3>
                        <p className="text-muted-foreground mt-2 max-w-2xl">La documentation sur la manière d'utiliser l'API de l'agence, y compris les clés d'API et les exemples de requêtes, sera affichée ici.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
