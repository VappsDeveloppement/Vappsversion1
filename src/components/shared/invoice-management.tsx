
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
import { PlusCircle, Edit, Trash2, Loader2, MoreHorizontal, Send, ChevronsUpDown, Check, CheckCircle } from 'lucide-react';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, getDocs, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { useAgency } from '@/context/agency-provider';
import type { Plan } from '@/components/shared/plan-management';
import { sendInvoice } from '@/app/actions/invoice';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

const invoiceItemSchema = z.object({
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

const invoiceFormSchema = z.object({
    clientInfo: clientInfoSchema,
    issueDate: z.date({ required_error: "La date d'émission est requise."}),
    dueDate: z.date({ required_error: "La date d'échéance est requise."}),
    items: z.array(invoiceItemSchema).min(1, "La facture doit contenir au moins une prestation."),
    notes: z.string().optional(),
    quoteNumber: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

export type Invoice = {
    id: string;
    invoiceNumber: string;
    counselorId: string;
    clientInfo: z.infer<typeof clientInfoSchema>;
    issueDate: string;
    dueDate: string;
    items: z.infer<typeof invoiceItemSchema>[];
    subtotal: number;
    tax: number;
    total: number;
    status: 'pending_payment' | 'paid' | 'late' | 'cancelled';
    notes?: string;
    quoteNumber?: string;
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

const statusVariant: Record<Invoice['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending_payment: 'outline',
    paid: 'default',
    late: 'destructive',
    cancelled: 'secondary',
};
const statusText: Record<Invoice['status'], string> = {
    pending_payment: 'En attente',
    paid: 'Payée',
    late: 'En retard',
    cancelled: 'Annulée',
};


export function InvoiceManagement() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { personalization, agency, isLoading: isAgencyLoading } = useAgency();

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: currentUserData, isLoading: isCurrentUserDataLoading } = useDoc(userDocRef);

    const invoicesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/invoices`));
    }, [user, firestore]);
    
    const { data: invoices, isLoading: areInvoicesLoading } = useCollection<Invoice>(invoicesQuery);
    
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


    const form = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceFormSchema),
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        if (isSheetOpen) {
            if (editingInvoice) {
                form.reset({
                    clientInfo: editingInvoice.clientInfo,
                    issueDate: new Date(editingInvoice.issueDate),
                    dueDate: new Date(editingInvoice.dueDate),
                    items: editingInvoice.items,
                    notes: editingInvoice.notes,
                    quoteNumber: editingInvoice.quoteNumber,
                });
            } else {
                const issueDate = new Date();
                const dueDate = new Date();
                dueDate.setDate(issueDate.getDate() + 30);
                form.reset({
                    clientInfo: { name: '', email: '' },
                    issueDate,
                    dueDate,
                    items: [],
                    notes: '',
                    quoteNumber: '',
                });
            }
        }
    }, [isSheetOpen, editingInvoice, form]);
    
    const handleNewInvoice = () => {
        setEditingInvoice(null);
        setIsSheetOpen(true);
    };

    const handleEditInvoice = (invoice: Invoice) => {
        setEditingInvoice(invoice);
        setIsSheetOpen(true);
    };
    
    const handleDeleteInvoice = (invoiceId: string) => {
        if (!user) return;
        const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, invoiceId);
        deleteDocumentNonBlocking(invoiceRef);
        toast({ title: "Facture supprimée" });
    };

    const onSubmit = async (data: InvoiceFormData) => {
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

        let invoiceNumber = editingInvoice?.invoiceNumber;
        if (!invoiceNumber) {
            const invoicesCollectionRef = collection(firestore, `users/${user.uid}/invoices`);
            const q = query(invoicesCollectionRef);
            const querySnapshot = await getDocs(q);
            const prefix = `FACT-${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-`;
            invoiceNumber = `${prefix}${(querySnapshot.size + 1).toString().padStart(4, '0')}`;
        }
        
        const invoiceData: Omit<Invoice, 'id'> = {
            invoiceNumber,
            counselorId: user.uid,
            clientInfo: data.clientInfo,
            issueDate: data.issueDate.toISOString(),
            dueDate: data.dueDate.toISOString(),
            items: data.items,
            subtotal,
            tax: taxRate,
            total,
            status: editingInvoice?.status || 'pending_payment',
            notes: data.notes,
            quoteNumber: data.quoteNumber,
        };

        try {
            const invoiceRef = editingInvoice ? doc(firestore, `users/${user.uid}/invoices`, editingInvoice.id) : doc(collection(firestore, `users/${user.uid}/invoices`));
            await setDoc(invoiceRef, { ...invoiceData, id: invoiceRef.id }, { merge: true });

            toast({ title: editingInvoice ? "Facture mise à jour" : "Facture créée" });
            setIsSheetOpen(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: "Impossible de sauvegarder la facture.", variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSendInvoice = async (invoice: Invoice) => {
        const emailSettingsToUse = (currentUserData?.emailSettings && currentUserData.emailSettings.fromEmail)
          ? currentUserData.emailSettings
          : personalization?.emailSettings;

        if (!emailSettingsToUse?.fromEmail || !emailSettingsToUse?.fromName) {
            toast({ title: "Erreur de configuration", description: "Votre nom et e-mail d'expéditeur sont requis. Veuillez les renseigner dans vos paramètres.", variant: "destructive"});
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await sendInvoice({
                invoice: invoice,
                emailSettings: emailSettingsToUse,
                legalInfo: currentUserData,
                paymentSettings: currentUserData.paymentSettings || personalization.paymentSettings,
            });
            if (result.success) {
                toast({ title: 'Facture envoyée', description: 'La facture a été envoyée au client.' });
            } else {
                toast({ title: 'Erreur', description: result.error, variant: 'destructive'});
            }
        } catch (e) {
            toast({ title: 'Erreur', description: "Impossible d'envoyer la facture.", variant: 'destructive'});
        }
        setIsSubmitting(false);
    }
    
    const handleUpdateStatus = async (invoiceId: string, status: Invoice['status']) => {
        if (!user) return;
        const invoiceRef = doc(firestore, `users/${user.uid}/invoices`, invoiceId);
        try {
            await setDocumentNonBlocking(invoiceRef, { status }, { merge: true });
            toast({ title: 'Statut mis à jour', description: `La facture est maintenant marquée comme "${statusText[status]}".` });
        } catch (e) {
            toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
        }
    };
    
    const isLoading = areInvoicesLoading || isCurrentUserDataLoading;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Factures</CardTitle>
                            <CardDescription>Consultez, gérez et créez vos factures.</CardDescription>
                        </div>
                        <Button onClick={handleNewInvoice}><PlusCircle className="mr-2 h-4 w-4" />Nouvelle Facture</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Numéro</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Échéance</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)
                            : invoices && invoices.length > 0 ? (
                                invoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>{invoice.invoiceNumber}</TableCell>
                                        <TableCell>{invoice.clientInfo.name}</TableCell>
                                        <TableCell>{invoice.total.toFixed(2)}€</TableCell>
                                        <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                                        <TableCell><Badge variant={statusVariant[invoice.status]}>{statusText[invoice.status]}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'paid')} disabled={invoice.status === 'paid'}>
                                                        <CheckCircle className="mr-2 h-4 w-4" /> Marquer comme payée
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleSendInvoice(invoice)} disabled={isSubmitting}>
                                                        <Send className="mr-2 h-4 w-4" /> (Ré)envoyer par e-mail
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Modifier
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteInvoice(invoice.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center">Aucune facture pour le moment.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetContent className="sm:max-w-4xl w-full flex flex-col">
                            <SheetHeader>
                                <SheetTitle>{editingInvoice ? 'Modifier la' : 'Nouvelle'} facture</SheetTitle>
                                <SheetDescription>Créez une nouvelle facture pour un de vos clients.</SheetDescription>
                            </SheetHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
                                    <ScrollArea className="flex-1 pr-6 -mr-6">
                                        <div className="space-y-8 py-4">
                                            <ClientSelector 
                                                clients={clients || []} 
                                                onClientSelect={(client) => form.setValue('clientInfo', client)} 
                                                isLoading={areClientsLoading}
                                                defaultValue={editingInvoice?.clientInfo}
                                            />
                                            <div className="grid grid-cols-2 gap-6">
                                                <FormField control={form.control} name="issueDate" render={({ field }) => ( <FormItem><FormLabel>Date d'émission</FormLabel><FormControl><Input type="date" value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                                <FormField control={form.control} name="dueDate" render={({ field }) => ( <FormItem><FormLabel>Date d'échéance</FormLabel><FormControl><Input type="date" value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                            </div>
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
                                            <FormField control={form.control} name="quoteNumber" render={({ field }) => ( <FormItem><FormLabel>N° de devis de référence (optionnel)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )}/>
                                            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes (optionnel)</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem> )}/>
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
        </>
    );
}

type ClientSelectorProps = {
    clients: Client[];
    onClientSelect: (client: z.infer<typeof clientInfoSchema>) => void;
    isLoading: boolean;
    defaultValue?: z.infer<typeof clientInfoSchema>;
};

function ClientSelector({ clients, onClientSelect, isLoading, defaultValue }: ClientSelectorProps) {
    const [open, setOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<z.infer<typeof clientInfoSchema> | null>(defaultValue || null);

    useEffect(() => {
        if (defaultValue) {
            setSelectedClient(defaultValue);
        }
    }, [defaultValue]);

    const handleSelect = (client: Client) => {
        const clientInfo = {
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email,
            address: client.address,
            zipCode: client.zipCode,
            city: client.city,
        };
        setSelectedClient(clientInfo);
        onClientSelect(clientInfo);
        setOpen(false);
    }
    
    return (
        <div>
            <h3 className="text-lg font-medium mb-4">Client</h3>
            {isLoading ? <Skeleton className="h-10 w-full" /> : (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                        {selectedClient?.name ? selectedClient.name : "Sélectionner un client..."}
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

    