
'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, FileText, ScrollText, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { PlanManagement } from "@/components/shared/plan-management";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewQuoteForm } from '@/components/shared/new-quote-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAgency } from '@/context/agency-provider';
import { useFirestore } from '@/firebase/provider';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type Quote = {
    id: string;
    quoteNumber: string;
    clientInfo: { name: string };
    issueDate: string;
    total: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected';
}

const statusVariant: Record<Quote['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    sent: 'default',
    accepted: 'default',
    rejected: 'destructive',
};
const statusText: Record<Quote['status'], string> = {
    draft: 'Brouillon',
    sent: 'Envoyé',
    accepted: 'Accepté',
    rejected: 'Refusé',
};


export default function BillingPage() {
    const [isQuoteFormOpen, setIsQuoteFormOpen] = React.useState(false);
    const { agency, isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();

    const quotesQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return collection(firestore, 'agencies', agency.id, 'quotes');
    }, [agency, firestore]);

    const { data: quotes, isLoading: areQuotesLoading } = useCollection<Quote>(quotesQuery);
    
    const isLoading = isAgencyLoading || areQuotesLoading;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Facturation & Devis</h1>
                <p className="text-muted-foreground">Gérez vos plans, contrats, devis et factures.</p>
            </div>

            <Tabs defaultValue="quotes">
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
                                <Dialog open={isQuoteFormOpen} onOpenChange={setIsQuoteFormOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Nouveau Devis
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                                        <DialogHeader>
                                            <DialogTitle>Nouveau Devis</DialogTitle>
                                        </DialogHeader>
                                        <div className="flex-1 overflow-y-auto pr-6 -mr-6">
                                            <NewQuoteForm setOpen={setIsQuoteFormOpen} />
                                        </div>
                                    </DialogContent>
                                </Dialog>
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
                                     {isLoading ? (
                                        [...Array(3)].map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                                            </TableRow>
                                        ))
                                     ) : quotes && quotes.length > 0 ? (
                                        quotes.map((quote) => (
                                            <TableRow key={quote.id}>
                                                <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                                                <TableCell>{quote.clientInfo.name}</TableCell>
                                                <TableCell>{new Date(quote.issueDate).toLocaleDateString('fr-FR')}</TableCell>
                                                <TableCell>{quote.total.toFixed(2)} €</TableCell>
                                                <TableCell>
                                                    <Badge variant={statusVariant[quote.status]}>
                                                        {statusText[quote.status]}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Modifier
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                <FileText className="mr-2 h-4 w-4" />
                                                                Exporter en PDF
                                                            </DropdownMenuItem>
                                                             <DropdownMenuItem className="text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Supprimer
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                     ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                Aucun devis trouvé.
                                            </TableCell>
                                        </TableRow>
                                     )}
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
