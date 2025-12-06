
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { add, format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks, parse, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, useDoc } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { sendConfirmationEmail } from '@/app/actions/appointment';
import { useAgency } from '@/context/agency-provider';
import { Checkbox } from '@/components/ui/checkbox';


type Appointment = {
    id: string;
    title: string;
    start: string;
    end: string;
    clientId: string;
    clientName: string;
    details?: string;
};

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
};

const appointmentSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  clientId: z.string().min(1, "Veuillez sélectionner un client."),
  date: z.date({ required_error: "La date est requise." }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:mm)."),
  duration: z.coerce.number().min(15, "La durée doit être d'au moins 15 minutes."),
  details: z.string().optional(),
  sendConfirmation: z.boolean().default(false),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;


// Generate hours from 8 AM to 8 PM
const hours = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);
const startHour = 8;

export default function AppointmentsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { personalization } = useAgency();
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userData } = useDoc(userDocRef);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const appointmentsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/appointments`));
    }, [user, firestore]);
    const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

    const clientsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
    
    const form = useForm<AppointmentFormData>({
        resolver: zodResolver(appointmentSchema),
    });

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }, [currentDate]);

    const firstDayCurrentWeek = weekDays[0];

    const handlePreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const handleToday = () => setCurrentDate(new Date());

    const handleOpenForm = (appointment: Appointment | null = null, date?: Date, time?: string) => {
        setEditingAppointment(appointment);
        if (appointment) {
            const startDate = new Date(appointment.start);
            form.reset({
                title: appointment.title,
                clientId: appointment.clientId,
                date: startDate,
                startTime: format(startDate, 'HH:mm'),
                duration: (new Date(appointment.end).getTime() - startDate.getTime()) / 60000,
                details: appointment.details,
                sendConfirmation: false,
            });
        } else {
            form.reset({
                title: '',
                clientId: '',
                date: date || new Date(),
                startTime: time || '09:00',
                duration: 60,
                details: '',
                sendConfirmation: false,
            });
        }
        setIsFormOpen(true);
    };

    const checkOverlap = (start: Date, end: Date) => {
        if (!appointments) return false;
        for (const app of appointments) {
            if (editingAppointment && app.id === editingAppointment.id) continue;
            if (!app.start || !app.end) continue;
            const existingStart = new Date(app.start);
            const existingEnd = new Date(app.end);
            if (start < existingEnd && end > existingStart) {
                return true;
            }
        }
        return false;
    };

    const handleSaveAppointment = async (data: AppointmentFormData) => {
        if (!user || !clients) return;

        const [hours, minutes] = data.startTime.split(':').map(Number);
        const start = setMinutes(setHours(data.date, hours), minutes);
        const end = add(start, { minutes: data.duration });
        
        if (checkOverlap(start, end)) {
            toast({
                title: "Conflit d'horaire",
                description: "Ce créneau est déjà occupé par un autre rendez-vous.",
                variant: "destructive",
            });
            return;
        }
        
        setIsSubmitting(true);

        const client = clients.find(c => c.id === data.clientId);
        if (!client) {
            toast({ title: "Client non trouvé", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }

        const appointmentData = {
            title: data.title,
            start: start.toISOString(),
            end: end.toISOString(),
            clientId: data.clientId,
            clientName: `${client.firstName} ${client.lastName}`,
            details: data.details,
            counselorId: user.uid
        };

        try {
            const appointmentRef = editingAppointment
                ? doc(firestore, `users/${user.uid}/appointments`, editingAppointment.id)
                : doc(collection(firestore, `users/${user.uid}/appointments`));

            await setDocumentNonBlocking(appointmentRef, appointmentData, { merge: true });

            if (data.sendConfirmation) {
                const emailSettings = userData?.emailSettings?.fromEmail ? userData.emailSettings : personalization?.emailSettings;
                if (!emailSettings?.fromEmail) {
                    toast({ title: "Avertissement", description: "Les paramètres d'envoi d'e-mail ne sont pas configurés. Le rendez-vous est sauvegardé mais l'e-mail n'a pas été envoyé.", variant: "destructive"});
                } else {
                     await sendConfirmationEmail({
                        appointment: { ...appointmentData, start: start.toISOString() },
                        emailSettings: { ...emailSettings, fromName: emailSettings.fromName || userData.firstName },
                    });
                }
            }
            
            toast({ title: editingAppointment ? "Rendez-vous mis à jour" : "Rendez-vous créé" });
            setIsFormOpen(false);

        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de sauvegarder le rendez-vous.", variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <>
            <div className="flex flex-col h-[calc(100vh-6rem)]">
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Agenda</h1>
                         <p className="text-muted-foreground">Planifiez et visualisez vos rendez-vous.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={handlePreviousWeek}><ChevronLeft /></Button>
                            <Button variant="outline" onClick={handleToday}>Aujourd'hui</Button>
                            <Button variant="outline" size="icon" onClick={handleNextWeek}><ChevronRight /></Button>
                        </div>
                         <h2 className="font-semibold text-xl capitalize">
                            {format(firstDayCurrentWeek, 'MMMM yyyy', { locale: fr })}
                        </h2>
                         <Button onClick={() => handleOpenForm()}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nouveau rendez-vous
                        </Button>
                    </div>
                </header>

                 <div className="flex-1 grid grid-cols-[auto_1fr] overflow-auto border rounded-lg bg-background">
                    <div className="bg-muted/50">
                        <div className="h-16 border-b"></div>
                        {hours.map(hour => (
                             <div key={hour} className="h-20 text-center border-b flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">{hour}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 relative">
                        {weekDays.map(day => (
                            <div key={day.toString()} className="border-l relative">
                                <div className="h-16 border-b p-2 text-center sticky top-0 bg-background z-10">
                                    <p className="text-sm text-muted-foreground">{format(day, 'EEE', { locale: fr })}</p>
                                    <p className={`text-2xl font-bold ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                                        {format(day, 'd')}
                                    </p>
                                </div>
                                <div className="h-full">
                                    {hours.map((hour) => (
                                        <div key={`${day.toString()}-${hour}`} className="h-20 border-b"></div>
                                    ))}
                                </div>
                                 {appointments?.filter(app => isSameDay(new Date(app.start), day)).map(app => {
                                    const start = new Date(app.start);
                                    const end = new Date(app.end);
                                    const top = ((getHours(start) - startHour) * 60 + getMinutes(start)) / (13 * 60) * 100;
                                    const height = (end.getTime() - start.getTime()) / (1000 * 60) / (13 * 60) * 100;

                                    return (
                                        <div
                                            key={app.id}
                                            onClick={() => handleOpenForm(app)}
                                            className="absolute w-[calc(100%-4px)] left-[2px] bg-primary/20 border-l-4 border-primary p-2 rounded-r-lg overflow-hidden cursor-pointer"
                                            style={{ top: `${top}%`, height: `${height}%`}}
                                        >
                                            <p className="font-bold text-xs truncate">{app.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{app.clientName}</p>
                                        </div>
                                    )
                                 })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-lg flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingAppointment ? "Modifier" : "Nouveau"} rendez-vous</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 pr-6 -mr-6">
                    <Form {...form}>
                        <form id="appointment-form" onSubmit={form.handleSubmit(handleSaveAppointment)} className="space-y-4 py-4">
                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="clientId" render={({ field }) => (
                                 <FormItem><FormLabel>Client</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                            {field.value ? clients?.find(c => c.id === field.value)?.email : "Sélectionner un client"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                                            <CommandInput placeholder="Rechercher..." />
                                            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                                            <CommandGroup><CommandList>{clients?.map((client) => (<CommandItem value={client.email} key={client.id} onSelect={() => form.setValue("clientId", client.id)}>
                                                <Check className={cn("mr-2 h-4 w-4", client.id === field.value ? "opacity-100" : "opacity-0")} />
                                                {client.firstName} {client.lastName}
                                            </CommandItem>))}</CommandList></CommandGroup>
                                        </Command></PopoverContent>
                                    </Popover>
                                <FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-2 gap-4">
                                 <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" value={format(field.value, 'yyyy-MM-dd')} onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="startTime" render={({ field }) => (<FormItem><FormLabel>Heure de début</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={form.control} name="duration" render={({ field }) => (<FormItem><FormLabel>Durée (en minutes)</FormLabel><FormControl><Input type="number" step="15" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="details" render={({ field }) => (<FormItem><FormLabel>Détails</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="sendConfirmation" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Envoyer un e-mail de confirmation au client</FormLabel></div></FormItem>)}/>
                        </form>
                    </Form>
                    </ScrollArea>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                        <Button type="submit" form="appointment-form" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sauvegarder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

