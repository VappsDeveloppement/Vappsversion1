
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Star, FlaskConical } from "lucide-react";
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';

type User = {
    id: string;
    role: 'conseiller' | 'membre' | 'superadmin';
    planId?: string;
    subscriptionStatus?: 'active' | 'cancelled' | 'trial';
};

type BetaTestResult = {
    id: string;
};

type Plan = {
    id: string;
    name: string;
};

function AdminStats() {
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

    const betaTestsQuery = useMemoFirebase(() => query(collection(firestore, 'beta_tests_results')), [firestore]);
    const { data: betaTests, isLoading: areBetaTestsLoading } = useCollection<BetaTestResult>(betaTestsQuery);
    
    // Note: This assumes plans are managed within the 'agencies' document, which is standard for the platform.
    const plansQuery = useMemoFirebase(() => query(collection(firestore, 'plans')), [firestore]);
    const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(plansQuery);
    
    const stats = useMemo(() => {
        if (!users || !plans) {
            return {
                totalUsers: 0,
                totalCounselors: 0,
                mostActivePlan: 'N/A',
                totalBetaTests: 0,
            };
        }

        const totalUsers = users.length;
        const counselors = users.filter(u => u.role === 'conseiller');
        const totalCounselors = counselors.length;

        const planCounts = counselors
            .filter(c => c.subscriptionStatus === 'active' && c.planId)
            .reduce((acc, c) => {
                acc[c.planId!] = (acc[c.planId!] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        const mostActivePlanId = Object.keys(planCounts).reduce((a, b) => planCounts[a] > planCounts[b] ? a : b, '');
        const mostActivePlanName = plans.find(p => p.id === mostActivePlanId)?.name || 'N/A';

        return {
            totalUsers,
            totalCounselors,
            mostActivePlan: mostActivePlanName,
            totalBetaTests: betaTests?.length || 0,
        };
    }, [users, plans, betaTests]);

    const isLoading = areUsersLoading || areBetaTestsLoading || arePlansLoading;

    return (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilisateurs Total</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats.totalUsers}</div>}
                    <p className="text-xs text-muted-foreground">Nombre total de comptes.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conseillers Inscrits</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats.totalCounselors}</div>}
                    <p className="text-xs text-muted-foreground">Nombre de comptes conseillers.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Abonnement Populaire</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{stats.mostActivePlan}</div>}
                    <p className="text-xs text-muted-foreground">Le plan le plus souscrit.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tests Réalisés</CardTitle>
                    <FlaskConical className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                     {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats.totalBetaTests}</div>}
                    <p className="text-xs text-muted-foreground">Nombre de tests bêta soumis.</p>
                </CardContent>
            </Card>
        </div>
    )
}


export default function AdminDashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
                <p className="text-muted-foreground">Platform overview and key metrics.</p>
            </div>
            
            <AdminStats />
            
        </div>
    );
}
