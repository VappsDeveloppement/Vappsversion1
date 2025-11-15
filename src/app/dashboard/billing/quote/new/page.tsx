
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAgency } from '@/context/agency-provider';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Calendar as CalendarIcon, ChevronsUpDown, PlusCircle, Trash2, Save, Send, FileText } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export default function NewQuotePage() {
    const { agency, personalization, isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();
    
    // Fetch clients (Membres and Prospects)
    const usersQuery = useMemoFirebase(() => {
        if (!agency) return null;
        return query(collection(firestore, 'users'), where('agencyId', '==', agency.id), where('role', 'in', ['membre', 'prospect']));
    }, [agency, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<User>(usersQuery);

    const [selectedClient, setSelectedClient] = React.useState<User | null>(null);
    const [isClientPopoverOpen, setIsClientPopoverOpen] = React.useState(false);
    const [issueDate, setIssueDate] = React.useState<Date | undefined>(new Date());
    const [expiryDate, setExpiryDate] = React.useState<Date | undefined>();

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Nouveau Devis</h1>
                    <p className="text-muted-foreground">Créez un devis détaillé pour vos clients.</p>
                </div>
                 <div className="flex gap-2">
                    <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> Sauvegarder en PDF</Button>
                    <Button variant="outline"><Send className="mr-2 h-4 w-4" /> Envoyer par e-mail</Button>
                    <Button><Save className="mr-2 h-4 w-4" /> Enregistrer le devis</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    {/* Main Quote Editor */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Contenu du devis</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h3 className="font-semibold">{personalization.legalInfo?.companyName || 'Votre Agence'}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {personalization.legalInfo?.addressStreet}<br/>
                                        {personalization.legalInfo?.addressZip} {personalization.legalInfo?.addressCity}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <h3 className="font-bold text-2xl text-muted-foreground">DEVIS</h3>
                                    <Input placeholder="N° DEVIS-2024-001" className="mt-2 text-right"/>
                                </div>
                            </div>

                             <div className="grid grid-cols-2 gap-8 mb-8">
                                <div className="space-y-2">
                                    <Label>Client</Label>
                                    <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" aria-expanded={isClientPopoverOpen} className="w-full justify-between">
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
                                                    {(clients || []).map((client) => (
                                                        <CommandItem
                                                            key={client.id}
                                                            value={`${client.firstName} ${client.lastName}`}
                                                            onSelect={() => {
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
                                </div>
                                <div className="space-y-2">
                                    <Label>Statut</Label>
                                     <Select defaultValue="draft">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Statut du devis" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Brouillon</SelectItem>
                                            <SelectItem value="sent">Envoyé</SelectItem>
                                            <SelectItem value="accepted">Accepté</SelectItem>
                                            <SelectItem value="rejected">Refusé</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div className="space-y-2">
                                    <Label>Date d'émission</Label>
                                     <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal", !issueDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {issueDate ? format(issueDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={issueDate} onSelect={setIssueDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date d'expiration</Label>
                                     <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal", !expiryDate && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {expiryDate ? format(expiryDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="mt-8">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50%]">Description</TableHead>
                                            <TableHead>Qté</TableHead>
                                            <TableHead>Prix Unitaire</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                Aucun article. Ajoutez un article pour commencer.
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                                <Button variant="outline" size="sm" className="mt-4">
                                    <PlusCircle className="mr-2 h-4 w-4"/>
                                    Ajouter une ligne
                                </Button>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <div className="w-full max-w-sm space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Sous-total</span>
                                        <span>0.00 €</span>
                                    </div>
                                     <div className="flex justify-between">
                                        <span className="text-muted-foreground">TVA (20%)</span>
                                        <span>0.00 €</span>
                                    </div>
                                     <div className="flex justify-between font-bold text-lg border-t pt-4">
                                        <span>Total</span>
                                        <span>0.00 €</span>
                                    </div>
                                </div>
                            </div>

                             <div className="mt-12 space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea id="notes" placeholder="Ajoutez des notes, termes et conditions..." />
                            </div>

                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                     {/* Client and Agency Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations</CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-6 text-sm">
                            <div>
                                <h4 className="font-semibold mb-2 border-b pb-1">Agence</h4>
                                <div className="text-muted-foreground space-y-1">
                                    <p><strong>Nom:</strong> {personalization.legalInfo?.companyName}</p>
                                    <p><strong>Adresse:</strong> {[personalization.legalInfo?.addressStreet, personalization.legalInfo?.addressZip, personalization.legalInfo?.addressCity].filter(Boolean).join(', ')}</p>
                                    <p><strong>Email:</strong> {personalization.legalInfo?.email}</p>
                                    <p><strong>Tél:</strong> {personalization.legalInfo?.phone}</p>
                                    <p><strong>SIRET:</strong> {personalization.legalInfo?.siret}</p>
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold mb-2 border-b pb-1">Client</h4>
                                {selectedClient ? (
                                    <div className="text-muted-foreground space-y-1">
                                        <p><strong>Nom:</strong> {selectedClient.firstName} {selectedClient.lastName}</p>
                                        <p><strong>Email:</strong> {selectedClient.email}</p>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">Sélectionnez un client pour voir ses informations.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
