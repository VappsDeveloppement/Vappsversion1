import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";

export default function VitaePage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Vitae</h1>
                <p className="text-muted-foreground">Votre assistant IA pour la création de documents professionnels.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>En Construction</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                        <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">L'outil Vitae arrive bientôt</h3>
                        <p className="text-muted-foreground mt-2 max-w-2xl">Cette section vous permettra de générer des CV, lettres de motivation et autres documents professionnels grâce à l'intelligence artificielle.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
