
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrismePage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Prisme</h1>
                <p className="text-muted-foreground">
                    Créez et gérez vos modèles de triage : cartes de voyance, ressentis, pendule, etc.
                </p>
            </div>

            <Tabs defaultValue="cartomancie">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="cartomancie">Cartomancie</TabsTrigger>
                    <TabsTrigger value="clairvoyance">Clairvoyance</TabsTrigger>
                    <TabsTrigger value="pendule">Pendule</TabsTrigger>
                </TabsList>
                <TabsContent value="cartomancie">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cartomancie</CardTitle>
                            <CardDescription>Gestion des modèles de tirages de cartes (tarots, oracles, etc.).</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">La gestion des modèles de cartomancie est en cours de construction.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="clairvoyance">
                     <Card>
                        <CardHeader>
                            <CardTitle>Clairvoyance</CardTitle>
                            <CardDescription>Gestion des modèles pour les ressentis et les visions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">La gestion des modèles de clairvoyance est en cours de construction.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="pendule">
                     <Card>
                        <CardHeader>
                            <CardTitle>Pendule</CardTitle>
                            <CardDescription>Gestion des planches et des modèles pour le pendule.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">La gestion des modèles pour le pendule est en cours de construction.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
