
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
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase/provider';
import { Calendar as CalendarIcon, ChevronsUpDown, PlusCircle, Trash2, ChevronDown, Send, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { Plan } from './plan-management';
import { sendQuote } from '@/app/actions/quote';


type ClientUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  address?: string;
  zipCode?: string;
  city?: string;
};

type Contract = {
    id: string;
    title: string;
    content: string;
}

type Quote = {
    id: string;
    quoteNumber: string;
    validationCode: string;
    clientInfo: {
        id: string;
        name: string;
        email: string;
        address?: string;
        zipCode?: string;
        city?: string;
    };
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
    counselorId: string;
    agencyInfo?: any;
}


const quoteItemSchema = z.object({
    description: z.string().min(1, "La description est requise."),
    quantity: z.preprocess(
      (val) => (typeof val === 'string' ? parseFloat(val) : val),
      z.number().min(0.1, "La quantité doit être supérieure à 0.")
    ),
    unitPrice: z.preprocess(
      (val) => (typeof val === 'string' ? parseFloat(val) : val),
      z.number().min(0, "Le prix doit être positif.")
    ),
    total: z.number(),
});

const quoteFormSchema = z.object({
    quoteNumber: z.string().min(1, "Le numéro de devis est requis."),
    validationCode: z.string().min(1, "Le code de validation est requis."),
    clientId: z.string().min(1, "Un client doit être sélectionné."),
    status: z.enum(["draft", "sent", "accepted", "rejected"]),
    issueDate: z.date({ required_error: "La date d'émission est requise."}),
    expiryDate: z.date().optional(),
    items: z.array(quoteItemSchema).min(1, "Le devis doit contenir au moins un article."),
    notes: z.string().optional(),
    tax: z.preprocess(
      (val) => (typeof val === 'string' ? parseFloat(val) : val),
      z.number().min(0)
    ),
    subtotal: z.number(),
    total: z.number(),
    contractId: z.string().optional(),
});

interface NewQuoteFormProps {
    setOpen: (open: boolean) => void;
    initialData?: Quote | null;
}


export function NewQuoteForm({ setOpen, initialData }: NewQuoteFormProps) {
    const { agency, personalization } = useAgency();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSending, setIsSending] = React.useState(false);
    
    // Fetch clients
    const usersQuery = useMemoFirebase(() => {
        if (!user || !user.uid) return null;
        return query(collection(firestore, 'users'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<ClientUser>(usersQuery);

    // Fetch plans
    const plansQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'plans'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(plansQuery);
    
    // Fetch contracts
    const contractsQuery = useMemoFirebase(() => {
        if (!user || !user.uid) return null;
        return query(collection(firestore, 'contracts'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: contracts, isLoading: areContractsLoading } = useCollection<Contract>(contractsQuery);

    const [isClientPopoverOpen, setIsClientPopoverOpen] = React.useState(false);

    const isVatSubject = personalization?.legalInfo?.isVatSubject ?? false;
    const defaultTaxRate = isVatSubject ? (parseFloat(personalization?.legalInfo?.vatRate) || 20) : 0;

    const generateQuoteNumber = async () => {
        if (!user) return `DEVIS-${new Date().getFullYear()}-0001`;
        const quotesCollectionRef = collection(firestore, 'quotes');
        const q = query(quotesCollectionRef, where("counselorId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `DEVIS-${year}-${month}-`;
        const monthQuotes = querySnapshot.docs.filter(doc => doc.data().quoteNumber.startsWith(prefix));
        const nextId = (monthQuotes.length + 1).toString().padStart(4, '0');
        return `${prefix}${nextId}`;
    };
    
    const generateValidationCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const form = useForm<z.infer<typeof quoteFormSchema>>({
        resolver: zodResolver(quoteFormSchema),
        defaultValues: initialData ? {
            ...initialData,
            clientId: initialData.clientInfo.id,
            issueDate: new Date(initialData.issueDate),
            expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate) : undefined,
            contractId: initialData.contractId || undefined
        } : {
            quoteNumber: '',
            validationCode: '',
            status: 'draft',
            issueDate: new Date(),
            items: [],
            notes: '',
            tax: defaultTaxRate,
            contractId: undefined,
        }
    });

    React.useEffect(() => {
        if (!initialData && user) {
            generateQuoteNumber().then(num => form.setValue('quoteNumber', num));
            form.setValue('validationCode', generateValidationCode());
        }
    }, [!initialData, user, form]);
    
    React.useEffect(() => {
        if (initialData) {
            form.reset({
                ...initialData,
                clientId: initialData.clientInfo.id,
                issueDate: new Date(initialData.issueDate),
                expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate) : undefined,
                contractId: initialData.contractId || undefined,
                validationCode: initialData.validationCode || generateValidationCode(),
            });
        } else {
            const isVatSubject = personalization?.legalInfo?.isVatSubject ?? false;
            const defaultTaxRate = isVatSubject ? (parseFloat(personalization?.legalInfo?.vatRate) || 20) : 0;
            form.setValue('tax', defaultTaxRate);
        }
    }, [initialData, personalization, form, clients]);


    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const watchItems = form.watch("items");
    const watchTax = form.watch("tax");

    React.useEffect(() => {
        if (!watchItems) return;
        const subtotal = watchItems.reduce((acc, item) => {
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unitPrice) || 0;
            return acc + quantity * unitPrice;
        }, 0);
        const total = subtotal * (1 + (Number(watchTax) || 0) / 100);
        form.setValue('subtotal', subtotal);
        form.setValue('total', total);
    }, [watchItems, watchTax, form]);


    const handleSaveQuote = async (values: z.infer<typeof quoteFormSchema>): Promise<string | undefined> => {
        const selectedClient = clients?.find(c => c.id === values.clientId);
        if (!user || !selectedClient || !agency) {
            toast({ title: "Erreur", description: "Conseiller, client ou agence manquant.", variant: "destructive"});
            return;
        }

        const isContractSelected = values.contractId && values.contractId !== 'none';
        const selectedContract = isContractSelected ? contracts?.find(c => c.id === values.contractId) : undefined;

        const quoteData = {
            ...values,
            counselorId: user.uid,
            agencyId: agency.id,
            contractId: isContractSelected ? values.contractId : undefined,
            contractTitle: isContractSelected ? selectedContract?.title : undefined,
            contractContent: isContractSelected ? selectedContract?.content : undefined,
            issueDate: values.issueDate.toISOString().split('T')[0], // format as YYYY-MM-DD
            expiryDate: values.expiryDate?.toISOString().split('T')[0],
            agencyInfo: personalization.legalInfo,
            clientInfo: {
                id: selectedClient.id,
                name: `${selectedClient.firstName} ${selectedClient.lastName}`,
                email: selectedClient.email,
                address: selectedClient.address,
                zipCode: selectedClient.zipCode,
                city: selectedClient.city,
            },
        };
        
        try {
            if (initialData) {
                const quoteDocRef = doc(firestore, 'quotes', initialData.id);
                await setDocumentNonBlocking(quoteDocRef, quoteData, { merge: true });
                toast({ title: "Devis mis à jour", description: "Le devis a été sauvegardé avec succès."});
                return initialData.id;
            } else {
                const quotesCollectionRef = collection(firestore, 'quotes');
                const newDocRef = doc(quotesCollectionRef);
                await setDocumentNonBlocking(newDocRef, { ...quoteData, id: newDocRef.id }, {});
                toast({ title: "Devis créé", description: "Le devis a été sauvegardé avec succès."});
                return newDocRef.id;
            }
        } catch (error) {
            console.error("Failed to save quote", error);
            toast({ title: "Erreur", description: "Impossible de sauvegarder le devis.", variant: "destructive"});
            return undefined;
        }
    };
    
    const onSubmit = async (values: z.infer<typeof quoteFormSchema>) => {
        await handleSaveQuote(values);
        setOpen(false);
    };

    const handleSendEmail = async () => {
        setIsSending(true);
        const isValid = await form.trigger();
        if (!isValid) {
            toast({ title: "Formulaire invalide", description: "Veuillez corriger les erreurs avant d'envoyer.", variant: "destructive" });
            setIsSending(false);
            return;
        }

        const values = form.getValues();
        const selectedClient = clients?.find(c => c.id === values.clientId);

        const quoteId = await handleSaveQuote(values);

        if (quoteId && user && selectedClient && agency) {
            const isContractSelected = values.contractId && values.contractId !== 'none';
            
            const quoteDataForEmail: any = {
                ...values,
                id: quoteId,
                issueDate: values.issueDate.toISOString().split('T')[0],
                expiryDate: values.expiryDate?.toISOString().split('T')[0],
                clientInfo: {
                    id: selectedClient.id,
                    name: `${selectedClient.firstName} ${selectedClient.lastName}`,
                    email: selectedClient.email,
                    address: selectedClient.address,
                    zipCode: selectedClient.zipCode,
                    city: selectedClient.city,
                },
                contractId: isContractSelected ? values.contractId : undefined,
                contractTitle: isContractSelected ? contracts?.find(c => c.id === values.contractId)?.title : undefined,
                contractContent: isContractSelected ? contracts?.find(c => c.id === values.contractId)?.content : undefined,
            };

            const result = await sendQuote({
                quote: quoteDataForEmail,
                emailSettings: personalization.emailSettings,
                legalInfo: personalization.legalInfo,
            });

            if (result.success) {
                // Update status on the client side after successful email send
                const quoteRef = doc(firestore, 'quotes', quoteId);
                await setDocumentNonBlocking(quoteRef, { status: 'sent' }, { merge: true });
                toast({ title: "E-mail envoyé", description: `Le devis a été envoyé à ${selectedClient.email}.`});
                setOpen(false);
            } else {
                toast({ title: "Erreur d'envoi", description: result.error, variant: "destructive" });
            }
        } else {
             if (!quoteId) {
                toast({ title: "Erreur", description: "Impossible de sauvegarder le devis avant de l'envoyer.", variant: "destructive" });
            }
        }
        setIsSending(false);
    };

    const addPlanAsItem = (plan: Plan) => {
        append({
            description: plan.name,
            quantity: 1,
            unitPrice: plan.price,
            total: plan.price
        });
    }

    const watchClientId = form.watch('clientId');
    const selectedClient = React.useMemo(() => {
        return clients?.find(c => c.id === watchClientId);
    }, [watchClientId, clients]);
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        {/* Main Quote Editor */}
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-semibold">{personalization.legalInfo?.companyName || 'Votre Nom'}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {personalization.legalInfo?.addressStreet}<br/>
                                    {personalization.legalInfo?.addressZip} {personalization.legalInfo?.addressCity}
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
                                                <Input placeholder="Génération..." className="text-right" {...field} readOnly />
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
                                                                    form.setValue('clientId', client.id);
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
                                    <Label>Contrat (Optionnel)</Label>
                                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Attacher un modèle de contrat..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">Aucun contrat</SelectItem>
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
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.description`}
                                                    render={({ field }) => <Input {...field} placeholder="Description de l'article" />}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.quantity`}
                                                    render={({ field }) => <Input type="number" {...field} placeholder="1" />}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.unitPrice`}
                                                    render={({ field }) => <Input type="number" {...field} placeholder="100.00" />}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {((Number(watchItems[index]?.quantity) || 0) * (Number(watchItems[index]?.unitPrice) || 0)).toFixed(2)} €
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
                                                Aucun article. Ajoutez une prestation pour commencer.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" className="mt-4">
                                        <PlusCircle className="mr-2 h-4 w-4"/>
                                        Ajouter une prestation
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {(plans && plans.length > 0) ? (
                                        plans.map((plan) => (
                                            <DropdownMenuItem key={plan.id} onClick={() => addPlanAsItem(plan)}>
                                                {plan.name} ({plan.price}€)
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <DropdownMenuItem disabled>Aucun modèle trouvé</DropdownMenuItem>
                                    )}
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
                                    <span>{form.watch('subtotal')?.toFixed(2) || '0.00'} €</span>
                                </div>
                                {isVatSubject && (
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor='tax'>TVA (%)</Label>
                                        <FormField
                                            control={form.control}
                                            name="tax"
                                            render={({ field }) => <Input id="tax" type="number" {...field} className="w-24 h-8" />}
                                        />
                                    </div>
                                )}
                                 <div className="flex justify-between font-bold text-lg border-t pt-4">
                                    <span>Total {isVatSubject ? 'TTC' : ''}</span>
                                    <span>{form.watch('total')?.toFixed(2) || '0.00'} €</span>
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
                                        <p><strong>Nom:</strong> {selectedClient.firstName} ${selectedClient.lastName}</p>
                                        <p><strong>Email:</strong> {selectedClient.email}</p>
                                        {selectedClient.address && <p><strong>Adresse:</strong> {`${selectedClient.address}, ${selectedClient.zipCode} ${selectedClient.city}`}</p>}
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
                         <FormField
                            control={form.control}
                            name="validationCode"
                            render={({ field }) => (
                                <FormItem>
                                    <Label>Code de validation</Label>
                                    <Input {...field} readOnly />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button type="button" variant="secondary" onClick={handleSendEmail} disabled={isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Enregistrer et Envoyer
                    </Button>
                    <Button type="submit">Enregistrer Brouillon</Button>
                </div>
            </form>
        </Form>
    );
}

