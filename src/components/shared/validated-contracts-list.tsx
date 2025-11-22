
'use client';

import React from 'react';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import type { Plan } from './plan-management';

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

    const isLoading = areUsersLoading || arePlansLoading;

    return (
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={4}>
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
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
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
    );
}
