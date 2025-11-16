

'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, FileText, ScrollText, MoreHorizontal, Edit, Trash2, Loader2, Send, CreditCard, Eye } from "lucide-react";
import { PlanManagement } from "@/components/shared/plan-management";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewQuoteForm } from '@/components/shared/new-quote-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAgency } from '@/context/agency-provider';
import { useFirestore } from '@/firebase/provider';
import { useCollection, useMemoFirebase, deleteDocumentNonBlocking, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { sendInvoice } from '@/app/actions/invoice';


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
    contractId?: string;
    contractContent?: string;
    contractTitle?: string;
}

type Invoice = {
    id: string;
    invoiceNumber: string;
    clientInfo: { name: string; id: string; email: string; };
    issueDate: string;
    dueDate: string;
    total: number;
    subtotal: number;
    tax: number;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    items: any[];
    quoteNumber: string;
}

type Contract = {
    id: string;
    title: string;
    content: string;
    agencyId: string;
}

const contractSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.'),
  content: z.string().min(50, 'Le contenu doit avoir au moins 50 caractères.'),
});
type ContractFormData = z.infer<typeof contractSchema>;


const statusVariantQuote: Record<Quote['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    sent: 'default',
    accepted: 'default',
    rejected: 'destructive',
};
const statusTextQuote: Record<Quote['status'], string> = {
    draft: 'Brouillon',
    sent: 'Envoyé',
    accepted: 'Accepté',
    rejected: 'Refusé',
};

const statusVariantInvoice: Record<Invoice['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    paid: 'default',
    overdue: 'destructive',
    cancelled: 'destructive',
};

const statusTextInvoice: Record<Invoice['status'], string> = {
    pending: 'En attente',
    paid: 'Payée',
    overdue: 'En retard',
    cancelled: 'Annulée',
};


const ContractManager = () => {
    const { agency, isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    
    const contractsCollectionRef = useMemoFirebase(() => {
        if (!agency) return null;
        return collection(firestore, 'agencies', agency.id, 'contracts');
    }, [agency, firestore]);
    
    const { data: contracts, isLoading: areContractsLoading } = useCollection<Contract>(contractsCollectionRef);
    
    const form = useForm<ContractFormData>({
        resolver: zodResolver(contractSchema),
        defaultValues: { title: '', content: '' },
    });

    const handleNew = () => {
        setEditingContract(null);
        form.reset({ title: '', content: '' });
        setIsSheetOpen(true);
    };

    const handleEdit = (contract: Contract) => {
        setEditingContract(contract);
        form.reset({ title: contract.title, content: contract.content });
        setIsSheetOpen(true);
    };

    const handleDelete = (contractId: string) => {
        if (!agency) return;
        const contractDocRef = doc(firestore, 'agencies', agency.id, 'contracts', contractId);
        deleteDocumentNonBlocking(contractDocRef);
        toast({ title: 'Contrat supprimé', description: 'Le modèle de contrat a été supprimé.' });
    };

    const onSubmit = async (data: ContractFormData) => {
        if (!agency) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Agence non trouvée.' });
            return;
        }
        setIsSubmitting(true);
        
        const contractData = { ...data, agencyId: agency.id };

        try {
            if (editingContract) {
                const contractDocRef = doc(firestore, 'agencies', agency.id, 'contracts', editingContract.id);
                await setDocumentNonBlocking(contractDocRef, contractData, { merge: true });
                toast({ title: 'Contrat mis à jour', description: 'Le modèle de contrat a été mis à jour.' });
            } else {
                await addDocumentNonBlocking(contractsCollectionRef!, contractData);
                toast({ title: 'Contrat créé', description: 'Le nouveau modèle de contrat a été créé.' });
            }
            setIsSheetOpen(false);
            setEditingContract(null);
            form.reset();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Une erreur est survenue.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = isAgencyLoading || areContractsLoading;

    return (
         <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Gestion des Contrats</CardTitle>
                        <CardDescription>Créez et gérez vos modèles de contrats.</CardDescription>
                    </div>
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button onClick={handleNew}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nouveau Modèle
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
                            <SheetHeader>
                                <SheetTitle>{editingContract ? 'Modifier le Modèle' : 'Nouveau Modèle de Contrat'}</SheetTitle>
                            </SheetHeader>
                             <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-6">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Titre du contrat</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ex: Contrat de Prestation de Service" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="content"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Contenu du contrat</FormLabel>
                                                <FormControl>
                                                    <RichTextEditor
                                                        content={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Rédigez le contenu de votre contrat ici..."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <SheetFooter className="pt-6">
                                        <SheetClose asChild>
                                            <Button type="button" variant="outline">Annuler</Button>
                                        </SheetClose>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {editingContract ? 'Sauvegarder' : 'Créer le modèle'}
                                        </Button>
                                    </SheetFooter>
                                </form>
                            </Form>
                        </SheetContent>
                    </Sheet>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Titre</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                     <TableBody>
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={2}><Skeleton className="h-5 w-full" /></TableCell>
                                </TableRow>
                            ))
                         ) : contracts && contracts.length > 0 ? (
                            contracts.map((contract) => (
                                <TableRow key={contract.id}>
                                    <TableCell className="font-medium">{contract.title}</TableCell>
                                    <TableCell className="text-right">
                                       <Button variant="ghost" size="icon" onClick={() => handleEdit(contract)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(contract.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                         ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                    Aucun modèle de contrat trouvé.
                                </TableCell>
                            </TableRow>
                         )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}



export default function BillingPage() {
    const [isQuoteFormOpen, setIsQuoteFormOpen] = React.useState(false);
    const [editingQuote, setEditingQuote] = React.useState<Quote | null>(null);
    const [quoteToDelete, setQuoteToDelete] = React.useState<Quote | null>(null);
    const { agency, isLoading: isAgencyLoading, personalization } = useAgency();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSending, setIsSending] = React.useState<string | null>(null);

    const quotesQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return collection(firestore, 'agencies', agency.id, 'quotes');
    }, [agency, firestore]);

    const { data: quotes, isLoading: areQuotesLoading } = useCollection<Quote>(quotesQuery);
    
    const invoicesQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return collection(firestore, 'agencies', agency.id, 'invoices');
    }, [agency, firestore]);
    const { data: invoices, isLoading: areInvoicesLoading } = useCollection<Invoice>(invoicesQuery);
    
    const isLoading = isAgencyLoading || areQuotesLoading || areInvoicesLoading;
    
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
    
    const generateInvoicePdf = (invoice: Invoice, legalInfo: any) => {
        const doc = new jsPDF();
        const isVatSubject = legalInfo?.isVatSubject ?? false;

        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text(legalInfo?.companyName || 'VApps', 15, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(legalInfo?.addressStreet || '', 15, 26);
        doc.text(`${legalInfo?.addressZip || ''} ${legalInfo?.addressCity || ''}`, 15, 31);
        doc.text(legalInfo?.email || '', 15, 36);

        doc.setFontSize(28);
        doc.setTextColor(150);
        doc.text('FACTURE', 200, 20, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`N°: ${invoice.invoiceNumber}`, 200, 30, { align: 'right' });
        doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString('fr-FR')}`, 200, 35, { align: 'right' });
        doc.text(`Échéance: ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`, 200, 40, { align: 'right' });
        doc.text(`Ref Devis: ${invoice.quoteNumber}`, 200, 45, { align: 'right' });

        doc.setDrawColor(230);
        doc.line(15, 53, 200, 53);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('FACTURÉ À', 15, 60);
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text(invoice.clientInfo.name, 15, 67);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(invoice.clientInfo.email, 15, 72);

        autoTable(doc, {
            startY: 85,
            head: [['Description', 'Qté', 'P.U. HT', 'Total HT']],
            body: invoice.items.map(item => [
                item.description,
                item.quantity,
                `${item.unitPrice.toFixed(2)} €`,
                `${(item.quantity * item.unitPrice).toFixed(2)} €`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: 100, fontStyle: 'bold' },
            styles: { cellPadding: 3, fontSize: 10 },
            columnStyles: {
                0: { cellWidth: 95 }, 1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' },
            }
        });
        
        let finalY = (doc as any).lastAutoTable.finalY;

        const totals = [
            ['Sous-total HT', `${invoice.subtotal.toFixed(2)} €`],
        ];
        if (isVatSubject) {
            totals.push([`TVA (${invoice.tax}%)`, `${(invoice.subtotal * (invoice.tax / 100)).toFixed(2)} €`]);
        }
        totals.push([`Total à régler ${isVatSubject ? 'TTC' : ''}`, `${invoice.total.toFixed(2)} €`]);

        autoTable(doc, {
            startY: finalY + 10,
            body: totals,
            theme: 'plain', styles: { fontSize: 10 },
            columnStyles: { 0: { halign: 'right', fontStyle: 'bold' }, 1: { halign: 'right', cellWidth: 40 } },
            didParseCell: (data) => {
                if (data.row.index === totals.length - 1) {
                    data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = 12;
                }
            }
        });

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const footerText = `${legalInfo?.companyName || ''} - ${legalInfo?.addressStreet || ''}, ${legalInfo?.addressZip || ''} ${legalInfo?.addressCity || ''}`;
            const footerText2 = `SIRET: ${legalInfo?.siret || ''} - ${isVatSubject ? `TVA: ${legalInfo?.vatNumber || ''}` : 'TVA non applicable, art. 293 B du CGI'}`;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(footerText, 105, 285, { align: 'center' });
            doc.text(footerText2, 105, 290, { align: 'center' });
        }
        
        return doc;
    };
    
    const handleViewInvoice = (invoice: Invoice) => {
        if (!personalization) return;
        const doc = generateInvoicePdf(invoice, personalization.legalInfo);
        doc.output('dataurlnewwindow');
    };

    const handleExportInvoicePDF = (invoice: Invoice) => {
        if (!personalization) return;
        const doc = generateInvoicePdf(invoice, personalization.legalInfo);
        doc.save(`facture-${invoice.invoiceNumber}.pdf`);
    };

    const handleResendInvoice = async (invoice: Invoice) => {
        if (!personalization || !agency) return;
        setIsSending(invoice.id);
        const result = await sendInvoice({
            invoice,
            emailSettings: personalization.emailSettings,
            legalInfo: personalization.legalInfo,
            paymentSettings: personalization.paymentSettings,
        });
        if (result.success) {
            toast({ title: 'Facture renvoyée', description: `La facture ${invoice.invoiceNumber} a été renvoyée.` });
        } else {
            toast({ title: "Erreur d'envoi", description: result.error, variant: 'destructive' });
        }
        setIsSending(null);
    };

    const handleMarkAsPaid = async (invoice: Invoice) => {
        if (!agency) return;
        const invoiceRef = doc(firestore, 'agencies', agency.id, 'invoices', invoice.id);
        await setDocumentNonBlocking(invoiceRef, { status: 'paid' }, { merge: true });
        toast({ title: 'Statut mis à jour', description: 'La facture a été marquée comme payée.' });
    };

    const handleExportQuotePDF = (quote: Quote) => {
        const doc = new jsPDF();
        const { legalInfo } = personalization;
        const isVatSubject = legalInfo?.isVatSubject ?? false;

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text(legalInfo?.companyName || 'VApps', 15, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(legalInfo?.addressStreet || '', 15, 26);
        doc.text(`${legalInfo?.addressZip || ''} ${legalInfo?.addressCity || ''}`, 15, 31);
        doc.text(legalInfo?.email || '', 15, 36);

        doc.setFontSize(28);
        doc.setTextColor(150);
        doc.text('DEVIS', 200, 20, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`N°: ${quote.quoteNumber}`, 200, 30, { align: 'right' });
        doc.text(`Date: ${new Date(quote.issueDate).toLocaleDateString('fr-FR')}`, 200, 35, { align: 'right' });
        if (quote.expiryDate) {
            doc.text(`Valide jusqu'au: ${new Date(quote.expiryDate).toLocaleDateString('fr-FR')}`, 200, 40, { align: 'right' });
        }

        // Client info
        doc.setDrawColor(230);
        doc.line(15, 48, 200, 48);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('FACTURÉ À', 15, 55);
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text(quote.clientInfo.name, 15, 62);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(quote.clientInfo.email, 15, 67);

        // Table
        autoTable(doc, {
            startY: 80,
            head: [['Description', 'Qté', 'P.U. HT', 'Total HT']],
            body: quote.items.map(item => [
                item.description,
                item.quantity,
                `${item.unitPrice.toFixed(2)} €`,
                `${(item.quantity * item.unitPrice).toFixed(2)} €`
            ]),
            theme: 'grid',
            headStyles: {
                fillColor: [248, 250, 252],
                textColor: 100,
                fontStyle: 'bold',
            },
            styles: {
                cellPadding: 3,
                fontSize: 10,
            },
            columnStyles: {
                0: { cellWidth: 95 },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 30, halign: 'right' },
            }
        });
        
        const finalY = (doc as any).lastAutoTable.finalY;

        // Totals
        const totals = [
            ['Sous-total HT', `${quote.subtotal.toFixed(2)} €`],
        ];
        if (isVatSubject) {
            totals.push([`TVA (${quote.tax}%)`, `${(quote.subtotal * (quote.tax / 100)).toFixed(2)} €`]);
        }
        totals.push([`Total ${isVatSubject ? 'TTC' : ''}`, `${quote.total.toFixed(2)} €`]);

        autoTable(doc, {
            startY: finalY + 10,
            body: totals,
            theme: 'plain',
            styles: { fontSize: 10 },
            columnStyles: {
                0: { halign: 'right', fontStyle: 'bold' },
                1: { halign: 'right', cellWidth: 40 },
            },
            didParseCell: (data) => {
                if (data.row.index === totals.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = 12;
                }
            }
        });

        // Notes
        let currentY = (doc as any).lastAutoTable.finalY + 15;
        if (quote.notes) {
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text('Notes', 15, currentY);
            currentY += 5;
            doc.setFontSize(10);
            doc.setTextColor(100);
            const notesLines = doc.splitTextToSize(quote.notes, 180);
            doc.text(notesLines, 15, currentY);
            currentY += (notesLines.length * 5) + 5;
        }

        // Add contract
        if (quote.contractContent) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(quote.contractTitle || "Contrat", 15, 20);

            // This is a simplified HTML renderer. For complex HTML, a more robust library would be needed.
            // We use the 'splitTextToSize' to handle basic text wrapping.
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = quote.contractContent;
            
            // To simulate rendering for jspdf:
            // This is a very basic conversion and won't handle complex CSS or layouts.
            let y = 35;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40);
            const textContent = tempDiv.innerText || "";
            const lines = doc.splitTextToSize(textContent, 180);
            doc.text(lines, 15, y);
        }

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const footerText = `${legalInfo?.companyName || ''} - ${legalInfo?.addressStreet || ''}, ${legalInfo?.addressZip || ''} ${legalInfo?.addressCity || ''}`;
            const footerText2 = `SIRET: ${legalInfo?.siret || ''} - ${isVatSubject ? `TVA: ${legalInfo?.vatNumber || ''}` : 'TVA non applicable, art. 293 B du CGI'}`;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(footerText, 105, 285, { align: 'center' });
            doc.text(footerText2, 105, 290, { align: 'center' });
        }

        doc.save(`devis-${quote.quoteNumber}.pdf`);
    };


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
                     <ContractManager />
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
                                                    <Badge variant={statusVariantQuote[quote.status]}>
                                                        {statusTextQuote[quote.status]}
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
                                                            <DropdownMenuItem onClick={() => handleExportQuotePDF(quote)}>
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
                                    <CardDescription>Consultez et gérez vos factures.</CardDescription>
                                </div>
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
                                    {isLoading ? (
                                        [...Array(3)].map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : invoices && invoices.length > 0 ? (
                                        invoices.map((invoice) => (
                                            <TableRow key={invoice.id}>
                                                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                                <TableCell>{invoice.clientInfo.name}</TableCell>
                                                <TableCell>{new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</TableCell>
                                                <TableCell>{invoice.total.toFixed(2)} €</TableCell>
                                                <TableCell>
                                                    <Badge variant={statusVariantInvoice[invoice.status]}>
                                                        {statusTextInvoice[invoice.status]}
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
                                                            <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                Voir la facture
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleExportInvoicePDF(invoice)}>
                                                                <FileText className="mr-2 h-4 w-4" />
                                                                Exporter en PDF
                                                            </DropdownMenuItem>
                                                             {invoice.status === 'pending' && (
                                                                <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                                                                    <CreditCard className="mr-2 h-4 w-4" />
                                                                    Marquer comme payée
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => handleResendInvoice(invoice)} disabled={isSending === invoice.id}>
                                                                {isSending === invoice.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                                                Renvoyer par e-mail
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                Aucune facture trouvée.
                                            </TableCell>
                                        </TableRow>
                                    )}
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
        </div>
    );
}
