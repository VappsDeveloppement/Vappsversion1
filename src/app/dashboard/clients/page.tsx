
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    dateJoined: string;
    phone?: string;
};

export default function ClientsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const clientsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: allClients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
    
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

    const isLoading = isUserLoading || areClientsLoading;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Mes Clients</h1>
                <p className="text-muted-foreground">Consultez la liste de vos clients et leurs informations.</p>
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
