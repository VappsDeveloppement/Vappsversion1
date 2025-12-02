
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Briefcase, FlaskConical, Search } from "lucide-react";

function UnderConstruction() {
    return (
        <Card>
            <CardContent className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">En cours de construction...</p>
            </CardContent>
        </Card>
    );
}

function Cvtheque() {
    return <UnderConstruction />;
}

function RncpManager() {
    return <UnderConstruction />;
}

function RomeManager() {
    return <UnderConstruction />;
}

function JobOfferManager() {
    return <UnderConstruction />;
}

function TestManager() {
    return <UnderConstruction />;
}

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
                    <Cvtheque />
                </TabsContent>
                <TabsContent value="rncp">
                    <RncpManager />
                </TabsContent>
                 <TabsContent value="rome">
                    <RomeManager />
                </TabsContent>
                <TabsContent value="jobs">
                    <JobOfferManager />
                </TabsContent>
                <TabsContent value="test">
                    <TestManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
