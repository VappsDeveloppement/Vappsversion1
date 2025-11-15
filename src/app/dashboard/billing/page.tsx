

'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, FileText, ScrollText } from "lucide-react";
import { PlanManagement } from "@/components/shared/plan-management";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function BillingPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Facturation & Devis</h1>
                <p className="text-muted-foreground">Gérez vos plans, contrats, devis et factures.</p>
            </div>

            <Tabs defaultValue="plans">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="plans">Plans</TabsTrigger>
                    <TabsTrigger value="contracts">Contrats</TabsTrigger>
                    <TabsTrigger value="quotes">Devis</TabsTrigger>
                    <TabsTrigger value="invoices">Factures</TabsTrigger>
                </TabsList>

                <TabsContent value="plans">
                    <PlanManagement />
                </TabsContent>

                <TabsContent value="contracts">
                     <Card>
                        <CardHeader>
                             <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Gestion des Contrats</CardTitle>
                                    <CardDescription>Créez et gérez vos modèles de contrats.</CardDescription>
                                </div>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Nouveau Contrat
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-96">
                                <ScrollText className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-semibold">Éditeur de Contrats</h3>
                                <p className="text-muted-foreground mt-2 max-w-2xl">L'outil de création et de gestion de contrats sera disponible ici.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="quotes">
                     <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Gestion des Devis</CardTitle>
                                    <CardDescription>Créez, envoyez et suivez vos devis.</CardDescription>
                                </div>
                                <Button asChild>
                                  <Link href="/dashboard/billing/quote/new">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Nouveau Devis
                                  </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>N° Devis</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Montant</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Aucun devis trouvé.
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="invoices">
                    <Card>
                        <CardHeader>
                             <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Gestion des Factures</CardTitle>
                                    <CardDescription>Créez, envoyez et suivez vos factures.</CardDescription>
                                </div>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Nouvelle Facture
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>N° Facture</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Date d'émission</TableHead>
                                        <TableHead>Montant</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Aucune facture trouvée.
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
