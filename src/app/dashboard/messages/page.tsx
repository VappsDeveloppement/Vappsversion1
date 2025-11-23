
'use client';

import React, { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, MessageSquare, Archive, Mail } from "lucide-react";
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type ContactMessage = {
    id: string;
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    status: 'new' | 'read' | 'archived';
    createdAt: string;
};

function NewContactsSection() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const contactsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, 'contact_messages'), 
            where('status', '==', 'new')
            // where('recipientId', '==', user.uid) // or 'agency' for superadmins
        );
    }, [user, firestore]);
    
    const { data: contacts, isLoading } = useCollection<ContactMessage>(contactsQuery);

    const handleMarkAsRead = (contactId: string) => {
        const contactRef = doc(firestore, 'contact_messages', contactId);
        setDocumentNonBlocking(contactRef, { status: 'read' }, { merge: true });
        toast({ title: "Message marqué comme lu" });
    }

    return (
         <Card className="mb-8">
            <CardHeader>
                <CardTitle>Nouvelles Demandes de Contact</CardTitle>
                <CardDescription>Liste des messages reçus depuis les formulaires de contact qui n'ont pas encore été lus.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Email & Tel</TableHead>
                            <TableHead>Sujet</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : contacts && contacts.length > 0 ? (
                            contacts.map(contact => (
                                <TableRow key={contact.id}>
                                    <TableCell className="font-medium">{contact.name}</TableCell>
                                    <TableCell>
                                        <div>{contact.email}</div>
                                        <div className="text-muted-foreground text-xs">{contact.phone}</div>
                                    </TableCell>
                                    <TableCell>{contact.subject}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleMarkAsRead(contact.id)}>
                                            <Archive className="mr-2 h-4 w-4" />
                                            Marquer comme lu
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Aucune nouvelle demande pour le moment.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}


export default function MessagesPage() {
    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-4">
                <h1 className="text-3xl font-bold font-headline">Messages</h1>
                <p className="text-muted-foreground">Communiquez avec vos clients et consultez les nouvelles demandes de contact.</p>
            </div>
            
            <NewContactsSection />

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 border rounded-lg overflow-hidden">
                <aside className="md:col-span-1 lg:col-span-1 border-r flex flex-col">
                    <div className="p-4 border-b">
                        <Input placeholder="Rechercher une conversation..." />
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            <p>Aucune conversation.</p>
                        </div>
                    </ScrollArea>
                </aside>
                <main className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center text-center">
                    <MessageSquare className="w-16 h-16 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Messagerie interne</h3>
                    <p className="text-muted-foreground">Sélectionnez une conversation pour commencer à discuter.</p>
                </main>
            </div>
        </div>
    );
}
