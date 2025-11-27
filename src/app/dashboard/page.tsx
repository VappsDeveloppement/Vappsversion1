
'use client';

import React, { useMemo, useState } from 'react';
import { useAgency } from '@/context/agency-provider';
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, useDoc, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, MoreHorizontal, PhoneForwarded, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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

    const [requestToDelete, setRequestToDelete] = useState<FollowUpRequest | null>(null);
    const [isConverting, setIsConverting] = useState<string | null>(null);

    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

    const isSuperAdmin = userData?.role === 'superadmin';

    const followUpRequestsQuery = useMemoFirebase(() => {
        if (!user || !userData) return null;
        
        let q = query(collection(firestore, 'live_follow_up_requests'));

        if (isSuperAdmin && agency?.id) {
             q = query(q, where('counselorId', '==', agency.id));
        } else if (userData.role === 'conseiller') {
            q = query(q, where('counselorId', '==', user.uid));
        } else {
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

    const handleDeleteRequest = async () => {
        if (!requestToDelete) return;
        const requestRef = doc(firestore, 'live_follow_up_requests', requestToDelete.id);
        try {
            await deleteDocumentNonBlocking(requestRef);
            toast({ title: 'Demande supprimée' });
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de supprimer la demande.', variant: 'destructive'});
        } finally {
            setRequestToDelete(null);
        }
    };

    const handleConvertToClient = async (request: FollowUpRequest) => {
        if (!user) return;
        setIsConverting(request.id);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('email', '==', request.email));
            const userSnapshot = await getDocs(q);

            if (!userSnapshot.empty) {
                // User exists, add counselorId
                const existingUserDoc = userSnapshot.docs[0];
                const existingCounselorIds = existingUserDoc.data().counselorIds || [];
                if (!existingCounselorIds.includes(user.uid)) {
                    await setDocumentNonBlocking(existingUserDoc.ref, { counselorIds: [...existingCounselorIds, user.uid] }, { merge: true });
                    toast({ title: "Client ajouté", description: `${request.name} existait déjà et a été ajouté à votre liste de clients.` });
                } else {
                    toast({ title: "Déjà client", description: `${request.name} est déjà dans votre liste de clients.` });
                }
            } else {
                // User does not exist, create new user
                const newUserRef = doc(collection(firestore, 'users'));
                const [firstName, ...lastNameParts] = request.name.split(' ');
                await setDocumentNonBlocking(newUserRef, {
                    id: newUserRef.id,
                    firstName: firstName || 'Nouveau',
                    lastName: lastNameParts.join(' ') || 'Client',
                    email: request.email,
                    phone: request.phone || '',
                    role: 'membre',
                    dateJoined: new Date().toISOString(),
                    origin: `Live du ${new Date(request.liveDate).toLocaleDateString('fr-FR')}`,
                    counselorIds: [user.uid]
                });
                toast({ title: "Client créé et ajouté", description: `Un nouveau profil pour ${request.name} a été créé et ajouté à vos clients.` });
            }

            // Delete the follow-up request
            await deleteDocumentNonBlocking(doc(firestore, 'live_follow_up_requests', request.id));

        } catch (error) {
            console.error("Conversion failed:", error);
            toast({ title: 'Erreur de conversion', description: 'Une erreur est survenue.', variant: 'destructive' });
        } finally {
            setIsConverting(null);
        }
    };
    
    const isLoading = isUserLoading || isUserDataLoading || areRequestsLoading || isAgencyLoading;

    const renderTable = (requests: FollowUpRequest[], isProcessedTab: boolean) => {
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
                    {isProcessedTab ? (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isConverting === request.id}>
                                    {isConverting === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleConvertToClient(request)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Convertir en client
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setRequestToDelete(request)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
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
        <>
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
                                    {renderTable(newRequests, false)}
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
                                    {renderTable(processedRequests, true)}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>

            <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la demande ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La demande de {requestToDelete?.name} sera définitivement supprimée.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive hover:bg-destructive/90">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
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
