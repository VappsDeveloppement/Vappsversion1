
'use client';

import React, { useMemo } from 'react';
import { useAgency } from '@/context/agency-provider';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, FileText, Receipt, ArrowRight, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

type User = {
  id: string;
  role: 'prospect' | 'membre' | 'admin' | 'conseiller';
  status?: 'new' | 'contacted' | 'not_interested';
};

type Membership = {
    id: string;
    userId: string;
    agencyId: string;
    role: 'admin' | 'dpo' | 'conseiller' | 'membre';
}

type Quote = {
  id: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
};

type Invoice = {
  id: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
};

const StatCard = ({ title, value, description, icon: Icon, isLoading }: { title: string, value: string | number, description?: string, icon: React.ElementType, isLoading: boolean }) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-1/4" />
                    {description && <Skeleton className="h-4 w-3/4 mt-2" />}
                </CardContent>
            </Card>
        )
    }
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
};

const MultiStatCard = ({ title, stats, icon: Icon, isLoading }: { title: string, stats: {label: string, value: number}[], icon: React.ElementType, isLoading: boolean }) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent className="pt-4">
                   <div className="space-y-4">
                       <div className="flex justify-between items-center">
                           <Skeleton className="h-4 w-2/3" />
                           <Skeleton className="h-6 w-1/4" />
                       </div>
                       <div className="flex justify-between items-center">
                           <Skeleton className="h-4 w-2/3" />
                           <Skeleton className="h-6 w-1/4" />
                       </div>
                   </div>
                </CardContent>
            </Card>
        );
    }
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-2">
                    {stats.map(stat => (
                        <div key={stat.label} className="flex justify-between items-baseline">
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                            <p className="text-xl font-bold">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};


const ConversionCard = ({ title, description, total, converted, conversionRate, isLoading, fromLabel, toLabel }: { title: string, description: string, total: number, converted: number, conversionRate: number, isLoading: boolean, fromLabel: string, toLabel: string }) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        )
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-around items-center text-center">
                    <div>
                        <p className="text-3xl font-bold">{total}</p>
                        <p className="text-sm text-muted-foreground">{fromLabel}</p>
                    </div>
                    <ArrowRight className="h-8 w-8 text-muted-foreground" />
                    <div>
                        <p className="text-3xl font-bold">{converted}</p>
                        <p className="text-sm text-muted-foreground">{toLabel}</p>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Taux de conversion</span>
                        <span className="text-sm font-medium text-primary">{conversionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={conversionRate} className="w-full" />
                </div>
            </CardContent>
        </Card>
    )
}


export default function DashboardPage() {
    const { agency, isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

    const membershipsQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return query(collection(firestore, 'memberships'), where('agencyId', '==', agency.id));
    }, [agency, firestore]);
    const { data: memberships, isLoading: areMembershipsLoading } = useCollection<Membership>(membershipsQuery);
    
    const agencyMembers = useMemo(() => {
        if (!memberships || !allUsers) return [];
        const memberIds = new Set(memberships.filter(m => m.role === 'membre').map(m => m.userId));
        return allUsers.filter(u => memberIds.has(u.id));
    }, [memberships, allUsers]);

    const quotesQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return collection(firestore, 'agencies', agency.id, 'quotes');
    }, [agency, firestore]);

    const invoicesQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return collection(firestore, 'agencies', agency.id, 'invoices');
    }, [agency, firestore]);

    const { data: quotes, isLoading: areQuotesLoading } = useCollection<Quote>(quotesQuery);
    const { data: invoices, isLoading: areInvoicesLoading } = useCollection<Invoice>(invoicesQuery);

    const isLoading = isAgencyLoading || areUsersLoading || areMembershipsLoading || areQuotesLoading || areInvoicesLoading;
    
    const newProspectsCount = allUsers?.filter(p => p.role === 'prospect' && p.status === 'new').length || 0;
    const totalMembersCount = agencyMembers.length;
    
    const unvalidatedQuotesCount = quotes?.filter(q => q.status === 'draft' || q.status === 'sent').length || 0;
    const unpaidInvoicesCount = invoices?.filter(i => i.status === 'pending' || i.status === 'overdue').length || 0;

    const totalLeads = allUsers?.filter(u => u.role === 'prospect' || u.role === 'membre').length || 0;
    const prospectToMemberConversion = totalLeads > 0 ? (totalMembersCount / totalLeads) * 100 : 0;
    
    const quoteToInvoiceConversion = (quotes?.length || 0) > 0 ? ((invoices?.length || 0) / (quotes?.length || 0)) * 100 : 0;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Tableau de bord</h1>
                <p className="text-muted-foreground">Voici un aperçu de votre activité commerciale.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <StatCard 
                    title="Nouveaux Prospects"
                    value={newProspectsCount}
                    description="Demandes en attente de traitement."
                    icon={Users}
                    isLoading={isLoading}
                />
                <MultiStatCard
                    title="Actions en attente"
                    stats={[
                        { label: "Devis non validés", value: unvalidatedQuotesCount },
                        { label: "Factures non réglées", value: unpaidInvoicesCount },
                    ]}
                    icon={Wallet}
                    isLoading={isLoading}
                />
                <ConversionCard
                    title="Conversion Prospects → Membres"
                    description="Performance de la transformation des prospects en membres."
                    total={totalLeads}
                    converted={totalMembersCount}
                    fromLabel="Prospects"
                    toLabel="Membres"
                    conversionRate={prospectToMemberConversion}
                    isLoading={isLoading}
                />
                 <ConversionCard
                    title="Conversion Devis → Factures"
                    description="Performance de la transformation des devis en factures."
                    total={quotes?.length || 0}
                    converted={invoices?.length || 0}
                    fromLabel="Devis"
                    toLabel="Factures"
                    conversionRate={quoteToInvoiceConversion}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}
