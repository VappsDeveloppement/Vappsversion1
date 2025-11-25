
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase/provider';
import { collection, addDoc } from 'firebase/firestore';

const followUpSchema = z.object({
  liveDate: z.string().min(1, "La date du live est requise."),
  name: z.string().min(1, "Votre nom est requis."),
  email: z.string().email("Veuillez entrer un email valide."),
  phone: z.string().optional(),
});

type FollowUpFormData = z.infer<typeof followUpSchema>;

interface LiveFollowUpFormProps {
    children: React.ReactNode;
    counselorId: string;
}

export function LiveFollowUpForm({ children, counselorId }: LiveFollowUpFormProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();

    const form = useForm<FollowUpFormData>({
        resolver: zodResolver(followUpSchema),
        defaultValues: { liveDate: '', name: '', email: '', phone: '' },
    });
    
    const handleFollowUpSubmit = async (data: FollowUpFormData) => {
        setIsLoading(true);

        const requestData = {
            ...data,
            counselorId,
            wantsContact: true, // The purpose of this form is to be contacted
            status: 'new',
            createdAt: new Date().toISOString(),
        };

        try {
            await addDoc(collection(firestore, 'live_follow_up_requests'), requestData);
            toast({ title: "Demande envoyée !", description: "Le conseiller a bien reçu votre demande et vous recontactera bientôt." });
            setIsDialogOpen(false);
            form.reset();
        } catch (error) {
            console.error("Error submitting follow-up request:", error);
            toast({ title: "Erreur", description: "Impossible d'enregistrer votre demande.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Demande de suivi après un live</DialogTitle>
                    <DialogDescription>
                        Laissez vos informations pour que le conseiller puisse vous recontacter.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFollowUpSubmit)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="liveDate" render={({ field }) => ( <FormItem><FormLabel>Date du live</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Votre nom (utilisé durant le live)</FormLabel><FormControl><Input placeholder="Ex: Jean" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="votre.email@example.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Envoyer ma demande de suivi
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
