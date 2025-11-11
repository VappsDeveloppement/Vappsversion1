import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, MessageSquare } from "lucide-react";


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
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            <p>No contacts found.</p>
                        </div>
                    </ScrollArea>
                </aside>
                <main className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center text-center">
                    <MessageSquare className="w-16 h-16 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No Conversation Selected</h3>
                    <p className="text-muted-foreground">Select a contact to start a conversation.</p>
                </main>
            </div>
        </div>
    );
}
