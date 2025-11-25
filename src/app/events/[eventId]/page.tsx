
'use client';

import React, { useState, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking, useUser } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Users, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  meetLink?: string;
  isPublic: boolean;
  imageUrl?: string | null;
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

export default function EventDetailsPage() {
  const params = useParams();
  const { eventId } = params;
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventRef = useMemoFirebase(() => doc(firestore, 'events', eventId as string), [firestore, eventId]);
  const { data: event, isLoading: isEventLoading, error } = useDoc<Event>(eventRef);

  const registrationsQuery = useMemoFirebase(() => collection(firestore, `events/${eventId}/registrations`), [firestore, eventId]);
  const { data: registrations, isLoading: areRegistrationsLoading } = useCollection<Registration>(registrationsQuery);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: '', email: '' }
  });
  
  const userIsRegistered = useMemo(() => {
    if (!user || !registrations) return false;
    return registrations.some(reg => reg.userId === user.uid);
  }, [user, registrations]);

  const onSubmit = async (data: RegistrationFormData) => {
    if (!user || !event) return;
    setIsSubmitting(true);
    try {
        await addDocumentNonBlocking(collection(firestore, `events/${eventId}/registrations`), {
            eventId: event.id,
            userId: user.uid,
            userName: data.name,
            userEmail: data.email,
            registeredAt: new Date().toISOString(),
        });
        toast({ title: "Inscription réussie !", description: `Vous êtes bien inscrit(e) à l'événement "${event.title}".` });
    } catch (err) {
        toast({ title: "Erreur", description: "Une erreur est survenue lors de l'inscription.", variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const spotsLeft = event?.maxAttendees ? event.maxAttendees - (registrations?.length || 0) : Infinity;
  const isFull = spotsLeft <= 0;

  if (isEventLoading || areRegistrationsLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="aspect-video w-full mb-8" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!event || error || !event.isPublic) {
    return notFound();
  }

  return (
    <div className="bg-muted/20 min-h-screen">
      <div className="container mx-auto max-w-4xl py-12 px-4">
        {event.imageUrl && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
                <Image src={event.imageUrl} alt={event.title} fill className="object-cover" priority />
            </div>
        )}
        <h1 className="text-4xl lg:text-5xl font-bold font-headline leading-tight mb-4">{event.title}</h1>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-muted-foreground mb-8">
            <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /><span>{new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</span></div>
            {event.location && <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><span>{event.location}</span></div>}
            {event.meetLink && <div className="flex items-center gap-2"><LinkIcon className="h-5 w-5 text-primary" /><a href={event.meetLink} target="_blank" rel="noopener noreferrer" className="hover:underline">Lien de la réunion</a></div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 prose dark:prose-invert max-w-none">
                <p>{event.description}</p>
            </div>
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6"/> Inscription</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                                     <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input {...field} defaultValue={user.displayName || ''} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} defaultValue={user.email || ''} /></FormControl><FormMessage /></FormItem>)} />
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
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
