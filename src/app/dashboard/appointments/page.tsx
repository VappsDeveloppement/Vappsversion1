'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  add,
  sub,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Clock, User, Trash2, Edit, Save, X, Loader2 } from 'lucide-react';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types
type Appointment = {
  id: string;
  title: string;
  start: string;
  end: string;
  clientId: string;
  clientName: string;
  details?: string;
  counselorId: string;
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
  date: z.date({ required_error: "La date est requise."}),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:mm)."),
  duration: z.coerce.number().min(15, "La durée doit être d'au moins 15 minutes."),
  details: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

const hours = Array.from({ length: (23 - 4) * 2 + 1 }, (_, i) => {
    const totalMinutes = 4.5 * 60 + i * 30;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});


export default function AppointmentsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [formInitialDate, setFormInitialDate] = useState<Date | null>(null);

    const appointmentsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'appointments'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

    const clientsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }, [currentDate]);

    const firstDayCurrentWeek = weekDays[0];

    const appointmentsByDay = useMemo(() => {
        const mapped: { [key: string]: Appointment[] } = {};
        weekDays.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            mapped[dayKey] = (appointments || []).filter(app => isSameDay(parseISO(app.start), day));
        });
        return mapped;
    }, [weekDays, appointments]);

    const calculateTopAndHeight = (start: string, end: string) => {
        const startTime = parseISO(start);
        const endTime = parseISO(end);
        
        const startHour = 4.5;
        const totalMinutesInDay = (23 - startHour) * 60;

        const startMinutes = getHours(startTime) * 60 + getMinutes(startTime) - startHour * 60;
        const endMinutes = getHours(endTime) * 60 + getMinutes(endTime) - startHour * 60;
        
        const top = (startMinutes / totalMinutesInDay) * 100;
        const height = ((endMinutes - startMinutes) / totalMinutesInDay) * 100;
        
        return { top: `${top}%`, height: `${height}%` };
    };

    const handleOpenForm = (appointment: Appointment | null, date?: Date) => {
        setEditingAppointment(appointment);
        setFormInitialDate(date || new Date());
        setIsFormOpen(true);
    };

    const handleDeleteAppointment = (appointmentId: string) => {
        const appRef = doc(firestore, 'appointments', appointmentId);
        deleteDocumentNonBlocking(appRef);
        toast({title: "Rendez-vous supprimé"});
    };

    const isLoading = areAppointmentsLoading || areClientsLoading;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-headline">Agenda</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(sub(currentDate, { weeks: 1 }))}><ChevronLeft /></Button>
                        <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Aujourd'hui</Button>
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(add(currentDate, { weeks: 1 }))}><ChevronRight /></Button>
                    </div>
                     <h2 className="font-semibold text-xl capitalize">
                        {format(firstDayCurrentWeek, 'MMMM yyyy', { locale: fr })}
                    </h2>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-[auto,1fr] grid-rows-[auto,1fr] overflow-hidden">
                {/* Corner */}
                <div className="border-r border-b"></div>

                {/* Day headers */}
                <div className="grid grid-cols-7 border-b">
                    {weekDays.map(day => (
                        <div key={day.toString()} className="p-2 text-center border-r last:border-r-0">
                            <p className="text-sm text-muted-foreground">{format(day, 'EEE', { locale: fr })}</p>
                            <p className={`text-2xl font-bold ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                                {format(day, 'd')}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Hour labels */}
                <div className="relative pr-2 border-r">
                    {hours.map(hour => {
                        const isHalfHour = hour.endsWith(':30');
                        return (
                            <div key={hour} className={`relative h-12 text-right text-xs text-muted-foreground ${isHalfHour ? '' : 'border-t -mt-px'}`}>
                                <span className="absolute -top-2 right-2">{!isHalfHour && hour}</span>
                            </div>
                        )
                    })}
                </div>

                {/* Calendar grid */}
                <div className="relative grid grid-cols-7 col-start-2 overflow-auto">
                    {/* Background lines */}
                    {hours.map(hour => (
                        <React.Fragment key={hour}>
                            {Array.from({length: 7}).map((_, i) => (
                                <div key={`${hour}-${i}`} className="h-12 border-r last:border-r-0 border-t" />
                            ))}
                        </React.Fragment>
                    ))}
                    
                    {/* Appointments */}
                    {weekDays.map((day, index) => (
                        <div key={day.toString()} className="relative col-start-1" style={{ gridColumnStart: index + 1 }}>
                            {appointmentsByDay[format(day, 'yyyy-MM-dd')]?.map(app => {
                                const { top, height } = calculateTopAndHeight(app.start, app.end);
                                return (
                                    <div
                                        key={app.id}
                                        className="absolute w-full p-2"
                                        style={{ top, height, left: '2px', right: '2px' }}
                                        onClick={() => handleOpenForm(app)}
                                    >
                                        <div className="bg-primary/20 border border-primary/50 rounded-lg p-2 h-full overflow-hidden text-xs">
                                            <p className="font-bold truncate text-primary">{app.title}</p>
                                            <p className="truncate">{app.clientName}</p>
                                            <p className="text-muted-foreground truncate">{format(parseISO(app.start), 'HH:mm')} - {format(parseISO(app.end), 'HH:mm')}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                </div>
            </div>

            {isFormOpen && (
                <AppointmentForm 
                    isOpen={isFormOpen}
                    setIsOpen={setIsFormOpen}
                    clients={clients || []}
                    editingAppointment={editingAppointment}
                    initialDate={formInitialDate}
                    allAppointments={appointments || []}
                />
            )}
        </div>
    );
}

// AppointmentForm Component
interface AppointmentFormProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    clients: Client[];
    editingAppointment: Appointment | null;
    initialDate: Date | null;
    allAppointments: Appointment[];
}

function AppointmentForm({ isOpen, setIsOpen, clients, editingAppointment, initialDate, allAppointments }: AppointmentFormProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<AppointmentFormData>({
        resolver: zodResolver(appointmentSchema)
    });

    useEffect(() => {
        if (editingAppointment) {
            const start = parseISO(editingAppointment.start);
            const end = parseISO(editingAppointment.end);
            form.reset({
                title: editingAppointment.title,
                clientId: editingAppointment.clientId,
                date: start,
                startTime: format(start, 'HH:mm'),
                duration: (end.getTime() - start.getTime()) / (1000 * 60),
                details: editingAppointment.details,
            });
        } else {
             form.reset({
                title: '',
                clientId: '',
                date: initialDate || new Date(),
                startTime: '09:00',
                duration: 60,
                details: '',
            });
        }
    }, [editingAppointment, initialDate, form]);

    const checkOverlap = (start: Date, end: Date) => {
        for (const app of allAppointments) {
            if (editingAppointment && app.id === editingAppointment.id) continue;
            if(!app.start || !app.end) continue;
            const existingStart = parseISO(app.start);
            const existingEnd = parseISO(app.end);
            if (start < existingEnd && end > existingStart) {
                return true; 
            }
        }
        return false;
    };
    
    const handleSave = async (data: AppointmentFormData) => {
        if (!user) return;
        setIsSubmitting(true);

        const [hours, minutes] = data.startTime.split(':').map(Number);
        const start = setMinutes(setHours(data.date, hours), minutes);
        const end = add(start, { minutes: data.duration });

        if (checkOverlap(start, end)) {
            toast({
                variant: 'destructive',
                title: "Conflit de rendez-vous",
                description: "Le créneau horaire sélectionné est déjà pris.",
            });
            setIsSubmitting(false);
            return;
        }

        const client = clients.find(c => c.id === data.clientId);
        if (!client) {
            setIsSubmitting(false);
            return;
        }
        
        const appointmentData = {
            counselorId: user.uid,
            title: data.title,
            clientId: data.clientId,
            clientName: `${client.firstName} ${client.lastName}`,
            start: start.toISOString(),
            end: end.toISOString(),
            details: data.details,
        };

        try {
            if (editingAppointment) {
                const appRef = doc(firestore, 'appointments', editingAppointment.id);
                await setDocumentNonBlocking(appRef, appointmentData, { merge: true });
                toast({ title: "Rendez-vous mis à jour" });
            } else {
                await addDocumentNonBlocking(collection(firestore, 'appointments'), appointmentData);
                toast({ title: "Rendez-vous créé" });
            }
            setIsOpen(false);
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de sauvegarder le rendez-vous.", variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-xl flex flex-col">
                <DialogHeader>
                    <DialogTitle>{editingAppointment ? 'Modifier le' : 'Nouveau'} rendez-vous</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)} className="flex-1 flex flex-col overflow-hidden">
                        <ScrollArea className="flex-1 pr-6 -mr-6">
                            <div className="space-y-6 py-4">
                                <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                 <FormField
                                    control={form.control}
                                    name="clientId"
                                    render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Client</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                        {field.value ? clients.find(c => c.id === field.value)?.email : "Sélectionner un client"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Rechercher un client..." />
                                                    <CommandList>
                                                        <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                                                        <CommandGroup>
                                                            {clients.map((client) => (
                                                                <CommandItem value={client.email} key={client.id} onSelect={() => { form.setValue("clientId", client.id) }}>
                                                                    <Check className={cn("mr-2 h-4 w-4", client.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                    <span>{client.firstName} {client.lastName}</span>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Date</FormLabel><FormControl><Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(parseISO(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem><FormLabel>Heure début</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="duration" render={({ field }) => ( <FormItem><FormLabel>Durée (min)</FormLabel><FormControl><Input type="number" step="15" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                </div>
                                <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel>Détails</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                        </ScrollArea>
                        <DialogFooter className="pt-4 border-t mt-auto">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingAppointment ? 'Enregistrer' : 'Créer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
