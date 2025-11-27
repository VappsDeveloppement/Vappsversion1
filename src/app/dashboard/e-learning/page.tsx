
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCopy, CheckSquare, Users, Presentation, ScrollText } from "lucide-react";

export default function ElearningPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">E-Learning</h1>
                <p className="text-muted-foreground">
                    Gérez vos formations, modules, tests et parcours d'apprentissage.
                </p>
            </div>

            <Tabs defaultValue="catalog" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 h-auto">
                    <TabsTrigger value="catalog">
                        <BookCopy className="mr-2 h-4 w-4" /> Catalogue de Formations
                    </TabsTrigger>
                    <TabsTrigger value="paths">
                        <Presentation className="mr-2 h-4 w-4" /> Parcours de Formation
                    </TabsTrigger>
                     <TabsTrigger value="members">
                        <Users className="mr-2 h-4 w-4" /> Gestion des Membres
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="catalog">
                    <Card>
                        <CardHeader>
                            <CardTitle>Catalogue de Formations</CardTitle>
                            <CardDescription>
                                Créez et gérez vos formations internes ou des liens vers des formations externes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <ScrollText className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Gestion des Formations et Modules</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">Cette section vous permettra de créer des modules de formation (texte, vidéo, etc.) et de les organiser dans un catalogue complet.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="paths">
                     <Card>
                        <CardHeader>
                            <CardTitle>Parcours de Formation</CardTitle>
                            <CardDescription>
                                Assemblez des formations et des tests pour créer des parcours d'apprentissage structurés.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <Presentation className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Création de Parcours Personnalisés</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">Ici, vous pourrez combiner vos modules de formation et tests pour construire des parcours logiques et suivre la progression des participants.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="members">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestion des Membres</CardTitle>
                            <CardDescription>
                                Inscrivez vos clients à des parcours de formation et suivez leur assiduité.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Suivi de l'Assiduité</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">Un tableau de bord vous permettra d'inscrire vos clients aux différents parcours et de visualiser leur avancement et leurs résultats.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
