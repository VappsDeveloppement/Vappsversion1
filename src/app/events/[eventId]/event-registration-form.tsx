
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
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
import { Skeleton } from '@/components/ui/skeleton';

type Event = {
  id: string;
  title: string;
  maxAttendees?: number;
  registrationsCount?: number;
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
  const [isRegistered, setIsRegistered] = useState(false);

  // We read the event doc in real-time to get the latest registrationsCount
  const eventRef = useMemoFirebase(() => doc(firestore, `events/${event.id}`), [firestore, event.id]);
  const { data: realTimeEvent, isLoading: isEventLoading } = useDoc<Event>(eventRef);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
        name: '',
        email: '',
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
  
  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    try {
        await runTransaction(firestore, async (transaction) => {
            const eventDoc = await transaction.get(eventRef);
            if (!eventDoc.exists()) {
                throw "Event does not exist!";
            }

            const currentCount = eventDoc.data().registrationsCount || 0;
            const maxAttendees = eventDoc.data().maxAttendees;

            if (maxAttendees && currentCount >= maxAttendees) {
                throw "Event is full!";
            }

            const registrationRef = doc(collection(firestore, `events/${event.id}/registrations`));
            transaction.set(registrationRef, {
                eventId: event.id,
                userId: user?.uid || null,
                userName: data.name,
                userEmail: data.email,
                registeredAt: new Date().toISOString(),
            });

            transaction.update(eventRef, { registrationsCount: increment(1) });
        });
        
        toast({ title: "Inscription réussie !", description: `Vous êtes bien inscrit(e) à l'événement "${event.title}".` });
        setIsRegistered(true);
    } catch (err: any) {
        let description = "Une erreur est survenue lors de l'inscription.";
        if (err === "Event is full!") {
            description = "Désolé, cet événement est maintenant complet.";
        }
        toast({ title: "Erreur", description, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const currentRegistrations = realTimeEvent?.registrationsCount ?? event.registrationsCount ?? 0;
  const spotsLeft = event.maxAttendees ? event.maxAttendees - currentRegistrations : Infinity;
  const isFull = spotsLeft <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6"/> Inscription</CardTitle>
      </CardHeader>
      <CardContent>
        {isEventLoading ? <Skeleton className="h-20 w-full" /> : (
            <>
                {event.maxAttendees ? (
                    <p className="text-sm mb-4">
                        Places restantes: <span className="font-bold">{spotsLeft > 0 ? spotsLeft : 0} / {event.maxAttendees}</span>
                    </p>
                ) : (
                    <p className="text-sm mb-4 font-medium text-green-600">Places illimitées</p>
                )}

                {isRegistered ? (
                     <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Vous êtes inscrit !</span>
                    </div>
                ) : isFull ? (
                     <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-semibold">Cet événement est complet.</span>
                    </div>
                ) : (
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
                )}
            </>
        )}
      </CardContent>
    </Card>
  );
}

    