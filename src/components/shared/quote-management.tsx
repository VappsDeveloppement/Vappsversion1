
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Edit, Trash2, Loader2, MoreHorizontal, Send, FileSignature, Check, ChevronsUpDown, FileDown } from 'lucide-react';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, getDocs, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { useAgency } from '@/context/agency-provider';
import type { Plan } from '@/components/shared/plan-management';
import type { Contract } from '@/components/shared/contract-management';
import { sendQuote } from '@/app/actions/quote';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const quoteItemSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "La description est requise."),
    quantity: z.coerce.number().min(1, "La quantité doit être d'au moins 1."),
    unitPrice: z.coerce.number().min(0, "Le prix unitaire doit être positif."),
    total: z.coerce.number(),
});

const clientInfoSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Le nom du client est requis."),
    email: z.string().email("L'email du client est invalide."),
    address: z.string().optional(),
    zipCode: z.string().optional(),
    city: z.string().optional(),
});

const quoteFormSchema = z.object({
    clientInfo: clientInfoSchema,
    issueDate: z.date({ required_error: "La date d'émission est requise."}),
    expiryDate: z.date().optional(),
    items: z.array(quoteItemSchema).min(1, "Le devis doit contenir au moins une prestation."),
    notes: z.string().optional(),
    contractId: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteFormSchema>;

export type Quote = {
    id: string;
    quoteNumber: string;
    counselorId: string;
    clientInfo: z.infer<typeof clientInfoSchema>;
    issueDate: string;
    expiryDate?: string | null;
    items: z.infer<typeof quoteItemSchema>[];
    subtotal: number;
    tax: number;
    total: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected';
    notes?: string;
    contractId?: string;
    contractTitle?: string | null;
    agencyInfo?: any;
    validationCode: string;
    contractContent?: string;
    signedDate?: string;
    signature?: string;
};

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    address?: string;
    zipCode?: string;
    city?: string;
    counselorIds?: string[];
}

const statusVariant: Record<Quote['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    sent: 'outline',
    accepted: 'default',
    rejected: 'destructive',
};
const statusText: Record<Quote['status'], string> = {
    draft: 'Brouillon',
    sent: 'Envoyé',
    accepted: 'Accepté',
    rejected: 'Refusé',
};

const generateValidationCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const generatePdfClientSide = async (quote: Quote, legalInfo: any) => {
    // Dynamically import jspdf and autotable to avoid server-side issues
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const text = (value: string | null | undefined, fallback = '') => value || fallback;
    const isVatSubject = legalInfo?.isVatSubject ?? false;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text(text(legalInfo?.commercialName) || text(legalInfo?.companyName), 15, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(text(legalInfo?.address) || text(legalInfo?.addressStreet), 15, 26);
    doc.text(`${text(legalInfo?.zipCode) || text(legalInfo?.addressZip)} ${text(legalInfo?.city) || text(legalInfo?.addressCity)}`, 15, 31);
    doc.text(text(legalInfo?.email), 15, 36);

    doc.setFontSize(28);
    doc.setTextColor(150);
    doc.text('DEVIS', 200, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`N°: ${text(quote.quoteNumber)}`, 200, 30, { align: 'right' });
    doc.text(`Date: ${new Date(quote.issueDate).toLocaleDateString('fr-FR')}`, 200, 35, { align: 'right' });
    if (quote.expiryDate) {
        doc.text(`Valide jusqu'au: ${new Date(quote.expiryDate).toLocaleDateString('fr-FR')}`, 200, 40, { align: 'right' });
    }

    // Client info
    doc.setDrawColor(230);
    doc.line(15, 48, 200, 48);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('CLIENT', 15, 55);
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(text(quote.clientInfo.name), 15, 62);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(text(quote.clientInfo.email), 15, 67);
    if (text(quote.clientInfo.address) || text(quote.clientInfo.zipCode) || text(quote.clientInfo.city)) {
      doc.text(text(quote.clientInfo.address), 15, 72);
      doc.text(`${text(quote.clientInfo.zipCode)} ${text(quote.clientInfo.city)}`, 15, 77);
    }

    // Table
    autoTable(doc, {
        startY: 80,
        head: [['Description', 'Qté', 'P.U. HT', 'Total HT']],
        body: quote.items.map(item => [
            text(item.description),
            item.quantity,
            `${item.unitPrice.toFixed(2)} €`,
            `${(item.quantity * item.unitPrice).toFixed(2)} €`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [248, 250, 252], textColor: 100, fontStyle: 'bold' },
        styles: { cellPadding: 3, fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 95 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
        }
    });
    
    let finalY = (doc as any).lastAutoTable.finalY;

    // Totals
    const totals = [['Sous-total HT', `${quote.subtotal.toFixed(2)} €`]];
    if (isVatSubject) {
        totals.push([`TVA (${quote.tax}%)`, `${(quote.subtotal * quote.tax / 100).toFixed(2)} €`]);
    }
    totals.push([`Total ${isVatSubject ? 'TTC' : ''}`, `${quote.total.toFixed(2)} €`]);

    autoTable(doc, {
        startY: finalY + 10,
        body: totals,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 0: { halign: 'right', fontStyle: 'bold' }, 1: { halign: 'right', cellWidth: 40 } },
        didParseCell: (data) => {
            if (data.row.index === totals.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 12;
            }
        }
    });

    finalY = (doc as any).lastAutoTable.finalY;
    
    // Notes
    if (quote.notes) {
        finalY += 15;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Notes', 15, finalY);
        finalY += 5;
        doc.setFontSize(10);
        doc.setTextColor(100);
        const notesLines = doc.splitTextToSize(text(quote.notes), 180);
        doc.text(notesLines, 15, finalY);
    }
    
    // Contract
    if (quote.contractContent) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(text(quote.contractTitle, "Contrat"), 15, 20);

        let y = 35;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text(quote.contractContent);
        const textContent = tempDiv.textContent || '';
        
        const lines = doc.splitTextToSize(textContent, 180);
        doc.text(lines, 15, y);
    }

    // Footer for all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerText = `${text(legalInfo?.commercialName) || text(legalInfo?.companyName)} - ${text(legalInfo?.address) || text(legalInfo?.addressStreet)}, ${text(legalInfo?.zipCode) || text(legalInfo?.addressZip)} ${text(legalInfo?.city) || text(legalInfo?.addressCity)}`;
        const footerText2 = `SIRET: ${text(legalInfo?.siret)} - ${isVatSubject ? `TVA: ${text(legalInfo?.vatNumber)}` : 'TVA non applicable, art. 293 B du CGI'}`;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(footerText, 105, 285, { align: 'center' });
        doc.text(footerText2, 105, 290, { align: 'center' });
    }

    doc.save(`devis-${quote.quoteNumber}.pdf`);
}

export function QuoteManagement() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { personalization, agency, isLoading: isAgencyLoading } = useAgency();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const quotesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/quotes`));
    }, [user, firestore]);
    const { data: quotes, isLoading: areQuotesLoading } = useCollection<Quote>(quotesQuery);
    
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: currentUserData, isLoading: isCurrentUserDataLoading } = useDoc(userDocRef);

    const clientsQuery = useMemoFirebase(() => {
        if(!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);

    const plansQuery = useMemoFirebase(() => {
        if(!user) return null;
        return query(collection(firestore, 'plans'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(plansQuery);

    const contractsQuery = useMemoFirebase(() => {
        if(!user) return null;
        return query(collection(firestore, 'contracts'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: contracts, isLoading: areContractsLoading } = useCollection<Contract>(contractsQuery);

    const form = useForm<QuoteFormData>({
        resolver: zodResolver(quoteFormSchema),
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        if (isSheetOpen) {
            if (editingQuote) {
                form.reset({
                    clientInfo: editingQuote.clientInfo,
                    issueDate: new Date(editingQuote.issueDate),
                    expiryDate: editingQuote.expiryDate ? new Date(editingQuote.expiryDate) : undefined,
                    items: editingQuote.items,
                    notes: editingQuote.notes,
                    contractId: editingQuote.contractId
                });
            } else {
                form.reset({
                    clientInfo: { name: '', email: '' },
                    issueDate: new Date(),
                    items: [],
                    notes: '',
                    contractId: '',
                });
            }
        }
    }, [isSheetOpen, editingQuote, form]);
    
    const handleNewQuote = () => {
        setEditingQuote(null);
        setIsSheetOpen(true);
    };

    const handleEditQuote = (quote: Quote) => {
        setEditingQuote(quote);
        setIsSheetOpen(true);
    };
    
    const handleDeleteQuote = (quote: Quote) => {
        if (!user) return;
        const quoteRef = doc(firestore, `users/${user.uid}/quotes`, quote.id);
        const publicQuoteRef = doc(firestore, 'quotes', quote.id);
        
        const batch = writeBatch(firestore);
        batch.delete(quoteRef);
        batch.delete(publicQuoteRef);

        batch.commit().then(() => {
            toast({ title: "Devis supprimé" });
        }).catch(err => {
            toast({ title: "Erreur", description: "Impossible de supprimer le devis.", variant: 'destructive'});
        });
    };

    const onSubmit = async (data: QuoteFormData) => {
        if (!user || !currentUserData) return;
        setIsSubmitting(true);
        
        let subtotal = 0;
        data.items.forEach(item => {
            subtotal += item.quantity * item.unitPrice;
        });
        
        const isVatSubject = currentUserData.isVatSubject ?? false;
        const taxRate = isVatSubject ? (currentUserData.vatRate ?? 0) : 0;
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax;

        const agencyInfo = {
            companyName: currentUserData.commercialName || `${currentUserData.firstName} ${currentUserData.lastName}`,
            address: currentUserData.address || '',
            zipCode: currentUserData.zipCode || '',
            city: currentUserData.city || '',
            email: currentUserData.contactEmail || currentUserData.email || '',
            phone: currentUserData.phone || '',
            siret: currentUserData.siret || '',
            isVatSubject: isVatSubject,
            vatRate: taxRate,
            vatNumber: currentUserData.vatNumber || '',
        };

        const contract = contracts?.find(c => c.id === data.contractId);

        let quoteNumber = editingQuote?.quoteNumber;
        if (!quoteNumber) {
            const quotesCollectionRef = collection(firestore, `users/${user.uid}/quotes`);
            const q = query(quotesCollectionRef);
            const querySnapshot = await getDocs(q);
            const prefix = `DEVIS-${new Date().getFullYear()}-`;
            quoteNumber = `${prefix}${(querySnapshot.size + 1).toString().padStart(4, '0')}`;
        }
        
        const quoteData = {
            quoteNumber,
            counselorId: user.uid,
            clientInfo: data.clientInfo,
            issueDate: data.issueDate.toISOString(),
            expiryDate: data.expiryDate ? data.expiryDate.toISOString() : null,
            items: data.items,
            subtotal,
            tax: taxRate,
            total,
            status: editingQuote?.status || 'draft',
            notes: data.notes,
            contractId: data.contractId,
            contractTitle: contract?.title || null,
            agencyInfo: agencyInfo,
            validationCode: editingQuote?.validationCode || generateValidationCode(),
            contractContent: contract?.content || '',
        };

        try {
            const quoteRef = editingQuote ? doc(firestore, `users/${user.uid}/quotes`, editingQuote.id) : doc(collection(firestore, `users/${user.uid}/quotes`));
            const publicQuoteRef = doc(firestore, 'quotes', quoteRef.id);
            const finalQuoteData = { ...quoteData, id: quoteRef.id };

            const batch = writeBatch(firestore);
            batch.set(quoteRef, finalQuoteData, { merge: true });
            batch.set(publicQuoteRef, finalQuoteData, { merge: true });

            await batch.commit();

            toast({ title: editingQuote ? "Devis mis à jour" : "Devis créé" });
            setIsSheetOpen(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: "Impossible de sauvegarder le devis.", variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSendQuote = async (quote: Quote) => {
        const emailSettings = currentUserData?.emailSettings;
        if (!emailSettings?.fromEmail || !emailSettings?.fromName || !emailSettings?.contactEmail) {
            toast({ title: "Erreur de configuration", description: "Vos nom, e-mail d'expéditeur et e-mail de contact sont requis. Veuillez les renseigner dans vos paramètres.", variant: "destructive"});
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await sendQuote({
                quote,
                emailSettings: emailSettings,
                legalInfo: quote.agencyInfo
            });
            if (result.success) {
                const quoteRef = doc(firestore, `users/${user!.uid}/quotes`, quote.id);
                const publicQuoteRef = doc(firestore, 'quotes', quote.id);
                const batch = writeBatch(firestore);
                batch.update(quoteRef, { status: 'sent' });
                batch.update(publicQuoteRef, { status: 'sent' });
                await batch.commit();
                toast({ title: 'Devis envoyé', description: 'Le devis a été envoyé au client.' });
            } else {
                toast({ title: 'Erreur', description: result.error, variant: 'destructive'});
            }
        } catch (e) {
            toast({ title: 'Erreur', description: "Impossible d'envoyer le devis.", variant: 'destructive'});
        }
        setIsSubmitting(false);
    }
    
    const handleExportPdf = async (quote: Quote) => {
        if (!currentUserData) {
            toast({ title: "Erreur de configuration", description: "Les informations de l'utilisateur n'ont pas pu être chargées.", variant: "destructive"});
            return;
        }
        setIsSubmitting(true);
        try {
            await generatePdfClientSide(quote, quote.agencyInfo);
            toast({ title: 'PDF exporté', description: 'Le téléchargement du devis a commencé.' });
        } catch (e) {
            console.error(e)
            toast({ title: 'Erreur', description: "Impossible de générer le PDF du devis.", variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = areQuotesLoading || isCurrentUserDataLoading;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Devis</CardTitle>
                        <CardDescription>Créez, envoyez et suivez vos devis.</CardDescription>
                    </div>
                    <Button onClick={handleNewQuote}><PlusCircle className="mr-2 h-4 w-4" />Nouveau Devis</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Numéro</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                        : quotes && quotes.length > 0 ? (
                            quotes.map(quote => (
                                <TableRow key={quote.id}>
                                    <TableCell>{quote.quoteNumber}</TableCell>
                                    <TableCell>{quote.clientInfo.name}</TableCell>
                                    <TableCell>{quote.total.toFixed(2)}€</TableCell>
                                    <TableCell><Badge variant={statusVariant[quote.status]}>{statusText[quote.status]}</Badge></TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleSendQuote(quote)} disabled={['accepted', 'rejected'].includes(quote.status) || isSubmitting}>
                                                    <Send className="mr-2 h-4 w-4" /> Renvoyer
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleExportPdf(quote)} disabled={isSubmitting}>
                                                    <FileDown className="mr-2 h-4 w-4" /> Exporter PDF
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditQuote(quote)} disabled={quote.status !== 'draft'}>
                                                    <Edit className="mr-2 h-4 w-4" /> Modifier
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteQuote(quote)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center">Aucun devis pour le moment.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
                 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-4xl w-full flex flex-col">
                        <SheetHeader>
                            <SheetTitle>{editingQuote ? 'Modifier le' : 'Nouveau'} devis</SheetTitle>
                            <SheetDescription>Créez un nouveau devis pour un de vos clients.</SheetDescription>
                        </SheetHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
                                <ScrollArea className="flex-1 pr-6 -mr-6">
                                    <div className="space-y-8 py-4">
                                        {/* Client Info */}
                                        <ClientSelector clients={clients || []} onClientSelect={(client) => form.setValue('clientInfo', client)} isLoading={areClientsLoading}/>
                                        
                                        {/* Items */}
                                        <div>
                                            <h3 className="text-lg font-medium mb-4">Prestations</h3>
                                            <div className="space-y-4">
                                                {fields.map((field, index) => (
                                                    <div key={field.id} className="flex gap-4 items-end p-4 border rounded-md">
                                                        <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => ( <FormItem className="flex-1"><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => ( <FormItem className="w-20"><FormLabel>Qté</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                        <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field }) => ( <FormItem className="w-28"><FormLabel>P.U.</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <PlanSelector plans={plans || []} onSelectPlan={(plan) => append({id: plan.id, description: plan.name, quantity: 1, unitPrice: plan.price, total: plan.price})} isLoading={arePlansLoading} />
                                        </div>
                                        
                                        {/* Contract & Notes */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <FormField control={form.control} name="contractId" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Contrat (Optionnel)</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger disabled={areContractsLoading}><SelectValue placeholder="Associer un contrat" /></SelectTrigger></FormControl>
                                                        <SelectContent>{contracts?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}/>
                                        </div>
                                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem> )}/>
                                    </div>
                                </ScrollArea>
                                <SheetFooter className="pt-6 border-t mt-auto">
                                    <SheetClose asChild><Button type="button" variant="outline">Annuler</Button></SheetClose>
                                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Sauvegarder</Button>
                                </SheetFooter>
                            </form>
                        </Form>
                    </SheetContent>
                </Sheet>
            </CardContent>
        </Card>
    );
}

function ClientSelector({ clients, onClientSelect, isLoading }: { clients: Client[], onClientSelect: (client: Client) => void, isLoading: boolean }) {
    const [open, setOpen] = useState(false)
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const handleSelect = (client: Client) => {
        setSelectedClient(client);
        onClientSelect({
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email,
            address: client.address,
            zipCode: client.zipCode,
            city: client.city,
        });
        setOpen(false);
    }
    
    return (
        <div>
            <h3 className="text-lg font-medium mb-4">Client</h3>
            {isLoading ? <Skeleton className="h-10 w-full" /> : (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                        {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : "Sélectionner un client..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Rechercher un client..." />
                        <CommandList>
                            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                            <CommandGroup>
                                {clients.map((client) => (
                                    <CommandItem key={client.id} value={client.email} onSelect={() => handleSelect(client)}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedClient?.id === client.id ? "opacity-100" : "opacity-0")}/>
                                        <div>
                                            <p>{client.firstName} {client.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{client.email}</p>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            )}
        </div>
    )
}

function PlanSelector({ plans, onSelectPlan, isLoading }: { plans: Plan[], onSelectPlan: (plan: Plan) => void, isLoading: boolean }) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="mt-4"><PlusCircle className="mr-2 h-4 w-4" />Ajouter une prestation</Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
                <Command>
                    <CommandInput placeholder="Rechercher une prestation..." />
                    <CommandList>
                        <CommandEmpty>Aucune prestation trouvée.</CommandEmpty>
                        <CommandGroup>
                            {isLoading ? <p className="p-4 text-sm">Chargement...</p> :
                                plans.map((plan) => (
                                    <CommandItem key={plan.id} onSelect={() => { onSelectPlan(plan); setOpen(false); }}>
                                        <span>{plan.name}</span>
                                        <span className="ml-auto text-muted-foreground">{plan.price}€</span>
                                    </CommandItem>
                                ))
                            }
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

  