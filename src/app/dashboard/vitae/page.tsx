
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, FileText, Briefcase, FlaskConical, Search } from "lucide-react";

export default function VitaePage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Vitae</h1>
                <p className="text-muted-foreground">Votre outil de gestion de parcours professionnels</p>
            </div>
            <Tabs defaultValue="cvtheque" className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-auto">
                    <TabsTrigger value="cvtheque">
                        <FileText className="mr-2 h-4 w-4" /> CVTHEQUE
                    </TabsTrigger>
                    <TabsTrigger value="rncp">
                        <Search className="mr-2 h-4 w-4" /> FICHE RNCP
                    </TabsTrigger>
                    <TabsTrigger value="rome">
                        <Search className="mr-2 h-4 w-4" /> FICHE ROME
                    </TabsTrigger>
                    <TabsTrigger value="jobs">
                        <Briefcase className="mr-2 h-4 w-4" /> OFFRE D'EMPLOI
                    </TabsTrigger>
                    <TabsTrigger value="test">
                        <FlaskConical className="mr-2 h-4 w-4" /> TEST
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="cvtheque">
                    <Card>
                        <CardHeader>
                            <CardTitle>CVthèque</CardTitle>
                            <CardDescription>Gérez et consultez les CV de vos candidats.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center p-12 text-muted-foreground">
                            <p>La gestion de la CVthèque sera bientôt disponible ici.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="rncp">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fiches RNCP</CardTitle>
                            <CardDescription>Recherchez et consultez les fiches du Répertoire National des Certifications Professionnelles.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center p-12 text-muted-foreground">
                             <p>La recherche de fiches RNCP sera bientôt disponible ici.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="rome">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fiches ROME</CardTitle>
                            <CardDescription>Recherchez et consultez les fiches du Répertoire Opérationnel des Métiers et des Emplois.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center p-12 text-muted-foreground">
                            <p>La recherche de fiches ROME sera bientôt disponible ici.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="jobs">
                    <Card>
                        <CardHeader>
                            <CardTitle>Offres d'emploi</CardTitle>
                            <CardDescription>Consultez et gérez les offres d'emploi.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center p-12 text-muted-foreground">
                            <p>La gestion des offres d'emploi sera bientôt disponible ici.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="test">
                    <Card>
                        <CardHeader>
                            <CardTitle>Test</CardTitle>
                            <CardDescription>Section de test pour l'outil Vitae.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center p-12 text-muted-foreground">
                             <p>La section de test sera bientôt disponible ici.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
