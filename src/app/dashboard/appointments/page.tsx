
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { add, format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks, parseISO, getHours, getMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, PlusCircle, Edit, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query, doc, where } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

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
  start: z.string().min(1, "L'heure de début est requise."),
  end: z.string().min(1, "L'heure de fin est requise."),
  details: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

const hours = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);
const startHour = 8;
const hourHeightInRem = 5;

export default function AppointmentsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
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

    useEffect(() => {
        if (isSheetOpen) {
            if (editingAppointment) {
                form.reset({
                    title: editingAppointment.title,
                    start: editingAppointment.start.slice(0, 16),
                    end: editingAppointment.end.slice(0, 16),
                    details: editingAppointment.details || '',
                });
                setSelectedClient({ id: editingAppointment.clientId, name: editingAppointment.clientName });
            } else {
                form.reset({ title: '', start: '', end: '', details: '' });
                setSelectedClient(null);
            }
        }
    }, [isSheetOpen, editingAppointment, form]);
    
    const handleSaveAppointment = async (data: AppointmentFormData) => {
        if (!user || (!selectedClient && !editingAppointment)) {
            toast({ title: 'Erreur', description: 'Veuillez sélectionner un client.', variant: 'destructive'});
            return;
        }
        
        setIsSubmitting(true);

        const appointmentData = {
            ...data,
            start: new Date(data.start).toISOString(),
            end: new Date(data.end).toISOString(),
            clientId: selectedClient?.id || editingAppointment?.clientId,
            clientName: selectedClient?.name || editingAppointment?.clientName,
            details: data.details || '',
        };

        try {
            if (editingAppointment) {
                const appointmentRef = doc(firestore, `users/${user.uid}/appointments`, editingAppointment.id);
                await setDocumentNonBlocking(appointmentRef, appointmentData, { merge: true });
                toast({ title: 'Rendez-vous mis à jour' });
            } else {
                await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/appointments`), appointmentData);
                toast({ title: 'Rendez-vous créé' });
            }
            setIsSheetOpen(false);
        } catch (error) {
            console.error("Error saving appointment: ", error);
            toast({ title: 'Erreur', description: 'Impossible d\'enregistrer le rendez-vous.', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }, [currentDate]);

    const firstDayCurrentWeek = weekDays[0];

    const handlePreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const handleToday = () => setCurrentDate(new Date());

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
                     <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Ajouter un rendez-vous
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
                            <DialogHeader>
                                <DialogTitle>{editingAppointment ? 'Modifier le' : 'Nouveau'} rendez-vous</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleSaveAppointment)} className="flex-1 flex flex-col overflow-hidden">
                                     <ScrollArea className="flex-1 pr-6 -mr-6">
                                        <div className="space-y-6 py-4">
                                            <ClientSelector clients={clients || []} onClientSelect={setSelectedClient} isLoading={areClientsLoading} defaultValue={editingAppointment ? {id: editingAppointment.clientId, name: editingAppointment.clientName} : undefined} />
                                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre du rendez-vous</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="start" render={({ field }) => (<FormItem><FormLabel>Début</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name="end" render={({ field }) => (<FormItem><FormLabel>Fin</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <FormField control={form.control} name="details" render={({ field }) => (<FormItem><FormLabel>Détails</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </ScrollArea>
                                    <DialogFooter className="pt-4 border-t mt-auto">
                                        <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>Annuler</Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                            Sauvegarder
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                    <h2 className="font-semibold text-xl capitalize hidden md:block">
                        {format(firstDayCurrentWeek, 'MMMM yyyy', { locale: fr })}
                    </h2>
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
                                        className="h-20 border-b"
                                    ></div>
                                ))}
                            </div>
                            {appointments?.filter(app => app.start && isSameDay(parseISO(app.start), day)).map(app => {
                                 if (!app.start || !app.end) return null;
                                const start = parseISO(app.start);
                                const end = parseISO(app.end);
                                
                                const topOffsetInMinutes = (getHours(start) - startHour) * 60 + getMinutes(start);
                                const top = (topOffsetInMinutes / 60) * hourHeightInRem;

                                const durationMinutes = (end.getTime() - start.getTime()) / 60000;
                                const height = (durationMinutes / 60) * hourHeightInRem;

                                return (
                                    <div
                                        key={app.id}
                                        className="absolute w-[calc(100%-4px)] left-[2px] bg-primary/20 border-l-4 border-primary p-2 rounded-r-lg overflow-hidden cursor-pointer"
                                        style={{
                                            top: `calc(4rem + ${top}rem)`,
                                            height: `${height}rem`,
                                        }}
                                        onClick={() => handleEditAppointment(app)}
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
    );

    function handleEditAppointment(appointment: Appointment) {
        setEditingAppointment(appointment);
        setIsSheetOpen(true);
    }
}

function ClientSelector({ clients, onClientSelect, isLoading, defaultValue }: { clients: Client[], onClientSelect: (client: {id: string, name: string}) => void, isLoading: boolean, defaultValue?: {id: string, name: string} }) {
    const [open, setOpen] = useState(false);
    const [selectedClientName, setSelectedClientName] = useState<string | null>(defaultValue?.name || null);

    useEffect(() => {
        setSelectedClientName(defaultValue?.name || null);
    }, [defaultValue]);

    const handleSelect = (client: Client) => {
        const clientInfo = {
            id: client.id,
            name: `${client.firstName} ${client.lastName}`
        };
        setSelectedClientName(clientInfo.name);
        onClientSelect(clientInfo);
        setOpen(false);
    }
    
    return (
        <div>
            <Label>Client</Label>
            {isLoading ? <Skeleton className="h-10 w-full" /> : (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                        {selectedClientName || "Sélectionner un client..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                    <Command>
                        <CommandInput placeholder="Rechercher un client..." />
                        <CommandList>
                            <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                            <CommandGroup>
                                {clients.map((client) => (
                                    <CommandItem key={client.id} value={client.email} onSelect={() => handleSelect(client)}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedClientName === `${client.firstName} ${client.lastName}` ? "opacity-100" : "opacity-0")}/>
                                        <div>
                                            <p>{client.firstName} {client.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{client.email}</p>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            )}
        </div>
    );
}
