
'use client';

import React, { useState } from 'react';
import { useCollection, useMemoFirebase, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MoreHorizontal, Trash2, Clock } from 'lucide-react';
import type { Plan } from './plan-management';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type SubscribedUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    planId: string;
    subscriptionStatus: 'pending_payment' | 'active' | 'cancelled' | 'trial';
    dateJoined: string;
};

const statusVariant: Record<SubscribedUser['subscriptionStatus'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_payment: 'outline',
  active: 'default',
  cancelled: 'destructive',
  trial: 'secondary',
};

const statusText: Record<SubscribedUser['subscriptionStatus'], string> = {
  pending_payment: 'En attente de paiement',
  active: 'Actif',
  cancelled: 'Annulé',
  trial: 'Essai',
};

export function ValidatedContractsList() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [userToModify, setUserToModify] = useState<SubscribedUser | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);


    const subscribedUsersQuery = useMemoFirebase(() => 
        query(collection(firestore, 'users'), where('planId', '!=', '')),
        [firestore]
    );
    const { data: users, isLoading: areUsersLoading } = useCollection<SubscribedUser>(subscribedUsersQuery);

    const plansQuery = useMemoFirebase(() => 
        query(collection(firestore, 'plans')),
        [firestore]
    );
    const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(plansQuery);

    const plansMap = React.useMemo(() => {
        if (!plans) return new Map<string, Plan>();
        return new Map(plans.map(plan => [plan.id, plan]));
    }, [plans]);

    const handleSetPending = (user: SubscribedUser) => {
        const userRef = doc(firestore, 'users', user.id);
        setDocumentNonBlocking(userRef, { subscriptionStatus: 'pending_payment' }, { merge: true });
        toast({ title: 'Statut mis à jour', description: `L'abonnement de ${user.firstName} ${user.lastName} est maintenant "En attente de paiement".` });
    };

    const handleDeleteClick = (user: SubscribedUser) => {
        setUserToModify(user);
        setIsDialogOpen(true);
    };
    
    const handleDeleteConfirm = () => {
        if (!userToModify) return;
        const userRef = doc(firestore, 'users', userToModify.id);
        setDocumentNonBlocking(userRef, { subscriptionStatus: '', planId: '' }, { merge: true });
        toast({ title: 'Abonnement supprimé', description: `L'abonnement de ${userToModify.firstName} ${userToModify.lastName} a été retiré.` });
        setIsDialogOpen(false);
        setUserToModify(null);
    }

    const isLoading = areUsersLoading || arePlansLoading;

    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle>Liste des Contrats Signés et Abonnements</CardTitle>
                <CardDescription>
                    Suivi des abonnements des utilisateurs et de leur statut de paiement.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Plan Souscrit</TableHead>
                            <TableHead>Statut du Paiement</TableHead>
                            <TableHead>Date de souscription</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={5}>
                                        <Skeleton className="h-8 w-full" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : users && users.length > 0 ? (
                            users.map((user) => {
                                const plan = plansMap.get(user.planId);
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </TableCell>
                                        <TableCell>{plan?.name || 'Plan inconnu'}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant[user.subscriptionStatus] || 'secondary'}>
                                                {statusText[user.subscriptionStatus] || user.subscriptionStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.dateJoined ? new Date(user.dateJoined).toLocaleDateString('fr-FR') : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleSetPending(user)}>
                                                        <Clock className="mr-2 h-4 w-4" />
                                                        Mettre en attente
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(user)}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <AlertCircle className="h-10 w-10 text-muted-foreground"/>
                                        <p className="text-muted-foreground">Aucun contrat signé ou abonnement en cours.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action va retirer l'abonnement pour <strong>{userToModify?.firstName} {userToModify?.lastName}</strong>. Les champs `planId` et `subscriptionStatus` seront effacés. Cette action est irréversible.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setUserToModify(null)}>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Confirmer la suppression</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}
