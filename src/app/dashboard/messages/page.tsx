'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy, serverTimestamp, getDocs, documentId } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, UserPlus, Loader2, Search, ChevronsUpDown, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type UserData = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl?: string;
    role: 'conseiller' | 'membre';
    counselorIds?: string[];
};

type ParticipantInfo = {
    userId: string;
    name: string;
    photoUrl?: string | null;
};

type Conversation = {
    id: string;
    participantIds: string[];
    participantInfo: ParticipantInfo[];
    lastMessage?: {
        text: string;
        timestamp: any;
    };
    lastRead?: {
        [key: string]: any;
    }
};

type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: any;
};

function NewConversationManager({ onCreate, currentUserData }: { onCreate: (conversation: Conversation) => void, currentUserData: UserData | null }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    // Query for user's clients (if they are a counselor)
    const clientsQuery = useMemoFirebase(() => {
        if (!user || currentUserData?.role !== 'conseiller') return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore, currentUserData]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<UserData>(clientsQuery);

    // Query for user's own counselors
    const myCounselorsQuery = useMemoFirebase(() => {
        if (!user || !currentUserData?.counselorIds || currentUserData.counselorIds.length === 0) return null;
        return query(collection(firestore, 'users'), where(documentId(), 'in', currentUserData.counselorIds));
    }, [user, firestore, currentUserData]);
    const { data: myCounselors, isLoading: areMyCounselorsLoading } = useCollection<UserData>(myCounselorsQuery);
    
    const handleSelectContact = async (contact: UserData) => {
        if (!user || !currentUserData) return;
        setOpen(false);

        const participantIds = [user.uid, contact.id].sort();
        
        const conversationsRef = collection(firestore, 'conversations');
        const q = query(conversationsRef, where('participantIds', '==', participantIds));
        const existingConvos = await getDocs(q);

        if (!existingConvos.empty) {
            const existingConvo = { id: existingConvos.docs[0].id, ...existingConvos.docs[0].data() } as Conversation;
            onCreate(existingConvo);
            toast({ title: "Conversation existante", description: `Une conversation avec ${contact.firstName} existe déjà.` });
            return;
        }

        const currentUserInfo: ParticipantInfo = {
            userId: user.uid,
            name: `${currentUserData.firstName} ${currentUserData.lastName}` || 'Utilisateur',
            photoUrl: currentUserData.photoUrl || null
        };
        const contactInfo: ParticipantInfo = {
            userId: contact.id,
            name: `${contact.firstName} ${contact.lastName}`,
            photoUrl: contact.photoUrl || null
        };
        
        const newConversationData: Omit<Conversation, 'id'> = {
            participantIds,
            participantInfo: [currentUserInfo, contactInfo],
        };

        const newDocRef = await addDocumentNonBlocking(conversationsRef, newConversationData);
        onCreate({ id: newDocRef.id, ...newConversationData } as Conversation);
        toast({ title: "Nouvelle conversation", description: `Vous pouvez maintenant discuter avec ${contact.firstName}.` });
    };

    const isLoading = areClientsLoading || areMyCounselorsLoading;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline"><UserPlus className="mr-2 h-4 w-4"/>Nouveau</Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Rechercher un contact..." />
                    <CommandList>
                        <CommandEmpty>Aucun contact trouvé.</CommandEmpty>
                        {isLoading ? <p className="p-4 text-sm">Chargement...</p> : (
                            <>
                                {myCounselors && myCounselors.length > 0 && (
                                    <CommandGroup heading="Mes Conseillers">
                                        {myCounselors.map((contact) => (
                                            <CommandItem key={`counselor-${contact.id}`} onSelect={() => handleSelectContact(contact)}>
                                                {`${contact.firstName} ${contact.lastName}`}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                                {clients && clients.length > 0 && myCounselors && myCounselors.length > 0 && <CommandSeparator />}
                                {clients && clients.length > 0 && (
                                    <CommandGroup heading="Mes Clients">
                                        {clients.map((contact) => (
                                            <CommandItem key={`client-${contact.id}`} onSelect={() => handleSelectContact(contact)}>
                                                {`${contact.firstName} ${contact.lastName}`}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}


function MessagesView({ conversation }: { conversation: Conversation }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [newMessage, setNewMessage] = useState('');
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemoFirebase(() => {
        if (!conversation) return null;
        return query(collection(firestore, `conversations/${conversation.id}/messages`), orderBy('timestamp', 'asc'));
    }, [conversation, firestore]);
    const { data: messages, isLoading } = useCollection<Message>(messagesQuery);
    
     useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
        }
        
        // Mark conversation as read when messages are viewed
        if (user && conversation.id && messages) {
             const convoRef = doc(firestore, 'conversations', conversation.id);
             setDocumentNonBlocking(convoRef, {
                lastRead: {
                    [user.uid]: serverTimestamp()
                }
            }, { merge: true });
        }
    }, [messages, user, conversation.id, firestore]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !conversation) return;

        const messageData = {
            senderId: user.uid,
            text: newMessage,
            timestamp: serverTimestamp(),
        };

        const messagesRef = collection(firestore, `conversations/${conversation.id}/messages`);
        addDocumentNonBlocking(messagesRef, messageData);

        const convoRef = doc(firestore, 'conversations', conversation.id);
        setDocumentNonBlocking(convoRef, {
            lastMessage: {
                text: newMessage,
                timestamp: serverTimestamp(),
            },
            lastRead: { // Also update our own last read
                [user.uid]: serverTimestamp()
            }
        }, { merge: true });

        setNewMessage('');
    };

    const otherParticipant = conversation.participantInfo.find(p => p.userId !== user?.uid);

    return (
        <div className="flex flex-col h-full bg-background">
            <header className="p-4 border-b flex items-center gap-4">
                <Avatar>
                    <AvatarImage src={otherParticipant?.photoUrl || undefined} />
                    <AvatarFallback>{otherParticipant?.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold">{otherParticipant?.name || 'Conversation'}</h3>
            </header>
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                    {isLoading && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
                    {messages?.map(msg => {
                        const isSender = msg.senderId === user?.uid;
                        return (
                            <div key={msg.id} className={cn("flex", isSender ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "p-3 rounded-lg max-w-sm",
                                    isSender ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>
            <footer className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Votre message..."
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send />
                    </Button>
                </form>
            </footer>
        </div>
    );
}

export default function MessagesPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: currentUserData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);

    const conversationsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'conversations'), where('participantIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: conversations, isLoading: areConversationsLoading } = useCollection<Conversation>(conversationsQuery);
    
    const isLoading = isUserLoading || isUserDataLoading || areConversationsLoading;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] h-[calc(100vh-8rem)] border rounded-lg overflow-hidden">
                <div className="border-r"><Skeleton className="h-full w-full"/></div>
                <div><Skeleton className="h-full w-full"/></div>
            </div>
        );
    }
    
    const sortedConversations = conversations?.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp?.toDate() || new Date(0);
        const timeB = b.lastMessage?.timestamp?.toDate() || new Date(0);
        return timeB.getTime() - timeA.getTime();
    });

    return (
        <div className="h-[calc(100vh-8rem)]">
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] h-full border rounded-lg overflow-hidden">
                <aside className="border-r flex flex-col">
                    <header className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Conversations</h2>
                         <NewConversationManager 
                            onCreate={(newConvo) => setSelectedConversation(newConvo)}
                            currentUserData={currentUserData} 
                         />
                    </header>
                    <ScrollArea>
                        <nav className="p-2 space-y-1">
                            {sortedConversations?.map(convo => {
                                const otherParticipant = convo.participantInfo.find(p => p.userId !== user?.uid);
                                const lastMessageTimestamp = convo.lastMessage?.timestamp?.toDate();
                                const lastReadTimestamp = convo.lastRead?.[user!.uid]?.toDate();
                                const hasUnread = lastMessageTimestamp && (!lastReadTimestamp || lastMessageTimestamp > lastReadTimestamp);

                                return (
                                    <button
                                        key={convo.id}
                                        onClick={() => setSelectedConversation(convo)}
                                        className={cn(
                                            "w-full text-left p-2 rounded-md flex items-center gap-3 hover:bg-muted",
                                            selectedConversation?.id === convo.id && "bg-muted"
                                        )}
                                    >
                                        <Avatar>
                                            <AvatarImage src={otherParticipant?.photoUrl || undefined} />
                                            <AvatarFallback>{otherParticipant?.name?.charAt(0) || '?'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 truncate">
                                            <p className="font-semibold truncate">{otherParticipant?.name}</p>
                                            {convo.lastMessage && <p className="text-xs text-muted-foreground truncate">{convo.lastMessage.text}</p>}
                                        </div>
                                        {hasUnread && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />}
                                    </button>
                                )
                            })}
                        </nav>
                    </ScrollArea>
                </aside>
                <main>
                    {selectedConversation ? (
                        <MessagesView conversation={selectedConversation} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                            <div>
                                <p>Sélectionnez une conversation</p>
                                <p className="text-sm">ou démarrez-en une nouvelle.</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
