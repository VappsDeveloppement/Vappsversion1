

'use client';

import React, { useMemo, useState } from 'react';
import { useAgency } from '@/context/agency-provider';
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, PhoneForwarded } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

type FollowUpRequest = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    liveDate: string;
    status: 'new' | 'processed';
    createdAt: string;
    counselorId: string;
};

const statusVariant: Record<FollowUpRequest['status'], 'default' | 'secondary' | 'destructive'> = {
  new: 'destructive',
  processed: 'secondary',
};

const statusText: Record<FollowUpRequest['status'], string> = {
  new: 'Nouveau',
  processed: 'Traité',
};

function FollowUpRequestsSection() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { agency, isLoading: isAgencyLoading } = useAgency();

    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

    const isSuperAdmin = userData?.role === 'superadmin';

    const followUpRequestsQuery = useMemoFirebase(() => {
        if (!user || !userData) return null;
        
        let q = query(collection(firestore, 'live_follow_up_requests'));

        // Superadmin sees requests for the agency, Counselor sees only theirs.
        if (isSuperAdmin && agency?.id) {
             q = query(q, where('counselorId', '==', agency.id));
        } else if (userData.role === 'conseiller') {
            q = query(q, where('counselorId', '==', user.uid));
        } else {
            // Membres and others should not see any requests
            return null;
        }

        return q;
    }, [user, userData, isSuperAdmin, firestore, agency?.id]);

    const { data: allRequests, isLoading: areRequestsLoading } = useCollection<FollowUpRequest>(followUpRequestsQuery);

    const newRequests = useMemo(() => {
        return allRequests?.filter(req => req.status === 'new').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
    }, [allRequests]);
    
    const processedRequests = useMemo(() => {
        return allRequests?.filter(req => req.status === 'processed').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
    }, [allRequests]);
    
    const handleMarkAsProcessed = async (requestId: string) => {
        const requestRef = doc(firestore, 'live_follow_up_requests', requestId);
        try {
            await setDocumentNonBlocking(requestRef, { status: 'processed' }, { merge: true });
            toast({ title: "Demande traitée", description: "La demande a été marquée comme traitée." });
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de mettre à jour la demande.", variant: "destructive" });
        }
    };
    
    const isLoading = isUserLoading || isUserDataLoading || areRequestsLoading || isAgencyLoading;

    const renderTable = (requests: FollowUpRequest[]) => {
        if (isLoading) {
            return [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
            ));
        }
        if (requests.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Aucune demande dans cette catégorie.
                    </TableCell>
                </TableRow>
            );
        }
        return requests.map(request => (
            <TableRow key={request.id}>
                <TableCell>
                    <div className="font-medium">{request.name}</div>
                    <div className="text-sm text-muted-foreground">{request.email}</div>
                </TableCell>
                <TableCell>{request.phone || '-'}</TableCell>
                <TableCell>{new Date(request.liveDate).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>
                    <Badge variant={statusVariant[request.status]}>
                        {statusText[request.status]}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    {request.status === 'new' && (
                        <Button variant="outline" size="sm" onClick={() => handleMarkAsProcessed(request.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marquer comme traité
                        </Button>
                    )}
                </TableCell>
            </TableRow>
        ));
    };

    if (userData?.role !== 'conseiller' && userData?.role !== 'superadmin') {
        return null;
    }

    return (
        <Card>
            <Tabs defaultValue="new">
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <div>
                             <CardTitle>Demandes de Rappel</CardTitle>
                             <CardDescription>Demandes de suivi des participants après un événement live.</CardDescription>
                        </div>
                        <TabsList>
                            <TabsTrigger value="new">Nouvelles</TabsTrigger>
                            <TabsTrigger value="processed">Traitées</TabsTrigger>
                        </TabsList>
                    </div>
                </CardHeader>
                <CardContent>
                    <TabsContent value="new">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Téléphone</TableHead>
                                    <TableHead>Date du live</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderTable(newRequests)}
                            </TableBody>
                        </Table>
                    </TabsContent>
                     <TabsContent value="processed">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Téléphone</TableHead>
                                    <TableHead>Date du live</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderTable(processedRequests)}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
}


export default function DashboardPage() {
    const { agency } = useAgency();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Tableau de bord</h1>
                <p className="text-muted-foreground">
                    Bienvenue sur votre tableau de bord, {agency?.name || '...'}.
                </p>
            </div>
            
            <FollowUpRequestsSection />

            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">D'autres statistiques et informations seront bientôt disponibles ici.</p>
            </div>
        </div>
    );
}
