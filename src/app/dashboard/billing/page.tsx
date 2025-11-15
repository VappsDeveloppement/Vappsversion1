
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
import { useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { QuotePDF } from '@/components/shared/quote-pdf';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Quote = {
    id: string;
    quoteNumber: string;
    clientInfo: { name: string; id: string; email: string; };
    issueDate: string;
    expiryDate?: string;
    total: number;
    subtotal: number;
    tax: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected';
    items: any[];
    notes?: string;
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
    const [editingQuote, setEditingQuote] = React.useState<Quote | null>(null);
    const [quoteToDelete, setQuoteToDelete] = React.useState<Quote | null>(null);
    const [quoteToExport, setQuoteToExport] = React.useState<Quote | null>(null);
    const { agency, isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();
    const { toast } = useToast();
    const pdfRef = React.useRef<HTMLDivElement>(null);


    const quotesQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return collection(firestore, 'agencies', agency.id, 'quotes');
    }, [agency, firestore]);

    const { data: quotes, isLoading: areQuotesLoading } = useCollection<Quote>(quotesQuery);
    
    const isLoading = isAgencyLoading || areQuotesLoading;
    
    const handleEdit = (quote: Quote) => {
        setEditingQuote(quote);
        setIsQuoteFormOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!quoteToDelete || !agency) return;
        try {
            const quoteDocRef = doc(firestore, "agencies", agency.id, "quotes", quoteToDelete.id);
            await deleteDocumentNonBlocking(quoteDocRef);
            toast({ title: "Devis supprimé", description: "Le devis a été supprimé." });
        } catch (error) {
            console.error("Error deleting quote:", error);
            toast({ title: "Erreur", description: "Impossible de supprimer le devis.", variant: "destructive" });
        } finally {
            setQuoteToDelete(null);
        }
    };
    
    const handleOpenChange = (open: boolean) => {
        setIsQuoteFormOpen(open);
        if (!open) {
            setEditingQuote(null);
        }
    }

    const handleExportPDF = (quote: Quote) => {
        setQuoteToExport(quote);
    };

    React.useEffect(() => {
        if (quoteToExport && pdfRef.current) {
            html2canvas(pdfRef.current, { scale: 3 }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / canvasHeight;
                const width = pdfWidth;
                const height = width / ratio;
                pdf.addImage(imgData, 'PNG', 0, 0, width, height > pdfHeight ? pdfHeight : height);
                pdf.save(`devis-${quoteToExport.quoteNumber}.pdf`);
                setQuoteToExport(null);
            });
        }
    }, [quoteToExport]);


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
                                <Dialog open={isQuoteFormOpen} onOpenChange={handleOpenChange}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Nouveau Devis
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                                        <DialogHeader>
                                            <DialogTitle>{editingQuote ? 'Modifier le Devis' : 'Nouveau Devis'}</DialogTitle>
                                        </DialogHeader>
                                        <div className="flex-1 overflow-y-auto pr-6 -mr-6">
                                            <NewQuoteForm 
                                              setOpen={setIsQuoteFormOpen} 
                                              initialData={editingQuote}
                                            />
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
                                                            <DropdownMenuItem onClick={() => handleEdit(quote)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Modifier
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleExportPDF(quote)}>
                                                                <FileText className="mr-2 h-4 w-4" />
                                                                Exporter en PDF
                                                            </DropdownMenuItem>
                                                             <DropdownMenuItem className="text-destructive" onClick={() => setQuoteToDelete(quote)}>
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
            <AlertDialog open={!!quoteToDelete} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce devis ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le devis <strong>{quoteToDelete?.quoteNumber}</strong> sera définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setQuoteToDelete(null)}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div style={{ position: 'fixed', left: '-2000px', top: 0 }}>
              {quoteToExport && <QuotePDF ref={pdfRef} quote={quoteToExport} />}
            </div>
        </div>
    );
}
