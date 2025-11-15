

'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAgency } from '@/context/agency-provider';
import { useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Calendar as CalendarIcon, ChevronsUpDown, PlusCircle, Trash2, ChevronDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import type { Plan } from './plan-management';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Contract = {
    id: string;
    title: string;
    content: string;
}

type Quote = {
    id: string;
    quoteNumber: string;
    clientInfo: { name: string; id: string; email: string; };
    issueDate: string;
    expiryDate?: string;
    total: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected';
    items: any[];
    notes?: string;
    tax: number;
    contractId?: string;
    contractContent?: string;
    contractTitle?: string;
}


const quoteItemSchema = z.object({
    description: z.string().min(1, "La description est requise."),
    quantity: z.number().min(0.1, "La quantité doit être supérieure à 0."),
    unitPrice: z.number().min(0, "Le prix doit être positif."),
    total: z.number(),
});

const quoteFormSchema = z.object({
    quoteNumber: z.string().min(1, "Le numéro de devis est requis."),
    clientId: z.string().min(1, "Un client doit être sélectionné."),
    status: z.enum(["draft", "sent", "accepted", "rejected"]),
    issueDate: z.date({ required_error: "La date d'émission est requise."}),
    expiryDate: z.date().optional(),
    items: z.array(quoteItemSchema).min(1, "Le devis doit contenir au moins un article."),
    notes: z.string().optional(),
    tax: z.number().min(0),
    subtotal: z.number(),
    total: z.number(),
    contractId: z.string().optional(),
});

interface NewQuoteFormProps {
    setOpen: (open: boolean) => void;
    initialData?: Quote | null;
}


export function NewQuoteForm({ setOpen, initialData }: NewQuoteFormProps) {
    const { agency } = useAgency();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // Fetch clients
    const usersQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return query(collection(firestore, 'users'), where('agencyId', '==', agency.id), where('role', 'in', ['membre', 'prospect']));
    }, [agency, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<User>(usersQuery);

    // Fetch plans
    const plansQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return collection(firestore, 'agencies', agency.id, 'plans');
    }, [agency, firestore]);
    const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(plansQuery);
    
    // Fetch contracts
    const contractsQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return collection(firestore, 'agencies', agency.id, 'contracts');
    }, [agency, firestore]);
    const { data: contracts, isLoading: areContractsLoading } = useCollection<Contract>(contractsQuery);

    const [selectedClient, setSelectedClient] = React.useState<User | null>(null);
    const [isClientPopoverOpen, setIsClientPopoverOpen] = React.useState(false);

    const isVatSubject = agency?.personalization?.legalInfo?.isVatSubject ?? false;
    const defaultTaxRate = isVatSubject ? (parseFloat(agency?.personalization?.legalInfo?.vatRate) || 20) : 0;


    const form = useForm<z.infer<typeof quoteFormSchema>>({
        resolver: zodResolver(quoteFormSchema),
        defaultValues: initialData ? {
            ...initialData,
            clientId: initialData.clientInfo.id,
            issueDate: new Date(initialData.issueDate),
            expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate) : undefined,
        } : {
            quoteNumber: `DEVIS-${new Date().getFullYear()}-`,
            status: 'draft',
            issueDate: new Date(),
            items: [],
            notes: '',
            tax: defaultTaxRate,
            contractId: '',
        }
    });
    
    React.useEffect(() => {
        if (initialData) {
            const client = clients?.find(c => c.id === initialData.clientInfo.id);
            if (client) {
                setSelectedClient(client);
            }
            form.reset({
                ...initialData,
                clientId: initialData.clientInfo.id,
                issueDate: new Date(initialData.issueDate),
                expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate) : undefined,
                contractId: initialData.contractId || '',
            });
        } else {
             const isVatSubject = agency?.personalization?.legalInfo?.isVatSubject ?? false;
            const defaultTaxRate = isVatSubject ? (parseFloat(agency?.personalization?.legalInfo?.vatRate) || 20) : 0;
            form.setValue('tax', defaultTaxRate);
        }
    }, [initialData, agency, form, clients]);


    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const watchItems = form.watch("items");
    const watchTax = form.watch("tax");

    React.useEffect(() => {
        const subtotal = watchItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
        const total = subtotal * (1 + watchTax / 100);
        form.setValue('subtotal', subtotal);
        form.setValue('total', total);
    }, [watchItems, watchTax, form]);


    const onSubmit = async (values: z.infer<typeof quoteFormSchema>) => {
        if (!agency || !selectedClient) {
            toast({ title: "Erreur", description: "Agence ou client manquant.", variant: "destructive"});
            return;
        }

        const selectedContract = contracts?.find(c => c.id === values.contractId);

        const quoteData = {
            ...values,
            issueDate: values.issueDate.toISOString().split('T')[0], // format as YYYY-MM-DD
            expiryDate: values.expiryDate?.toISOString().split('T')[0],
            agencyId: agency.id,
            agencyInfo: agency.personalization.legalInfo,
            clientInfo: {
                id: selectedClient.id,
                name: `${selectedClient.firstName} ${selectedClient.lastName}`,
                email: selectedClient.email,
            },
            contractId: selectedContract?.id,
            contractTitle: selectedContract?.title,
            contractContent: selectedContract?.content,
        };
        
        try {
            if (initialData) {
                const quoteDocRef = doc(firestore, 'agencies', agency.id, 'quotes', initialData.id);
                await setDocumentNonBlocking(quoteDocRef, quoteData, { merge: true });
                toast({ title: "Devis mis à jour", description: "Le devis a été sauvegardé avec succès."});
            } else {
                const quotesCollectionRef = collection(firestore, 'agencies', agency.id, 'quotes');
                await addDocumentNonBlocking(quotesCollectionRef, quoteData);
                toast({ title: "Devis créé", description: "Le devis a été sauvegardé avec succès."});
            }
            setOpen(false);
        } catch (error) {
            console.error("Failed to save quote", error);
            toast({ title: "Erreur", description: "Impossible de sauvegarder le devis.", variant: "destructive"});
        }
    };

    const addPlanAsItem = (plan: Plan) => {
        append({
            description: plan.name,
            quantity: 1,
            unitPrice: plan.price,
            total: plan.price
        });
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        {/* Main Quote Editor */}
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-semibold">{agency?.personalization.legalInfo?.companyName || 'Votre Agence'}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {agency?.personalization.legalInfo?.addressStreet}<br/>
                                    {agency?.personalization.legalInfo?.addressZip} {agency?.personalization.legalInfo?.addressCity}
                                </p>
                            </div>
                            <div className="text-right">
                                <h3 className="font-bold text-2xl text-muted-foreground">DEVIS</h3>
                                <FormField
                                    control={form.control}
                                    name="quoteNumber"
                                    render={({ field }) => (
                                        <FormItem className='mt-2'>
                                            <FormControl>
                                                <Input placeholder="N° DEVIS-2024-001" className="text-right" {...field}/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                         <div className="grid grid-cols-2 gap-8">
                            <FormField
                                control={form.control}
                                name="clientId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <Label>Client</Label>
                                        <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                        {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : "Sélectionner un client..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Rechercher un client..." />
                                                    <CommandList>
                                                        <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                                                        <CommandGroup>
                                                        {(clients || []).map((client) => (
                                                            <CommandItem
                                                                key={client.id}
                                                                value={`${client.firstName} ${client.lastName}`}
                                                                onSelect={() => {
                                                                    field.onChange(client.id);
                                                                    setSelectedClient(client);
                                                                    setIsClientPopoverOpen(false);
                                                                }}
                                                            >
                                                                {client.firstName} {client.lastName}
                                                            </CommandItem>
                                                        ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                         <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Statut</Label>
                                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Statut du devis" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="draft">Brouillon</SelectItem>
                                                <SelectItem value="sent">Envoyé</SelectItem>
                                                <SelectItem value="accepted">Accepté</SelectItem>
                                                <SelectItem value="rejected">Refusé</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         
                        <FormField
                            control={form.control}
                            name="contractId"
                            render={({ field }) => (
                                <FormItem>
                                    <Label>Contrat</Label>
                                    <Select onValueChange={field.onChange} value={field.value} defaultValue="">
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Attacher un modèle de contrat..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="">Aucun contrat</SelectItem>
                                            {(contracts || []).map((contract) => (
                                                <SelectItem key={contract.id} value={contract.id}>
                                                    {contract.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-8">
                            <FormField
                                control={form.control}
                                name="issueDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <Label>Date d'émission</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="expiryDate"
                                render={({ field }) => (
                                     <FormItem className="flex flex-col">
                                        <Label>Date d'expiration</Label>
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                 <FormControl>
                                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50%]">Description</TableHead>
                                        <TableHead>Qté</TableHead>
                                        <TableHead>P.U. HT</TableHead>
                                        <TableHead className="text-right">Total HT</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Input {...form.register(`items.${index}.description`)} placeholder="Description de l'article" />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} placeholder="1" />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })} placeholder="100.00" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {((watchItems[index]?.quantity || 0) * (watchItems[index]?.unitPrice || 0)).toFixed(2)} €
                                            </TableCell>
                                             <TableCell>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                     {fields.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                Aucun article. Ajoutez une ligne pour commencer.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" className="mt-4">
                                        <PlusCircle className="mr-2 h-4 w-4"/>
                                        Ajouter une ligne
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => append({ description: "", quantity: 1, unitPrice: 0, total: 0 })}>
                                        Ligne personnalisée
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            Ajouter depuis un plan
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                {(plans && plans.length > 0) ? (
                                                    plans.map((plan) => (
                                                        <DropdownMenuItem key={plan.id} onClick={() => addPlanAsItem(plan)}>
                                                            {plan.name} ({plan.price}€)
                                                        </DropdownMenuItem>
                                                    ))
                                                ) : (
                                                    <DropdownMenuItem disabled>Aucun plan trouvé</DropdownMenuItem>
                                                )}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                             <CardHeader>
                                <CardTitle>Récapitulatif</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sous-total HT</span>
                                    <span>{form.getValues('subtotal')?.toFixed(2) || '0.00'} €</span>
                                </div>
                                {isVatSubject && (
                                     <div className="flex justify-between items-center">
                                        <Label htmlFor='tax'>TVA (%)</Label>
                                        <Input id="tax" type="number" {...form.register('tax', { valueAsNumber: true })} className="w-24 h-8" />
                                    </div>
                                )}
                                 <div className="flex justify-between font-bold text-lg border-t pt-4">
                                    <span>Total {isVatSubject ? 'TTC' : ''}</span>
                                    <span>{form.getValues('total')?.toFixed(2) || '0.00'} €</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Informations Client</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm">
                                {selectedClient ? (
                                    <div className="text-muted-foreground space-y-1">
                                        <p><strong>Nom:</strong> {selectedClient.firstName} {selectedClient.lastName}</p>
                                        <p><strong>Email:</strong> {selectedClient.email}</p>
                                        {/* TODO: Add more client details */}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">Sélectionnez un client pour voir ses informations.</p>
                                )}
                            </CardContent>
                        </Card>
                        
                         <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <Label>Notes</Label>
                                    <Textarea placeholder="Ajoutez des notes, termes et conditions..." {...field} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button type="submit">{initialData ? 'Enregistrer les modifications' : 'Enregistrer le devis'}</Button>
                </div>
            </form>
        </Form>
    );
}
