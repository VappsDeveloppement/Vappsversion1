import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send } from "lucide-react";

const contacts = [
    { name: "Dr. Evelyn Reed", lastMessage: "Let's review this week's progress.", time: "10:42 AM", unread: 0, avatar: "coach1" },
    { name: "John Carter", lastMessage: "Great session today!", time: "Yesterday", unread: 0, avatar: "coach2" },
    { name: "Support Team", lastMessage: "Your invoice has been generated.", time: "2d ago", unread: 1, avatar: "support" },
];

const chatHistory = [
    { sender: "Dr. Evelyn Reed", message: "Hi there! How are you progressing with the goals we set last week?", timestamp: "10:30 AM", isUser: false },
    { sender: "You", message: "Hi Dr. Reed! I'm doing well. I've completed the first two action items.", timestamp: "10:32 AM", isUser: true },
    { sender: "Dr. Evelyn Reed", message: "That's fantastic to hear. Any challenges so far?", timestamp: "10:33 AM", isUser: false },
    { sender: "You", message: "The third one is a bit tricky, but I'm working on it. I might have a question later.", timestamp: "10:35 AM", isUser: true },
    { sender: "Dr. Evelyn Reed", message: "Of course, feel free to reach out anytime. I'm here to help. Also, here's the article we discussed.", timestamp: "10:42 AM", isUser: false },
];

export default function MessagesPage() {
    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-4">
                <h1 className="text-3xl font-bold font-headline">Messages</h1>
                <p className="text-muted-foreground">Communicate securely with your coaches and support.</p>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 border rounded-lg overflow-hidden">
                <aside className="md:col-span-1 lg:col-span-1 border-r flex flex-col">
                    <div className="p-4 border-b">
                        <Input placeholder="Search contacts..." />
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2">
                        {contacts.map((contact) => (
                            <div key={contact.name} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-secondary">
                                <Avatar>
                                    <AvatarImage src={`https://picsum.photos/seed/${contact.avatar}/40/40`} />
                                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold truncate">{contact.name}</p>
                                        <p className="text-xs text-muted-foreground">{contact.time}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                                        {contact.unread > 0 && <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{contact.unread}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                </aside>
                <main className="md:col-span-2 lg:col-span-3 flex flex-col">
                    <header className="p-4 border-b flex items-center gap-3">
                        <Avatar>
                             <AvatarImage src={`https://picsum.photos/seed/coach1/40/40`} />
                             <AvatarFallback>E</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">Dr. Evelyn Reed</p>
                            <p className="text-sm text-muted-foreground">Online</p>
                        </div>
                    </header>
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            {chatHistory.map((chat, i) => (
                                <div key={i} className={`flex items-end gap-2 ${chat.isUser ? 'justify-end' : ''}`}>
                                    {!chat.isUser && 
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={`https://picsum.photos/seed/coach1/32/32`} />
                                            <AvatarFallback>E</AvatarFallback>
                                        </Avatar>
                                    }
                                    <div className={`max-w-xs md:max-w-md p-3 rounded-xl ${chat.isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                        <p className="text-sm">{chat.message}</p>
                                        <p className={`text-xs mt-1 ${chat.isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{chat.timestamp}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <footer className="p-4 border-t">
                        <div className="relative">
                            <Input placeholder="Type a message..." className="pr-24" />
                            <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex items-center">
                                <Button variant="ghost" size="icon">
                                    <Paperclip className="h-5 w-5" />
                                </Button>
                                <Button size="icon">
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
}
