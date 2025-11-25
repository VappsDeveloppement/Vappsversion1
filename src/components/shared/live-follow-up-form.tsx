
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
import { Loader2, Check, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

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
    const [foundConsultation, setFoundConsultation] = useState<any>(null);
    const [wantsContact, setWantsContact] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();

    const form = useForm<FollowUpFormData>({
        resolver: zodResolver(followUpSchema),
        defaultValues: { liveDate: '', name: '', dob: '', email: '', phone: '' },
    });
    
    const resetState = () => {
        setIsLoading(false);
        setFoundConsultation(null);
        setWantsContact(false);
        form.reset();
    }

    const handleSearch = async (data: FollowUpFormData) => {
        setIsLoading(true);
        setFoundConsultation(null);

        try {
            // 1. Fetch all public events.
            const eventQuery = query(
                collection(firestore, 'events'),
                where('isPublic', '==', true)
            );
            const eventSnap = await getDocs(eventQuery);
            
            // 2. Filter events by the selected date on the client side.
            const inputDate = new Date(data.liveDate).toISOString().split('T')[0];
            const eventsOnDate = eventSnap.docs.filter(doc => {
                const eventDate = new Date(doc.data().date).toISOString().split('T')[0];
                return eventDate === inputDate;
            });
            
            if (eventsOnDate.length === 0) {
                setFoundConsultation('not-found');
                setIsLoading(false);
                return;
            }
            
            // 3. Search for the consultation in all matching events.
            let consultationFound = null;
            for (const eventDoc of eventsOnDate) {
                const eventId = eventDoc.id;
                const consultationQuery = query(
                    collection(firestore, `events/${eventId}/consultations`),
                    where('participantName', '==', data.name.trim()),
                    where('participantDob', '==', data.dob)
                );
                const consultationSnap = await getDocs(consultationQuery);

                if (!consultationSnap.empty) {
                    consultationFound = consultationSnap.docs[0].data();
                    break; // Exit loop once found
                }
            }

            if (consultationFound) {
                 setFoundConsultation(consultationFound);
            } else {
                setFoundConsultation('not-found');
            }

        } catch (error) {
            console.error("Error searching consultation:", error);
            toast({ title: "Erreur", description: "La recherche a échoué.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
     const handleFollowUpSubmit = async () => {
        if (!wantsContact || !foundConsultation) return;
        setIsLoading(true);

        const requestData = {
            ...form.getValues(),
            counselorId,
            wantsContact,
            status: 'new',
            createdAt: new Date().toISOString(),
        };

        try {
            await addDoc(collection(firestore, 'live_follow_up_requests'), requestData);
            toast({ title: "Demande envoyée !", description: "Le conseiller a bien reçu votre demande et vous recontactera bientôt." });
            setIsDialogOpen(false);
            resetState();
        } catch (error) {
            console.error("Error submitting follow-up request:", error);
            toast({ title: "Erreur", description: "Impossible d'enregistrer votre demande.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetState(); }}>
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
                {!foundConsultation ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSearch)} className="space-y-4 pt-4">
                            <FormField control={form.control} name="liveDate" render={({ field }) => ( <FormItem><FormLabel>Date du live</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Votre nom (utilisé durant le live)</FormLabel><FormControl><Input placeholder="Ex: Jean" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="dob" render={({ field }) => ( <FormItem><FormLabel>Votre date de naissance</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <DialogFooter>
                                <Button type="submit" disabled={isLoading} className="w-full">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                    Rechercher
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : foundConsultation === 'not-found' ? (
                     <div className="py-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Aucune consultation trouvée</AlertTitle>
                            <AlertDescription>
                                Nous n'avons pas trouvé de consultation correspondant à ces informations. Veuillez vérifier les données saisies.
                            </AlertDescription>
                        </Alert>
                        <Button variant="outline" className="w-full mt-4" onClick={() => setFoundConsultation(null)}>Réessayer</Button>
                    </div>
                ) : (
                    <div className="space-y-6 pt-4">
                        <Alert>
                            <Check className="h-4 w-4" />
                            <AlertTitle>Consultation trouvée !</AlertTitle>
                            <AlertDescription>
                                Votre question du {new Date(foundConsultation.createdAt).toLocaleDateString('fr-FR')} a été retrouvée.
                            </AlertDescription>
                        </Alert>
                        
                        <Form {...form}>
                            <div className="space-y-4">
                                <p className='font-medium'>Vos informations de contact :</p>
                                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="votre.email@example.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Téléphone (optionnel)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                        </Form>

                        <div className="flex items-center space-x-2">
                           <Checkbox id="wants-contact" checked={wantsContact} onCheckedChange={(checked) => setWantsContact(checked as boolean)} />
                           <Label htmlFor="wants-contact" className="text-sm font-medium leading-none cursor-pointer">
                                Je souhaite être recontacté(e) pour un suivi.
                           </Label>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setFoundConsultation(null)}>Retour</Button>
                             <Button onClick={handleFollowUpSubmit} disabled={isLoading || !wantsContact} className="w-full sm:w-auto">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmer la demande
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
