
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, MessageSquare } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type TrainingRequest = {
    id: string;
    trainingId: string;
    trainingTitle: string;
    counselorId: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    status: 'new' | 'processed';
    createdAt: string;
};

const statusVariant: Record<TrainingRequest['status'], 'default' | 'secondary' | 'destructive'> = {
  new: 'destructive',
  processed: 'secondary',
};

const statusText: Record<TrainingRequest['status'], string> = {
  new: 'Nouveau',
  processed: 'Traité',
};

export default function TrainingRequestsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [requestToView, setRequestToView] = useState<TrainingRequest | null>(null);

    const requestsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'training_requests'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    
    const { data: allRequests, isLoading: areRequestsLoading } = useCollection<TrainingRequest>(requestsQuery);

    const newRequests = useMemo(() => {
        return allRequests?.filter(req => req.status === 'new').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
    }, [allRequests]);
    
    const processedRequests = useMemo(() => {
        return allRequests?.filter(req => req.status === 'processed').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
    }, [allRequests]);

    const handleMarkAsProcessed = (requestId: string) => {
        const requestRef = doc(firestore, 'training_requests', requestId);
        setDocumentNonBlocking(requestRef, { status: 'processed' }, { merge: true });
        toast({ title: 'Demande traitée' });
        if (requestToView?.id === requestId) setRequestToView(null);
    };

    const isLoading = isUserLoading || areRequestsLoading;
    
    const renderTableRows = (requests: TrainingRequest[]) => {
        if (isLoading) {
            return [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full"/></TableCell></TableRow>);
        }
        if (requests.length === 0) {
            return <TableRow><TableCell colSpan={5} className="h-24 text-center">Aucune demande dans cette catégorie.</TableCell></TableRow>;
        }
        return requests.map(req => (
            <TableRow key={req.id}>
                <TableCell>
                    <div className="font-medium">{req.name}</div>
                    <div className="text-sm text-muted-foreground">{req.email}</div>
                </TableCell>
                <TableCell>{req.trainingTitle}</TableCell>
                <TableCell>{new Date(req.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell><Badge variant={statusVariant[req.status]}>{statusText[req.status]}</Badge></TableCell>
                <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setRequestToView(req)}>
                        <Mail className="mr-2 h-4 w-4" /> Voir la demande
                    </Button>
                </TableCell>
            </TableRow>
        ));
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Demandes de Formation</h1>
                <p className="text-muted-foreground">Consultez les demandes d'information pour vos formations.</p>
            </div>
             <Tabs defaultValue="new">
                <TabsList>
                    <TabsTrigger value="new">Nouvelles Demandes</TabsTrigger>
                    <TabsTrigger value="processed">Demandes Traitées</TabsTrigger>
                </TabsList>
                <TabsContent value="new">
                    <Card>
                        <CardHeader><CardTitle>Nouvelles Demandes</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Demandeur</TableHead><TableHead>Formation</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{renderTableRows(newRequests)}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="processed">
                     <Card>
                        <CardHeader><CardTitle>Demandes Traitées</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Demandeur</TableHead><TableHead>Formation</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{renderTableRows(processedRequests)}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
             <Dialog open={!!requestToView} onOpenChange={(open) => !open && setRequestToView(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Demande pour: {requestToView?.trainingTitle}</DialogTitle>
                        <DialogDescription>Reçue le {requestToView && new Date(requestToView.createdAt).toLocaleString('fr-FR')}</DialogDescription>
                    </DialogHeader>
                    {requestToView && (
                        <div className="space-y-4 py-4 text-sm">
                            <div className="space-y-1">
                                <Label>Nom</Label>
                                <p className="text-muted-foreground">{requestToView.name}</p>
                            </div>
                            <div className="space-y-1">
                                <Label>Email</Label>
                                <p className="text-muted-foreground">{requestToView.email}</p>
                            </div>
                            {requestToView.phone && <div className="space-y-1"><Label>Téléphone</Label><p className="text-muted-foreground">{requestToView.phone}</p></div>}
                            {requestToView.message && (
                                <div className="space-y-1">
                                    <Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4"/> Message</Label>
                                    <p className="text-muted-foreground border bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{requestToView.message}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        {requestToView?.status === 'new' && (
                             <Button onClick={() => handleMarkAsProcessed(requestToView!.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Marquer comme traité
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    