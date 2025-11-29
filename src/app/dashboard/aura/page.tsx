
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ShoppingBag, Beaker, ClipboardList } from "lucide-react";

export default function AuraPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Aura</h1>
                <p className="text-muted-foreground">Votre outil de création de contenu par IA.</p>
            </div>

            <Tabs defaultValue="fiche-bien-etre" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="fiche-bien-etre">
                        <FileText className="mr-2 h-4 w-4" />
                        Fiche bien-être
                    </TabsTrigger>
                    <TabsTrigger value="catalogue-produits">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Catalogue Produits
                    </TabsTrigger>
                    <TabsTrigger value="protocoles">
                        <Beaker className="mr-2 h-4 w-4" />
                        Protocoles
                    </TabsTrigger>
                    <TabsTrigger value="test">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Test
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="fiche-bien-etre">
                    <Card>
                        <CardHeader>
                            <CardTitle>Générateur de Fiche Bien-être</CardTitle>
                            <CardDescription>Créez des fiches de bien-être personnalisées pour vos clients.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Contenu à venir</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">L'outil de génération de fiches bien-être sera bientôt disponible ici.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="catalogue-produits">
                    <Card>
                        <CardHeader>
                            <CardTitle>Générateur de Catalogue Produits</CardTitle>
                            <CardDescription>Créez des descriptions et des visuels pour votre catalogue de produits.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Contenu à venir</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">L'outil de génération de catalogue produits sera bientôt disponible ici.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="protocoles">
                    <Card>
                        <CardHeader>
                            <CardTitle>Générateur de Protocoles</CardTitle>
                            <CardDescription>Élaborez des protocoles de soin ou d'accompagnement sur mesure.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <Beaker className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Contenu à venir</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">L'outil de génération de protocoles sera bientôt disponible ici.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="test">
                    <Card>
                        <CardHeader>
                            <CardTitle>Zone de Test</CardTitle>
                            <CardDescription>Utilisez cet espace pour expérimenter librement avec les fonctionnalités d'Aura.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Contenu à venir</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">La zone de test pour Aura sera bientôt disponible ici.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
