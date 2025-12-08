'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, UserPlus, Loader2, Search, ChevronsUpDown, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type UserData = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photoUrl?: string;
};

type ParticipantInfo = {
    userId: string;
    name: string;
    photoUrl?: string;
};

type Conversation = {
    id: string;
    participantIds: string[];
    participantInfo: ParticipantInfo[];
    lastMessage?: {
        text: string;
        timestamp: any;
    };
};

type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: any;
};

function NewConversationManager({ onCreate }: { onCreate: (conversation: Conversation) => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const clientsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);
    const { data: clients, isLoading } = useCollection<UserData>(clientsQuery);

    const handleSelectClient = async (client: UserData) => {
        if (!user) return;
        setOpen(false);

        const participantIds = [user.uid, client.id].sort();
        
        // Check if conversation already exists
        const conversationsRef = collection(firestore, 'conversations');
        const q = query(conversationsRef, where('participantIds', '==', participantIds));
        const existingConvos = await getDocs(q);

        if (!existingConvos.empty) {
            const existingConvo = { id: existingConvos.docs[0].id, ...existingConvos.docs[0].data() } as Conversation;
            onCreate(existingConvo); // Pass existing conversation to parent
            toast({ title: "Conversation existante", description: `Une conversation avec ${client.firstName} existe déjà.` });
            return;
        }

        // Create new conversation
        const counselorInfo = {
            userId: user.uid,
            name: user.displayName || 'Conseiller',
            photoUrl: user.photoURL || undefined
        };
        const clientInfo = {
            userId: client.id,
            name: `${client.firstName} ${client.lastName}`,
            photoUrl: client.photoUrl || undefined
        };
        
        const newConversationData: Omit<Conversation, 'id'> = {
            participantIds,
            participantInfo: [counselorInfo, clientInfo],
        };

        const newDocRef = await addDocumentNonBlocking(conversationsRef, newConversationData);
        onCreate({ id: newDocRef.id, ...newConversationData });
        toast({ title: "Nouvelle conversation", description: `Vous pouvez maintenant discuter avec ${client.firstName}.` });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline"><UserPlus className="mr-2 h-4 w-4"/>Nouvelle Conversation</Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Rechercher un client..." />
                    <CommandList>
                        <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                        <CommandGroup>
                            {isLoading ? <p className="p-4 text-sm">Chargement...</p> :
                                (clients || []).map((client) => (
                                    <CommandItem key={client.id} onSelect={() => handleSelectClient(client)}>
                                        {`${client.firstName} ${client.lastName}`}
                                    </CommandItem>
                                ))
                            }
                        </CommandGroup>
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
    }, [messages]);

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
            }
        }, { merge: true });

        setNewMessage('');
    };

    const otherParticipant = conversation.participantInfo.find(p => p.userId !== user?.uid);

    return (
        <div className="flex flex-col h-full bg-background">
            <header className="p-4 border-b flex items-center gap-4">
                <Avatar>
                    <AvatarImage src={otherParticipant?.photoUrl} />
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

    const conversationsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'conversations'), where('participantIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: conversations, isLoading } = useCollection<Conversation>(conversationsQuery);
    
    if (isUserLoading || isLoading) {
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
                         <NewConversationManager onCreate={(newConvo) => setSelectedConversation(newConvo)} />
                    </header>
                    <ScrollArea>
                        <nav className="p-2 space-y-1">
                            {sortedConversations?.map(convo => {
                                const otherParticipant = convo.participantInfo.find(p => p.userId !== user?.uid);
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
                                            <AvatarImage src={otherParticipant?.photoUrl} />
                                            <AvatarFallback>{otherParticipant?.name?.charAt(0) || '?'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 truncate">
                                            <p className="font-semibold truncate">{otherParticipant?.name}</p>
                                            {convo.lastMessage && <p className="text-xs text-muted-foreground truncate">{convo.lastMessage.text}</p>}
                                        </div>
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
