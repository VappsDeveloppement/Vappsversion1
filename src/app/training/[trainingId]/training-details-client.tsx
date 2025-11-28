
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Euro, Link as LinkIcon, BookOpen, User, Check, List, Target, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Training, TrainingModule } from '@/app/dashboard/e-learning/[trainingId]/page';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase/provider';
import { addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface TrainingDetailsClientProps {
    training: Training;
    modules: TrainingModule[];
}

const requestSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'email est invalide."),
  phone: z.string().optional(),
  message: z.string().optional(),
});
type RequestFormData = z.infer<typeof requestSchema>;

function TrainingRegistrationForm({ training }: { training: Training }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const form = useForm<RequestFormData>({
        resolver: zodResolver(requestSchema),
        defaultValues: { name: '', email: '', phone: '', message: ''},
    });
    
    const onSubmit = async (data: RequestFormData) => {
        setIsLoading(true);
        try {
            await addDocumentNonBlocking(collection(firestore, 'training_requests'), {
                ...data,
                trainingId: training.id,
                trainingTitle: training.title,
                counselorId: training.authorId,
                status: 'new',
                createdAt: new Date().toISOString(),
            });
            toast({ title: 'Demande envoyée', description: 'Votre demande a bien été envoyée. Le conseiller vous recontactera prochainement.' });
            setIsDialogOpen(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast({ title: 'Erreur', description: 'Une erreur est survenue.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="w-full">
                    Demander plus d'informations
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Demande d'information</DialogTitle>
                    <DialogDescription>Pour la formation "{training.title}"</DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Téléphone (optionnel)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel>Votre message (optionnel)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <DialogFooter>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Envoyer la demande
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function TrainingDetailsClient({ training, modules }: TrainingDetailsClientProps) {

  return (
    <div className="bg-muted/20 min-h-screen">
      <div className="container mx-auto max-w-4xl py-12 px-4">
        {training.imageUrl && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
                <Image src={training.imageUrl} alt={training.title} fill className="object-cover" priority />
            </div>
        )}
        <div className="flex justify-between items-start">
            <div>
                 {training.isPublic && <Badge className="mb-2">Formation Publique</Badge>}
                <h1 className="text-4xl lg:text-5xl font-bold font-headline leading-tight mb-4">{training.title}</h1>
            </div>
            <div className="text-3xl font-bold text-primary flex-shrink-0">
                {training.price ? `${training.price}€` : 'Gratuit'}
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2 text-muted-foreground mb-8 text-sm">
            {training.duration && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /><span>Durée: {training.duration} heures</span></div>}
             {training.financingOptions && training.financingOptions.length > 0 && (
                <div className="flex items-center gap-2">
                    <Euro className="h-4 w-4 text-primary" />
                    <span>{training.financingOptions.join(', ')}</span>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
                 <div className="prose dark:prose-invert max-w-none">
                    <p className="lead">{training.description}</p>
                </div>
                
                {modules.length > 0 && (
                     <div>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Programme de la formation</h2>
                        <Accordion type="multiple" className="w-full space-y-2">
                            {modules.map((module, index) => (
                                <AccordionItem key={module.id} value={module.id} className="border rounded-md bg-background px-4">
                                    <AccordionTrigger className="text-left hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-primary">{index + 1}</span>
                                            <span className="font-semibold">{module.title}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4 prose prose-sm max-w-none">
                                        <p>{module.description}</p>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                )}
            </div>
            <div className="lg:col-span-1 space-y-6">
                <div className="p-6 rounded-lg border bg-background">
                    <h3 className="font-bold text-lg mb-4">Informations clés</h3>
                    <ul className="space-y-3 text-sm">
                        {training.prerequisites && training.prerequisites.length > 0 && (
                            <li className="flex items-start gap-3">
                                <List className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-semibold">Prérequis</span>
                                    <p className="text-muted-foreground">{training.prerequisites.join(', ')}</p>
                                </div>
                            </li>
                        )}
                        {training.entryLevel && training.entryLevel.length > 0 && (
                            <li className="flex items-start gap-3">
                                <User className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-semibold">Niveau d'entrée</span>
                                    <p className="text-muted-foreground">{training.entryLevel.join(', ')}</p>
                                </div>
                            </li>
                        )}
                         {training.exitLevel && training.exitLevel.length > 0 && (
                            <li className="flex items-start gap-3">
                                <Target className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-semibold">Niveau de sortie</span>
                                    <p className="text-muted-foreground">{training.exitLevel.join(', ')}</p>
                                </div>
                            </li>
                        )}
                    </ul>
                </div>
                 <TrainingRegistrationForm training={training} />
            </div>
        </div>
      </div>
    </div>
  );
}

    