

'use client';

import React from 'react';
import { useUser } from '@/firebase';
import { ContractManagement } from '@/components/shared/contract-management';
import { PlanManagement } from '@/components/shared/plan-management';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminBillingPage() {
    const { user } = useUser();

    if (!user) {
        return <div>Chargement...</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Abonnements</h1>
                <p className="text-muted-foreground">
                    Gérez les plans d'abonnement de la plateforme et les modèles de contrats.
                </p>
            </div>
            <Tabs defaultValue="plans">
                <TabsList className="grid w-full grid-cols-2 h-auto">
                    <TabsTrigger value="plans">Plans d'abonnement</TabsTrigger>
                    <TabsTrigger value="contracts">Contrats</TabsTrigger>
                </TabsList>
                <TabsContent value="plans">
                    <PlanManagement />
                </TabsContent>
                <TabsContent value="contracts">
                    <ContractManagement />
                </TabsContent>
            </Tabs>
        </div>
    );
}
