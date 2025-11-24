
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useCollection, useMemoFirebase, useUser, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, doc, arrayUnion } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, PlusCircle, Search as SearchIcon, Loader2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    dateJoined: string;
    phone?: string;
    counselorIds?: string[];
};

const newUserSchema = z.object({
    firstName: z.string().min(1, 'Le prénom est requis.'),
    lastName: z.string().min(1, 'Le nom est requis.'),
    email: z.string().email('Email invalide.'),
});
type NewUserFormData = z.infer<typeof newUserSchema>;


export default function ClientsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddClientOpen, setIsAddClientOpen] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<Client | 'not-found' | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const clientsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: allClients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
    
    const newUserForm = useForm<NewUserFormData>({
        resolver: zodResolver(newUserSchema),
    });

    const filteredClients = useMemo(() => {
        if (!allClients) return [];
        if (!searchTerm) return allClients;
        
        const lowercasedTerm = searchTerm.toLowerCase();
        return allClients.filter(client => 
            (client.firstName?.toLowerCase() || '').includes(lowercasedTerm) ||
            (client.lastName?.toLowerCase() || '').includes(lowercasedTerm) ||
            (client.email?.toLowerCase() || '').includes(lowercasedTerm)
        );
    }, [allClients, searchTerm]);
    
    const handleSearchUser = async () => {
        if (!searchEmail) return;
        setIsSearching(true);
        setSearchResult(null);
        setShowCreateForm(false);
        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('email', '==', searchEmail.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setSearchResult('not-found');
                newUserForm.reset({ firstName: '', lastName: '', email: searchEmail });
            } else {
                const foundUser = querySnapshot.docs[0].data() as Client;
                setSearchResult(foundUser);
            }
        } catch (error) {
            toast({ title: "Erreur", description: "La recherche a échoué.", variant: "destructive" });
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleAddClient = async (client: Client) => {
        if (!user) return;
        setIsSubmitting(true);
        const clientRef = doc(firestore, 'users', client.id);
        
        // Ensure counselorIds exists and add the new one
        const newCounselorIds = Array.from(new Set([...(client.counselorIds || []), user.uid]));

        try {
            await setDocumentNonBlocking(clientRef, { counselorIds: newCounselorIds }, { merge: true });
            toast({ title: "Client ajouté", description: `${client.firstName} ${client.lastName} a été ajouté à votre liste.` });
            setIsAddClientOpen(false);
            resetSearch();
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible d'ajouter le client.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const onCreateNewUser = async (values: NewUserFormData) => {
        if (!user) return;
        setIsSubmitting(true);
        
        const newUserRef = doc(collection(firestore, 'users'));
        const newUserData = {
            id: newUserRef.id,
            ...values,
            role: 'membre',
            dateJoined: new Date().toISOString(),
            counselorIds: [user.uid],
        };

        try {
            await setDocumentNonBlocking(newUserRef, newUserData, {});
            toast({ title: "Client créé et ajouté", description: `${values.firstName} ${values.lastName} a été ajouté à votre liste.` });
            setIsAddClientOpen(false);
            resetSearch();
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de créer le client.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetSearch = () => {
        setSearchEmail('');
        setSearchResult(null);
        setIsSearching(false);
        setShowCreateForm(false);
    };


    const isLoading = isUserLoading || areClientsLoading;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Mes Clients</h1>
                    <p className="text-muted-foreground">Consultez la liste de vos clients et leurs informations.</p>
                </div>
                 <Dialog open={isAddClientOpen} onOpenChange={(open) => { setIsAddClientOpen(open); if(!open) resetSearch(); }}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un client</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ajouter un client</DialogTitle>
                            <DialogDescription>Recherchez un utilisateur par e-mail pour l'ajouter à vos clients, ou créez une nouvelle fiche.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex gap-2">
                                <Input placeholder="email@example.com" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
                                <Button onClick={handleSearchUser} disabled={isSearching || !searchEmail}>
                                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : <SearchIcon className="h-4 w-4" />}
                                </Button>
                            </div>

                            {searchResult === 'not-found' && !showCreateForm && (
                                <Card className="p-4 bg-muted">
                                    <p className="text-sm text-center text-muted-foreground mb-4">Aucun utilisateur trouvé avec cet e-mail.</p>
                                    <Button className="w-full" variant="secondary" onClick={() => setShowCreateForm(true)}>
                                        <UserPlus className="mr-2 h-4 w-4" /> Créer une nouvelle fiche client
                                    </Button>
                                </Card>
                            )}

                             {searchResult && searchResult !== 'not-found' && (
                                <Card className="p-4">
                                    <p className="font-semibold">{searchResult.firstName} {searchResult.lastName}</p>
                                    <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                                    <Button className="w-full mt-4" onClick={() => handleAddClient(searchResult)} disabled={isSubmitting || searchResult.counselorIds?.includes(user?.uid || '')}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        {searchResult.counselorIds?.includes(user?.uid || '') ? "Déjà votre client" : "Ajouter comme client"}
                                    </Button>
                                </Card>
                            )}

                            {showCreateForm && (
                                <Card className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold">Nouvelle fiche client</h4>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCreateForm(false)}><X className="h-4 w-4"/></Button>
                                    </div>
                                    <Form {...newUserForm}>
                                        <form onSubmit={newUserForm.handleSubmit(onCreateNewUser)} className="space-y-4">
                                            <FormField control={newUserForm.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                            <FormField control={newUserForm.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem> )}/>
                                            <FormField control={newUserForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage/></FormItem> )}/>
                                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                Créer et ajouter le client
                                            </Button>
                                        </form>
                                    </Form>
                                </Card>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex gap-4 pt-4">
                        <Input 
                            placeholder="Rechercher par nom ou email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-grow"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Téléphone</TableHead>
                                <TableHead>Date d'inscription</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredClients && filteredClients.length > 0 ? (
                                filteredClients.map((client) => (
                                   <TableRow key={client.id}>
                                       <TableCell className="font-medium">{client.firstName} {client.lastName}</TableCell>
                                       <TableCell>{client.email}</TableCell>
                                       <TableCell>{client.phone || '-'}</TableCell>
                                       <TableCell>{client.dateJoined ? new Date(client.dateJoined).toLocaleDateString() : 'N/A'}</TableCell>
                                   </TableRow>
                               ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Users className="h-10 w-10 text-muted-foreground"/>
                                            <p className="text-muted-foreground">Vous n'avez pas encore de client.</p>
                                        </div>
                                    </TableCell>
                               </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

    