
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
                    <TabsTrigger value="modules">
                        <ScrollText className="mr-2 h-4 w-4" /> Modules & Évaluations
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
                                Créez la structure globale de vos formations. Celles-ci pourront être affichées sur votre page d'accueil.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <BookCopy className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Gestion des Formations</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">Cette section vous permettra de créer vos formations (internes ou externes) et de les organiser dans un catalogue complet.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="modules">
                     <Card>
                        <CardHeader>
                            <CardTitle>Modules de Formation et Évaluations</CardTitle>
                            <CardDescription>
                                Créez le contenu pédagogique (modules de texte, vidéo) et les quiz de validation des connaissances.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <div className="flex gap-8">
                                    <ScrollText className="h-16 w-16 text-muted-foreground mb-4" />
                                    <CheckSquare className="h-16 w-16 text-muted-foreground mb-4" />
                                </div>
                                <h3 className="text-xl font-semibold">Création de Contenu Pédagogique</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">Ici, vous pourrez construire les briques de vos formations : les modules de contenu et les évaluations pour valider les acquis.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="members">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestion des Membres</CardTitle>
                            <CardDescription>
                                Inscrivez vos clients à des formations ou parcours et suivez leur progression.
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
