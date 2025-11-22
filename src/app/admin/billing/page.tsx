
'use client';

import React from 'react';
import { useUser } from '@/firebase';
import { ContractManagement } from '@/components/shared/contract-management';
import { PlanManagement } from '@/components/shared/plan-management';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ValidatedContractsList } from '@/components/shared/validated-contracts-list';

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
                    Gérez les plans d'abonnement, les modèles de contrats et les contrats signés.
                </p>
            </div>
            <Tabs defaultValue="plans">
                <TabsList className="grid w-full grid-cols-3 h-auto">
                    <TabsTrigger value="plans">Plans d'abonnement</TabsTrigger>
                    <TabsTrigger value="contracts">Contrats</TabsTrigger>
                    <TabsTrigger value="validated-contracts">Contrats Signés</TabsTrigger>
                </TabsList>
                <TabsContent value="plans">
                    <PlanManagement />
                </TabsContent>
                <TabsContent value="contracts">
                    <ContractManagement />
                </TabsContent>
                <TabsContent value="validated-contracts">
                    <ValidatedContractsList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
