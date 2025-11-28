import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand } from "lucide-react";

export default function AuraPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Aura</h1>
                <p className="text-muted-foreground">Votre outil de création d'image et de contenu visuel par IA.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>En Construction</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                        <Wand className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold">L'outil Aura arrive bientôt</h3>
                        <p className="text-muted-foreground mt-2 max-w-2xl">Cette section vous permettra de générer des images uniques, des logos et d'autres visuels pour votre marque grâce à l'intelligence artificielle.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
