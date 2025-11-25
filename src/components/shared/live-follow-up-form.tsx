
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const followUpSchema = z.object({
  liveDate: z.string().min(1, "La date du live est requise."),
  name: z.string().min(1, "Votre nom est requis."),
  dob: z.string().min(1, "Votre date de naissance est requise."),
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

    const form = useForm<FollowUpFormData>({
        resolver: zodResolver(followUpSchema),
        defaultValues: {
            liveDate: '',
            name: '',
            dob: '',
            email: '',
            phone: '',
        },
    });

    const onSubmit = (data: FollowUpFormData) => {
        // Here we will implement the logic to search for the consultation
        // and then show the contact checkbox.
        // For now, we just show a placeholder.
        console.log(data);
        toast({ title: "Recherche en cours...", description: "Cette fonctionnalité est en cours de développement." });
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Retrouver ma consultation</DialogTitle>
                    <DialogDescription>
                        Entrez les informations ci-dessous pour retrouver votre consultation et demander à être recontacté(e).
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="liveDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date du live</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Votre nom complet</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Jean Dupont" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dob"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Votre date de naissance</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Votre email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="votre.email@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Votre téléphone (optionnel)</FormLabel>
                                    <FormControl>
                                        <Input type="tel" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Rechercher
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

