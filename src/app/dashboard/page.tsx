
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useAgency } from '@/context/agency-provider';
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, useDoc, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, MoreHorizontal, PhoneForwarded, Trash2, UserPlus, Loader2, Search, Mail, MessageSquare, TrendingUp, Users, FileText, Receipt, Calendar as CalendarIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DateRange } from "react-day-picker";
import { addDays, format, subDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Quote } from '@/components/shared/quote-management';
import type { Invoice } from '@/components/shared/invoice-management';
import type { Client } from '@/app/dashboard/clients/page';


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


const statusVariant: Record<FollowUpRequest['status'] | TrainingRequest['status'], 'default' | 'secondary' | 'destructive'> = {
  new: 'destructive',
  processed: 'secondary',
};

const statusText: Record<FollowUpRequest['status'] | TrainingRequest['status'], string> = {
  new: 'Nouveau',
  processed: 'Traité',
};


function DashboardStats() {
    const { user } = useUser();
    const firestore = useFirestore();

    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 29),
        to: new Date(),
    });

    const quotesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/quotes`));
    }, [user, firestore]);

    const invoicesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/invoices`));
    }, [user, firestore]);
    
    const clientsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: quotes, isLoading: areQuotesLoading } = useCollection<Quote>(quotesQuery);
    const { data: invoices, isLoading: areInvoicesLoading } = useCollection<Invoice>(invoicesQuery);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
    
    const stats = useMemo(() => {
        const from = date?.from;
        const to = date?.to;

        const filteredQuotes = quotes?.filter(q => {
            const quoteDate = new Date(q.issueDate);
            if(from && to) return quoteDate >= from && quoteDate <= to;
            return true;
        }) || [];

        const filteredInvoices = invoices?.filter(i => {
            const invoiceDate = new Date(i.issueDate);
             if(from && to) return invoiceDate >= from && invoiceDate <= to;
            return true;
        }) || [];

        const pendingQuotesAmount = filteredQuotes
            .filter(q => q.status === 'sent' || q.status === 'draft')
            .reduce((sum, q) => sum + q.total, 0);
        
        const paidInvoicesAmount = filteredInvoices
            .filter(i => i.status === 'paid')
            .reduce((sum, i) => sum + i.total, 0);
            
        const acceptedQuotes = filteredQuotes.filter(q => q.status === 'accepted').length;
        const totalSentQuotes = filteredQuotes.filter(q => q.status === 'accepted' || q.status === 'rejected' || q.status === 'sent').length;
        const conversionRate = totalSentQuotes > 0 ? (acceptedQuotes / totalSentQuotes) * 100 : 0;
        
        const clientCount = clients?.length || 0;

        return {
            pendingQuotesAmount,
            paidInvoicesAmount,
            conversionRate,
            clientCount
        }

    }, [quotes, invoices, clients, date]);
    
    const isLoading = areQuotesLoading || areInvoicesLoading || areClientsLoading;

    const StatCard = ({ title, value, icon, description, loading }: { title: string, value: string, icon: React.ReactNode, description: string, loading: boolean }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                {loading ? <Skeleton className="h-8 w-3/4 mt-1" /> : <div className="text-2xl font-bold">{value}</div>}
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );

    return (
         <div className="space-y-4">
             <div className="flex justify-end">
                  <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                        date.to ? (
                            <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(date.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Choisir une date</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Devis en attente"
                    value={`${stats.pendingQuotesAmount.toFixed(2)}€`}
                    description="Montant total des devis en statut 'brouillon' ou 'envoyé'."
                    icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                    loading={isLoading}
                />
                 <StatCard
                    title="Factures Encaissées"
                    value={`${stats.paidInvoicesAmount.toFixed(2)}€`}
                    description="Montant total des factures marquées comme 'payées'."
                    icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
                    loading={isLoading}
                />
                 <StatCard
                    title="Taux de Conversion"
                    value={`${stats.conversionRate.toFixed(1)}%`}
                    description="Pourcentage de devis acceptés."
                    icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                    loading={isLoading}
                />
                 <StatCard
                    title="Nombre de Clients"
                    value={stats.clientCount.toString()}
                    description="Nombre total de clients qui vous sont assignés."
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    loading={isLoading}
                />
            </div>
         </div>
    )
}


function FollowUpRequestsSection() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { agency, personalization, isLoading: isAgencyLoading } = useAgency();

    const [requestToDelete, setRequestToDelete] = useState<FollowUpRequest | null>(null);
    const [isConverting, setIsConverting] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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

    const userPlan = useMemo(() => {
        if (!userData?.planId || !personalization?.whiteLabelSection?.plans) {
          return null;
        }
        return personalization.whiteLabelSection.plans.find(p => p.id === userData.planId);
    }, [userData, personalization]);

    const showPrismeFeatures = isSuperAdmin || (userData?.role === 'conseiller' && userPlan?.hasPrismeAccess);

    const filteredRequests = useMemo(() => {
        if (!allRequests) return [];
        if (!searchTerm) return allRequests;

        const lowercasedTerm = searchTerm.toLowerCase();
        return allRequests.filter(req => 
            req.name.toLowerCase().includes(lowercasedTerm) ||
            req.email.toLowerCase().includes(lowercasedTerm)
        );
    }, [allRequests, searchTerm]);

    const newRequests = useMemo(() => {
        return filteredRequests?.filter(req => req.status === 'new').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
    }, [filteredRequests]);
    
    const processedRequests = useMemo(() => {
        return filteredRequests?.filter(req => req.status === 'processed').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
    }, [filteredRequests]);
    
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
                        {searchTerm ? "Aucun résultat pour votre recherche." : "Aucune demande dans cette catégorie."}
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

    if (!showPrismeFeatures) {
        return null;
    }

    return (
        <>
            <Card>
                <Tabs defaultValue="new">
                    <CardHeader>
                        <div className='flex flex-col md:flex-row justify-between md:items-start gap-4'>
                            <div>
                                <CardTitle>Demandes de Rappel (Live)</CardTitle>
                                <CardDescription>Demandes de suivi des participants après un événement live.</CardDescription>
                            </div>
                            <TabsList>
                                <TabsTrigger value="new">Nouvelles</TabsTrigger>
                                <TabsTrigger value="processed">Traitées</TabsTrigger>
                            </TabsList>
                        </div>
                        <div className="relative pt-4">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par nom ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
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

function TrainingRequestsSection() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [requestToView, setRequestToView] = useState<TrainingRequest | null>(null);
    const [requestToDelete, setRequestToDelete] = useState<TrainingRequest | null>(null);

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

    const handleDeleteRequest = async () => {
        if (!requestToDelete) return;
        const requestRef = doc(firestore, 'training_requests', requestToDelete.id);
        try {
            await deleteDocumentNonBlocking(requestRef);
            toast({ title: 'Demande supprimée' });
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de supprimer la demande.', variant: 'destructive'});
        } finally {
            setRequestToDelete(null);
        }
    };

    const isLoading = isUserLoading || areRequestsLoading;
    
    const renderTableRows = (requests: TrainingRequest[], isProcessedTab: boolean) => {
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setRequestToView(req)}>
                                <Mail className="mr-2 h-4 w-4" /> Voir la demande
                            </DropdownMenuItem>
                            {req.status === 'new' && (
                                <DropdownMenuItem onClick={() => handleMarkAsProcessed(req.id)}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Marquer comme traité
                                </DropdownMenuItem>
                            )}
                            {isProcessedTab && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => setRequestToDelete(req)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
        ));
    };

    return (
        <>
            <Card>
                 <Tabs defaultValue="new">
                    <CardHeader>
                        <div className='flex flex-col md:flex-row justify-between md:items-start gap-4'>
                            <div>
                                <CardTitle>Demandes de Formation</CardTitle>
                                <CardDescription>Consultez les demandes d'information pour vos formations.</CardDescription>
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
                                <TableHeader><TableRow><TableHead>Demandeur</TableHead><TableHead>Formation</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{renderTableRows(newRequests, false)}</TableBody>
                            </Table>
                        </TabsContent>
                         <TabsContent value="processed">
                             <Table>
                                <TableHeader><TableRow><TableHead>Demandeur</TableHead><TableHead>Formation</TableHead><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{renderTableRows(processedRequests, true)}</TableBody>
                            </Table>
                        </TabsContent>
                    </CardContent>
                 </Tabs>
            </Card>

            <Dialog open={!!requestToView} onOpenChange={(open) => !open && setRequestToView(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Demande pour: {requestToView?.trainingTitle}</DialogTitle>
                        <DialogDescription>Reçue le {requestToView && new Date(requestToView.createdAt).toLocaleString('fr-FR')}</DialogDescription>
                    </DialogHeader>
                    {requestToView && (
                        <div className="space-y-4 py-4 text-sm">
                            <div className="space-y-1"><Label>Nom</Label><p className="text-muted-foreground">{requestToView.name}</p></div>
                            <div className="space-y-1"><Label>Email</Label><p className="text-muted-foreground">{requestToView.email}</p></div>
                            {requestToView.phone && <div className="space-y-1"><Label>Téléphone</Label><p className="text-muted-foreground">{requestToView.phone}</p></div>}
                            {requestToView.message && (<div className="space-y-1"><Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4"/> Message</Label><p className="text-muted-foreground border bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{requestToView.message}</p></div>)}
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
            
            <DashboardStats />
            <FollowUpRequestsSection />
            <TrainingRequestsSection />

            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">D'autres statistiques et informations seront bientôt disponibles ici.</p>
            </div>
        </div>
    );
}
