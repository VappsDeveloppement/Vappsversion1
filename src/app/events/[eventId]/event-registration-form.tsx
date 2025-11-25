
'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { collection, doc, addDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

type Event = {
  id: string;
  title: string;
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
        const registrationRef = collection(firestore, `events/${event.id}/registrations`);
        await addDoc(registrationRef, {
            eventId: event.id,
            userId: user?.uid || null,
            userName: data.name,
            userEmail: data.email,
            registeredAt: new Date().toISOString(),
        });
        
        toast({ title: "Inscription réussie !", description: `Vous êtes bien inscrit(e) à l'événement "${event.title}".` });
        setIsRegistered(true);
    } catch (err: any) {
        toast({ title: "Erreur", description: "Une erreur est survenue lors de l'inscription.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inscription</CardTitle>
      </CardHeader>
      <CardContent>
          {isRegistered ? (
               <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Vous êtes inscrit !</span>
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
      </CardContent>
    </Card>
  );
}
