
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parse,
  startOfWeek,
  subDays,
  addDays,
  startOfToday,
  parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { cn } from '@/lib/utils';
import { PlusCircle, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { sendConfirmationEmails } from '@/app/actions/appointment';
import { useAgency } from '@/context/agency-provider';
import { Checkbox } from '@/components/ui/checkbox';


const appointmentSchema = z.object({
    title: z.string().min(1, "Le titre est requis."),
    date: z.string(),
    time: z.string().min(1, "L'heure est requise."),
    duration: z.coerce.number().min(1, "La durée doit être d'au moins 1 minute."),
    clientId: z.string().optional(),
    description: z.string().optional(),
    sendConfirmation: z.boolean().default(false),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

type Appointment = {
    id: string;
    title: string;
    start: string;
    end: string;
    clientId?: string;
    clientName?: string;
    description?: string;
};

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
};


function AppointmentForm({
  selectedDate,
  clients,
  onSave,
  onCancel,
  existingAppointments,
  editingAppointment,
}: {
  selectedDate: Date;
  clients: Client[];
  onSave: (data: AppointmentFormData) => Promise<void>;
  onCancel: () => void;
  existingAppointments: Appointment[];
  editingAppointment: Appointment | null;
}) {
    const form = useForm<AppointmentFormData>({
        resolver: zodResolver(appointmentSchema),
    });

     useEffect(() => {
        if (editingAppointment) {
            const start = parseISO(editingAppointment.start);
            const end = parseISO(editingAppointment.end);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60);

            form.reset({
                title: editingAppointment.title,
                date: format(start, 'yyyy-MM-dd'),
                time: format(start, 'HH:mm'),
                duration: duration,
                clientId: editingAppointment.clientId || '',
                description: editingAppointment.description || '',
                sendConfirmation: false
            });
        } else {
             form.reset({
                date: format(selectedDate, 'yyyy-MM-dd'),
                title: '',
                time: '09:00',
                duration: 60,
                clientId: '',
                description: '',
                sendConfirmation: false,
            });
        }
    }, [editingAppointment, selectedDate, form]);

    const checkOverlap = (start: Date, end: Date) => {
        for (const app of existingAppointments) {
            // Skip the appointment being edited
            if (editingAppointment && app.id === editingAppointment.id) continue;

            const existingStart = parseISO(app.start);
            const existingEnd = parseISO(app.end);
            if (start < existingEnd && end > existingStart) {
                return true; // Overlap detected
            }
        }
        return false;
    };
    
     const handleSave = async (data: AppointmentFormData) => {
        const startDateTime = parse(`${data.date} ${data.time}`, 'yyyy-MM-dd HH:mm', new Date());
        const endDateTime = new Date(startDateTime.getTime() + data.duration * 60 * 1000);
        
        if (checkOverlap(startDateTime, endDateTime)) {
            form.setError("time", { type: 'manual', message: 'Ce créneau est déjà pris ou chevauche un autre rendez-vous.' });
            return;
        }

        await onSave(data);
    };

    return (
      <DialogContent className="sm:max-w-lg flex flex-col">
        <DialogHeader>
          <DialogTitle>{editingAppointment ? 'Modifier' : 'Nouveau'} rendez-vous</DialogTitle>
          <DialogDescription>
            {editingAppointment ? 'Modifiez les détails' : `Ajouter pour le ${format(selectedDate, 'PPP', { locale: fr })}`}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-6 -mr-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="time" render={({ field }) => (
                            <FormItem><FormLabel>Heure (HH:mm)</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="duration" render={({ field }) => (
                            <FormItem><FormLabel>Durée (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                     <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Client (Optionnel)</FormLabel>
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
                                        <CommandList><CommandEmpty>Aucun client trouvé.</CommandEmpty><CommandGroup>
                                            {clients.map((client) => (
                                                <CommandItem value={client.email} key={client.id} onSelect={() => form.setValue("clientId", client.id)}>
                                                    <Check className={cn("mr-2 h-4 w-4", client.id === field.value ? "opacity-100" : "opacity-0")} />
                                                    <div>
                                                        <p>{client.firstName} {client.lastName}</p>
                                                        <p className="text-xs text-muted-foreground">{client.email}</p>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup></CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description (Optionnel)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField
                        control={form.control}
                        name="sendConfirmation"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                Envoyer une confirmation par e-mail au client
                                </FormLabel>
                            </div>
                            </FormItem>
                        )}
                        />
                     <DialogFooter className="sticky bottom-0 bg-background pt-4 z-10">
                        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
                        <Button type="submit">Enregistrer</Button>
                    </DialogFooter>
                </form>
            </Form>
        </div>
      </DialogContent>
    );
}

export default function AppointmentsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { personalization } = useAgency();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedDateForNew, setSelectedDateForNew] = useState<Date>(new Date());
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

    let today = startOfToday()
    let [currentDate, setCurrentDate] = useState(today);

    const firstDayCurrentWeek = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    
    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

    const appointmentsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/appointments`));
    }, [user, firestore]);

    const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsQuery);

    const clientsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);

    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);

    const days = useMemo(() => eachDayOfInterval({
        start: firstDayCurrentWeek,
        end: endOfWeek(firstDayCurrentWeek, { weekStartsOn: 1 }),
    }), [firstDayCurrentWeek]);

    const appointmentsByDay = useMemo(() => {
        const grouped: { [key: string]: Appointment[] } = {};
        if (!appointments) return grouped;
        appointments.forEach(app => {
            if (app.start) {
                try {
                    const dateKey = format(parseISO(app.start), 'yyyy-MM-dd');
                    if (!grouped[dateKey]) {
                        grouped[dateKey] = [];
                    }
                    grouped[dateKey].push(app);
                } catch(e) {
                    console.error("Invalid date format for appointment:", app.id, app.start);
                }
            }
        });
        Object.values(grouped).forEach(dayApps => dayApps.sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime()));
        return grouped;
    }, [appointments]);

    const handlePreviousWeek = () => setCurrentDate(subDays(currentDate, 7));
    const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const handleToday = () => setCurrentDate(new Date());

    const handleAddAppointmentClick = (day: Date) => {
        setEditingAppointment(null);
        setSelectedDateForNew(day);
        setIsFormOpen(true);
    };

    const handleEditAppointment = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setIsFormOpen(true);
    };
    
    const handleSaveAppointment = async (data: AppointmentFormData) => {
        if (!user || !clients || !userData) return;
        
        const startDateTime = parse(`${data.date} ${data.time}`, 'yyyy-MM-dd HH:mm', new Date());
        const endDateTime = new Date(startDateTime.getTime() + data.duration * 60 * 1000);

        const client = clients.find(c => c.id === data.clientId);

        try {
            const appointmentRef = editingAppointment
                ? doc(firestore, `users/${user.uid}/appointments`, editingAppointment.id)
                : doc(collection(firestore, `users/${user.uid}/appointments`));

            const appointmentData = {
                id: appointmentRef.id,
                title: data.title,
                start: startDateTime.toISOString(),
                end: endDateTime.toISOString(),
                clientId: data.clientId || null,
                clientName: client ? `${client.firstName} ${client.lastName}` : 'N/A',
                description: data.description || null,
                status: 'scheduled',
                coachId: user.uid,
            };

            await setDoc(appointmentRef, appointmentData, { merge: true });

            if (data.sendConfirmation && client) {
                 const emailSettings = (userData as any)?.emailSettings?.fromEmail ? (userData as any).emailSettings : personalization?.emailSettings;
                if(!emailSettings?.fromEmail) {
                    toast({ title: "Configuration e-mail manquante", description: "Impossible d'envoyer l'e-mail de confirmation.", variant: "destructive"});
                } else {
                     await sendConfirmationEmails({
                        appointment: {
                            title: data.title,
                            start: startDateTime.toISOString(),
                            description: data.description || '',
                        },
                        client: { name: `${client.firstName} ${client.lastName}`, email: client.email },
                        counselor: { name: emailSettings.fromName, email: emailSettings.fromEmail },
                        emailSettings: emailSettings,
                    });
                }
            }

            toast({ title: editingAppointment ? "Rendez-vous mis à jour" : "Rendez-vous ajouté" });
            setIsFormOpen(false);
            setEditingAppointment(null);
        } catch (error) {
             toast({ title: "Erreur", description: "Impossible de sauvegarder le rendez-vous", variant: "destructive" });
        }
    };
    
    const handleDeleteAppointment = (appointmentId: string) => {
        if (!user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/appointments`, appointmentId));
        toast({ title: 'Rendez-vous supprimé' });
    };

    const timeSlots = [];
    for (let i = 4; i <= 22; i++) {
        timeSlots.push(`${i}:30`);
        if (i < 23) {
            timeSlots.push(`${i + 1}:00`);
        }
    }


    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col">
             <header className="flex flex-none items-center justify-between border-b border-border px-6 py-4">
                <div>
                     <h1 className="text-base font-semibold leading-6 text-foreground capitalize">
                        {format(firstDayCurrentWeek, 'MMMM yyyy', { locale: fr })}
                     </h1>
                     <p className="mt-1 text-sm text-muted-foreground">
                        Vue hebdomadaire
                     </p>
                </div>
                <div className="flex items-center gap-2">
                     <Button variant="outline" size="sm" onClick={handleToday}>Aujourd'hui</Button>
                    <div className="flex items-center rounded-md md:items-stretch">
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-r-none" onClick={handlePreviousWeek}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-l-none" onClick={handleNextWeek}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                     <Button onClick={() => handleAddAppointmentClick(new Date())}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Rendez-vous
                    </Button>
                </div>
            </header>
            <div className="isolate flex flex-auto flex-col overflow-auto bg-background">
                <div className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
                     <div className="sticky top-0 z-30 flex-none bg-background shadow ring-1 ring-black ring-opacity-5">
                        <div className="grid grid-cols-[auto,1fr,1fr,1fr,1fr,1fr,1fr,1fr]">
                            <div className="col-start-1 row-start-1 border-r border-border bg-background w-14" />
                            {days.map((day) => (
                                <div key={day.toString()} className="flex items-center justify-center py-3 border-b border-border">
                                    <span className={cn('text-sm', isToday(day) && 'text-primary')}>{format(day, 'EEE', {locale: fr})}</span>
                                    <span className={cn('ml-1.5 flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold', isToday(day) && 'bg-primary text-primary-foreground')}>{format(day, 'd')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-auto">
                        <div className="sticky left-0 z-10 w-14 flex-none bg-background ring-1 ring-border" />
                        <div className="grid flex-auto grid-cols-1 grid-rows-1">
                            {/* Horizontal lines and time markers */}
                            <div
                                className="col-start-1 col-end-2 row-start-1 grid divide-y divide-border"
                                style={{ gridTemplateRows: 'repeat(38, minmax(3.5rem, 1fr))' }}
                            >
                                <div className="row-end-1 h-7"></div>
                                {timeSlots.map((time) => (
                                    <div key={time}>
                                        <div className="sticky left-0 z-20 -ml-14 -mt-2.5 w-14 pr-2 text-right text-xs leading-5 text-muted-foreground">
                                            {time}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Vertical lines for days */}
                            <div className="col-start-1 col-end-2 row-start-1 grid grid-cols-7 grid-rows-1 divide-x divide-border">
                                {days.map((day) => (
                                     <div key={day.toISOString()} className="row-start-1 h-full relative">
                                        {(appointmentsByDay[format(day, 'yyyy-MM-dd')] || []).map(app => (
                                            <Meeting key={app.id} appointment={app} onEdit={() => handleEditAppointment(app)} onDelete={() => handleDeleteAppointment(app.id)} />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                 <AppointmentForm 
                    selectedDate={selectedDateForNew} 
                    clients={clients || []}
                    onSave={handleSaveAppointment}
                    onCancel={() => setIsFormOpen(false)}
                    existingAppointments={appointments || []}
                    editingAppointment={editingAppointment}
                />
            </Dialog>
        </div>
    );
}


const Meeting = ({ appointment, onEdit, onDelete }: { appointment: Appointment, onEdit: () => void, onDelete: () => void }) => {
    const start = parseISO(appointment.start);
    const end = parseISO(appointment.end);
    
    const startHour = 4.5;
    const totalMinutes = (start.getHours() + start.getMinutes() / 60) - startHour;
    const top = totalMinutes * (3.5 * 2); // 3.5rem per 30min slot

    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const height = (durationMinutes / 30) * 3.5;

    return (
        <li
            className="relative mt-px flex px-1"
            style={{ top: `${top}rem`, height: `${height}rem` }}
        >
            <div
              className="group absolute inset-1 flex cursor-pointer flex-col overflow-y-auto rounded-lg bg-primary/10 p-2 text-xs leading-5 hover:bg-primary/20"
              onClick={onEdit}
            >
                <p className="font-semibold text-primary">{appointment.title}</p>
                <p className="text-primary/80">{appointment.clientName}</p>
                <p className="text-primary/50">
                    <time dateTime={appointment.start}>{format(start, 'HH:mm')}</time> -{' '}
                    <time dateTime={appointment.end}>{format(end, 'HH:mm')}</time>
                </p>
                 <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-destructive/20">
                    <Trash2 className="h-4 w-4 text-destructive" />
                </button>
            </div>
        </li>
    );
};
