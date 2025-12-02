
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Briefcase, FlaskConical, Search, Inbox } from "lucide-react";
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function UnderConstruction({ title }: { title: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">En cours de construction...</p>
            </CardContent>
        </Card>
    );
}

type JobApplication = {
    id: string;
    applicantName: string;
    applicantEmail: string;
    jobOfferTitle: string;
    appliedAt: string;
    status: 'new' | 'reviewed' | 'contacted' | 'rejected';
};

const statusVariant: Record<JobApplication['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'destructive',
  reviewed: 'default',
  contacted: 'outline',
  rejected: 'secondary',
};

const statusText: Record<JobApplication['status'], string> = {
  new: 'Nouvelle',
  reviewed: 'Examinée',
  contacted: 'Contacté',
  rejected: 'Rejetée',
};


function ApplicationManager() {
    const { user } = useUser();
    const firestore = useFirestore();

    const applicationsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'job_applications'), where('counselorId', '==', user.uid));
    }, [user, firestore]);

    const { data: applications, isLoading } = useCollection<JobApplication>(applicationsQuery);
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>Candidatures Reçues</CardTitle>
                <CardDescription>Liste des candidatures reçues pour vos offres d'emploi.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Candidat</TableHead>
                            <TableHead>Offre</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Statut</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                            ))
                        ) : applications && applications.length > 0 ? (
                            applications.map(app => (
                                <TableRow key={app.id}>
                                    <TableCell>
                                        <div className="font-medium">{app.applicantName}</div>
                                        <div className="text-sm text-muted-foreground">{app.applicantEmail}</div>
                                    </TableCell>
                                    <TableCell>{app.jobOfferTitle}</TableCell>
                                    <TableCell>{formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true, locale: fr })}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant[app.status]}>{statusText[app.status]}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Aucune candidature reçue pour le moment.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
    );
}

function Cvtheque() { return <UnderConstruction title="CVTHEQUE" />; }
function RncpManager() { return <UnderConstruction title="FICHE RNCP" />; }
function RomeManager() { return <UnderConstruction title="FICHE ROME" />; }
function JobOfferManager() { return <UnderConstruction title="OFFRE D'EMPLOI" />; }
function TestManager() { return <UnderConstruction title="TEST" />; }

export default function VitaePage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Vitae</h1>
                <p className="text-muted-foreground">Votre outil de gestion de parcours professionnels</p>
            </div>
            
            <ApplicationManager />

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
