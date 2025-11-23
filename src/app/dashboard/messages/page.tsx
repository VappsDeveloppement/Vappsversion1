
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, MessageSquare, Archive, Mail, Eye, Loader2 } from "lucide-react";
import { useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, useDoc } from '@/firebase';
import { useFirestore, useAuth } from '@/firebase/provider';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAgency } from '@/context/agency-provider';
import { sendReplyEmail } from '@/app/actions/email';

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
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { personalization, isLoading: isAgencyLoading } = useAgency();
    const [viewingMessage, setViewingMessage] = useState<ContactMessage | null>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<ContactMessage | null>(null);
    const [replySubject, setReplySubject] = useState('');
    const [replyBody, setReplyBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);
    
    const contactsQuery = useMemoFirebase(() => {
        if (!userData) return null; 

        if (userData.role === 'superadmin') {
            return query(
                collection(firestore, 'contact_messages'),
                where('status', '==', 'new'),
                where('recipientId', '==', 'vapps-agency')
            );
        } else if (userData.role === 'conseiller') {
             return query(
                collection(firestore, 'contact_messages'),
                where('status', '==', 'new'),
                where('recipientId', '==', user.uid)
            );
        }
        return null;
    }, [user, userData, firestore]);
    
    const { data: contacts, isLoading: areContactsLoading } = useCollection<ContactMessage>(contactsQuery);
    
    const isLoading = isUserLoading || isUserDataLoading || areContactsLoading || isAgencyLoading;

    useEffect(() => {
        if (replyingToMessage) {
            setReplySubject(`Re: ${replyingToMessage.subject}`);
            setReplyBody(`\n\n---\nMessage original de ${replyingToMessage.name} le ${new Date(replyingToMessage.createdAt).toLocaleDateString('fr-FR')} :\n\n${replyingToMessage.message}`);
        }
    }, [replyingToMessage]);

    const handleMarkAsRead = (contactId: string) => {
        const contactRef = doc(firestore, 'contact_messages', contactId);
        setDocumentNonBlocking(contactRef, { status: 'read' }, { merge: true });
        toast({ title: "Message marqué comme lu" });
        if (viewingMessage?.id === contactId) setViewingMessage(null);
        if (replyingToMessage?.id === contactId) setReplyingToMessage(null);
    }
    
    const handleSendReply = async () => {
        if (!replyingToMessage || !personalization?.emailSettings) {
            toast({ title: "Erreur", description: "Impossible d'envoyer la réponse.", variant: 'destructive' });
            return;
        }
        setIsSending(true);
        const result = await sendReplyEmail({
            settings: personalization.emailSettings,
            recipientEmail: replyingToMessage.email,
            subject: replySubject,
            htmlBody: replyBody.replace(/\n/g, '<br>'),
        });

        if (result.success) {
            toast({ title: "Réponse envoyée", description: `Votre e-mail a été envoyé à ${replyingToMessage.email}.` });
            handleMarkAsRead(replyingToMessage.id); // Mark as read after sending
        } else {
            toast({ title: "Erreur d'envoi", description: result.error, variant: 'destructive' });
        }
        setIsSending(false);
    };

    return (
        <>
         <Card className="mb-8">
            <CardHeader>
                <CardTitle>Nouvelles Demandes de Contact</CardTitle>
                <CardDescription>Liste des messages reçus qui n'ont pas encore été lus.</CardDescription>
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
                                        <Button variant="outline" size="sm" onClick={() => setViewingMessage(contact)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            Voir
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
        
        {/* View Message Dialog */}
        <Dialog open={!!viewingMessage} onOpenChange={(open) => !open && setViewingMessage(null)}>
            <DialogContent className="sm:max-w-lg">
                 <DialogHeader>
                    <DialogTitle>Détail du message</DialogTitle>
                    <DialogDescription>Message reçu le {viewingMessage && new Date(viewingMessage.createdAt).toLocaleDateString('fr-FR')}</DialogDescription>
                </DialogHeader>
                {viewingMessage && (
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-4 py-4 text-sm">
                            <div className="space-y-1">
                                <Label>Nom</Label>
                                <p className="text-sm text-muted-foreground">{viewingMessage.name}</p>
                            </div>
                            <div className="space-y-1">
                                <Label>Email</Label>
                                <p className="text-sm text-muted-foreground">{viewingMessage.email}</p>
                            </div>
                            <div className="space-y-1">
                                <Label>Téléphone</Label>
                                <p className="text-sm text-muted-foreground">{viewingMessage.phone}</p>
                            </div>
                            <div className="space-y-1">
                                <Label>Sujet</Label>
                                <p className="text-sm text-muted-foreground">{viewingMessage.subject}</p>
                            </div>
                             <div className="space-y-1">
                                <Label>Message</Label>
                                <p className="text-sm text-muted-foreground border bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{viewingMessage.message}</p>
                            </div>
                        </div>
                    </ScrollArea>
                )}
                 <DialogFooter className='sm:justify-between gap-2'>
                    <Button variant="outline" onClick={() => { setReplyingToMessage(viewingMessage); setViewingMessage(null); }}>
                        <Mail className="mr-2 h-4 w-4" /> Répondre par e-mail
                    </Button>
                    <div className='flex gap-2'>
                        <Button variant="secondary" onClick={() => setViewingMessage(null)}>Fermer</Button>
                        <Button onClick={() => viewingMessage && handleMarkAsRead(viewingMessage.id)}>
                            <Archive className="mr-2 h-4 w-4" /> Marquer comme lu
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {/* Reply Dialog */}
        <Dialog open={!!replyingToMessage} onOpenChange={(open) => !open && setReplyingToMessage(null)}>
            <DialogContent className="sm:max-w-2xl">
                 <DialogHeader>
                    <DialogTitle>Répondre à {replyingToMessage?.name}</DialogTitle>
                    <DialogDescription>
                       Votre e-mail sera envoyé depuis <span className='font-medium'>{personalization?.emailSettings?.fromEmail}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="reply-to">Destinataire</Label>
                        <Input id="reply-to" value={replyingToMessage?.email} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reply-subject">Sujet</Label>
                        <Input id="reply-subject" value={replySubject} onChange={(e) => setReplySubject(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="reply-body">Message</Label>
                        <Textarea id="reply-body" value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={10} />
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setReplyingToMessage(null)}>Annuler</Button>
                    <Button onClick={handleSendReply} disabled={isSending}>
                        {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4" /> Envoyer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
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
