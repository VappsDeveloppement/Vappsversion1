
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

type Event = {
  id: string;
  title: string;
  maxAttendees?: number;
};

type Registration = {
  id: string;
  userId: string;
};

const registrationSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse e-mail est invalide."),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export function EventRegistrationForm({ event }: { event: Event }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registrationsQuery = useMemoFirebase(() => collection(firestore, `events/${event.id}/registrations`), [firestore, event.id]);
  const { data: registrations, isLoading: areRegistrationsLoading } = useCollection<Registration>(registrationsQuery);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
        name: user?.displayName || '',
        email: user?.email || '',
    }
  });

  useEffect(() => {
    if (user) {
        form.reset({
            name: user.displayName || '',
            email: user.email || '',
        });
    }
  }, [user, form]);

  const userIsRegistered = useMemo(() => {
    if (!user || !registrations) return false;
    return registrations.some(reg => reg.userId === user.uid);
  }, [user, registrations]);

  const onSubmit = async (data: RegistrationFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        await addDocumentNonBlocking(collection(firestore, `events/${event.id}/registrations`), {
            eventId: event.id,
            userId: user.uid,
            userName: data.name,
            userEmail: data.email,
            registeredAt: new Date().toISOString(),
        });
        toast({ title: "Inscription réussie !", description: `Vous êtes bien inscrit(e) à l'événement "${event.title}".` });
    } catch (err) {
        toast({ title: "Erreur", description: "Une erreur est survenue lors de l'inscription.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const spotsLeft = event.maxAttendees ? event.maxAttendees - (registrations?.length || 0) : Infinity;
  const isFull = spotsLeft <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6"/> Inscription</CardTitle>
      </CardHeader>
      <CardContent>
        {areRegistrationsLoading ? <Skeleton className="h-20 w-full" /> : (
            <>
                {event.maxAttendees ? (
                    <p className="text-sm mb-4">
                        Places restantes: <span className="font-bold">{spotsLeft > 0 ? spotsLeft : 0} / {event.maxAttendees}</span>
                    </p>
                ) : (
                    <p className="text-sm mb-4 font-medium text-green-600">Places illimitées</p>
                )}

                {userIsRegistered ? (
                     <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Vous êtes inscrit !</span>
                    </div>
                ) : isFull ? (
                     <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-semibold">Cet événement est complet.</span>
                    </div>
                ) : user ? (
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                             <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                S'inscrire
                            </Button>
                        </form>
                     </Form>
                ) : (
                    <div className="text-center p-4 border-dashed border-2 rounded-md">
                        <p className="text-sm text-muted-foreground mb-4">Vous devez être connecté pour vous inscrire.</p>
                        <Button asChild><Link href="/application">Se connecter</Link></Button>
                    </div>
                )}
            </>
        )}
      </CardContent>
    </Card>
  );
}

