
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, FileText, FileSignature, Receipt } from "lucide-react";
import { PlanManagement } from '@/components/shared/plan-management';
import { ContractManagement } from "@/components/shared/contract-management";
import { QuoteManagement } from "@/components/shared/quote-management";
import { InvoiceManagement } from "@/components/shared/invoice-management";

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Facturation</h1>
        <p className="text-muted-foreground">
          Gérez votre catalogue de prestations, contrats, devis et factures.
        </p>
      </div>

      <Tabs defaultValue="quotes" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="quotes">
            <FileSignature className="mr-2 h-4 w-4" /> Devis
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="mr-2 h-4 w-4" /> Factures
          </TabsTrigger>
          <TabsTrigger value="plans">
            <CreditCard className="mr-2 h-4 w-4" /> Prestations
          </TabsTrigger>
          <TabsTrigger value="contracts">
            <FileText className="mr-2 h-4 w-4" /> Contrats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotes">
          <QuoteManagement />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoiceManagement />
        </TabsContent>
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Catalogue de Prestations</CardTitle>
              <CardDescription>
                Créez et gérez les modèles de prestations que vous proposerez dans vos devis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlanManagement />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>Modèles de Contrats</CardTitle>
              <CardDescription>
                Créez et gérez les modèles de contrats que vous associerez à vos prestations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContractManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
