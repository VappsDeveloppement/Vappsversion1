

'use client';

import React from 'react';
import { useUser } from '@/firebase';
import { NewQuoteForm } from '@/components/shared/new-quote-form';
import { QuotesList } from '@/components/shared/quotes-list';
import { InvoicesList } from '@/components/shared/invoices-list';
import { ContractManagement } from '@/components/shared/contract-management';
import { PlanManagement } from '@/components/shared/plan-management';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BillingPage() {
    const { user } = useUser();
    const isConseiller = user?.role === 'conseiller' || user?.role === 'superadmin';

    if (!user) {
        return <div>Chargement...</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Facturation & Devis</h1>
                <p className="text-muted-foreground">
                    Gérez vos devis, factures, contrats et modèles de prestations.
                </p>
            </div>
            <Tabs defaultValue="quotes">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                    <TabsTrigger value="quotes">Devis</TabsTrigger>
                    <TabsTrigger value="invoices">Factures</TabsTrigger>
                    <TabsTrigger value="contracts">Contrats</TabsTrigger>
                    <TabsTrigger value="plans">Prestations</TabsTrigger>
                </TabsList>
                <TabsContent value="quotes">
                    <QuotesList />
                </TabsContent>
                <TabsContent value="invoices">
                    <InvoicesList />
                </TabsContent>
                <TabsContent value="contracts">
                    <ContractManagement />
                </TabsContent>
                <TabsContent value="plans">
                    <PlanManagement />
                </TabsContent>
            </Tabs>
        </div>
    );
}
