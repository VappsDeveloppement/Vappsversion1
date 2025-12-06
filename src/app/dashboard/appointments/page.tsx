
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { add, format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks, parseISO, set, getHours, getMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

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
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;


const hours = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

export default function AppointmentsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

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
            const startDate = parseISO(appointment.start);
            form.reset({
                title: appointment.title,
                clientId: appointment.clientId,
                date: startDate,
                startTime: format(startDate, 'HH:mm'),
                duration: (parseISO(appointment.end).getTime() - startDate.getTime()) / 60000,
                details: appointment.details,
            });
        } else {
            form.reset({
                title: '',
                clientId: '',
                date: date || new Date(),
                startTime: time || '09:00',
                duration: 60,
                details: '',
            });
        }
        setIsFormOpen(true);
    };

    const checkOverlap = (start: Date, end: Date) => {
        if (!appointments) return false;
        for (const app of appointments) {
            if (editingAppointment && app.id === editingAppointment.id) continue;
            if (!app.start || !app.end) continue;
            const existingStart = parseISO(app.start);
            const existingEnd = parseISO(app.end);
            if (start < existingEnd && end > existingStart) {
                return true;
            }
        }
        return false;
    };
    
    const handleSaveAppointment = async (data: AppointmentFormData) => {
        if (!user) return;
        setIsSubmitting(true);
    
        const [hours, minutes] = data.startTime.split(':').map(Number);
        const start = set(data.date, { hours, minutes, seconds: 0, milliseconds: 0 });
        const end = add(start, { minutes: data.duration });
    
        if (checkOverlap(start, end)) {
            toast({
                title: "Conflit d'horaire",
                description: "Ce créneau est déjà occupé par un autre rendez-vous.",
                variant: "destructive",
            });
            setIsSubmitting(false);
            return;
        }
    
        // Correctly determine client name and ID
        let clientName: string;
        let clientId: string = data.clientId; // Start with the form's client ID
    
        const client = clients?.find(c => c.id === clientId);
    
        if (client) {
            // A client was found from the selection
            clientName = `${client.firstName} ${client.lastName}`;
        } else if (editingAppointment) {
            // We are editing, and maybe the client wasn't re-selected.
            // Use the original appointment's client info as a fallback.
            clientName = editingAppointment.clientName;
            clientId = editingAppointment.clientId;
        } else {
            // We are creating a new appointment and the selected client is not valid.
            toast({ title: "Client non trouvé", description: "Le client sélectionné est invalide.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
    
        const appointmentData = {
            title: data.title,
            start: start.toISOString(),
            end: end.toISOString(),
            clientId: clientId,
            clientName: clientName,
            details: data.details,
            counselorId: user.uid
        };
    
        try {
            const appointmentRef = editingAppointment
                ? doc(firestore, `users/${user.uid}/appointments`, editingAppointment.id)
                : doc(collection(firestore, `users/${user.uid}/appointments`));
    
            await setDocumentNonBlocking(appointmentRef, appointmentData, { merge: true });
            
            toast({ title: editingAppointment ? "Rendez-vous mis à jour" : "Rendez-vous créé" });
            setIsFormOpen(false);
    
        } catch (error) {
            console.error("Save appointment error:", error);
            toast({ title: "Erreur", description: "Impossible de sauvegarder le rendez-vous.", variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Grid constants
    const startHour = 8;
    const hourHeightInRem = 5; // Corresponds to h-20
    
    return (
        <div className="flex flex-col h-full">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
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
                    <h2 className="font-semibold text-xl capitalize hidden md:block">
                        {format(firstDayCurrentWeek, 'MMMM yyyy', { locale: fr })}
                    </h2>
                     <Button onClick={() => handleOpenForm()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nouveau
                    </Button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-[auto_1fr] overflow-auto border rounded-lg bg-background">
                <div className="bg-muted/50 sticky left-0 z-20">
                     <div className="h-16 border-b flex items-center justify-center font-semibold">
                       Heures
                    </div>
                    {hours.map(hour => (
                         <div key={hour} className="h-20 text-center border-b flex items-center justify-center">
                            <span className="text-xs text-muted-foreground -translate-y-1/2">{hour}</span>
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
                                {hours.map((hour, hourIndex) => (
                                    <div 
                                        key={`${day.toString()}-${hour}`} 
                                        className="h-20 border-b cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleOpenForm(null, day, hour)}
                                    ></div>
                                ))}
                            </div>
                            {appointments?.filter(app => app.start && app.end && isSameDay(parseISO(app.start), day)).map(app => {
                                const start = parseISO(app.start);
                                const end = parseISO(app.end);
                                
                                const topOffsetInMinutes = (getHours(start) - startHour) * 60 + getMinutes(start);
                                const top = (topOffsetInMinutes / 60) * hourHeightInRem;

                                const durationMinutes = (end.getTime() - start.getTime()) / 60000;
                                const height = (durationMinutes / 60) * hourHeightInRem;

                                return (
                                    <div
                                        key={app.id}
                                        onClick={() => handleOpenForm(app)}
                                        className="absolute w-[calc(100%-4px)] left-[2px] bg-primary/20 border-l-4 border-primary p-2 rounded-r-lg overflow-hidden cursor-pointer"
                                        style={{
                                            top: `calc(4rem + ${top}rem)`,
                                            height: `${height}rem`,
                                        }}
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

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                 <DialogContent className="sm:max-w-lg flex flex-col h-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{editingAppointment ? "Modifier" : "Nouveau"} rendez-vous</DialogTitle>
                    </DialogHeader>
                     <Form {...form}>
                        <form id="appointment-form" onSubmit={form.handleSubmit(handleSaveAppointment)} className="flex-1 overflow-hidden flex flex-col">
                           <ScrollArea className="flex-1 pr-6 -mr-6">
                                <div className="space-y-4 py-4">
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
                                                    <CommandList>
                                                        <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                                                        <CommandGroup>{clients?.map((client) => (<CommandItem value={client.email} key={client.id} onSelect={() => form.setValue("clientId", client.id)}>
                                                            <Check className={cn("mr-2 h-4 w-4", client.id === field.value ? "opacity-100" : "opacity-0")} />
                                                            {client.firstName} {client.lastName}
                                                        </CommandItem>))}</CommandGroup>
                                                    </CommandList>
                                                </Command></PopoverContent>
                                            </Popover>
                                        <FormMessage /></FormItem>
                                    )}/>
                                    <div className="grid grid-cols-2 gap-4">
                                         <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(parseISO(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="startTime" render={({ field }) => (<FormItem><FormLabel>Heure de début</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <FormField control={form.control} name="duration" render={({ field }) => (<FormItem><FormLabel>Durée (en minutes)</FormLabel><FormControl><Input type="number" step="15" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="details" render={({ field }) => (<FormItem><FormLabel>Détails (optionnel)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                           </ScrollArea>
                            <DialogFooter className="pt-4 border-t">
                                <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sauvegarder
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    