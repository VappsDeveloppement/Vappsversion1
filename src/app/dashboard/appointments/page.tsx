
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  add,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfWeek,
  subDays,
  addDays
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { cn } from '@/lib/utils';
import { PlusCircle, Trash2, Edit, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';

const appointmentSchema = z.object({
    title: z.string().min(1, "Le titre est requis."),
    date: z.string(),
    time: z.string().optional(),
    clientId: z.string().optional(),
    description: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

type Appointment = {
    id: string;
    title: string;
    start: string;
    end: string;
    clientId?: string;
    description?: string;
};

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
};


function AppointmentForm({ selectedDate, clients, onSave, onCancel }: { selectedDate: Date; clients: Client[]; onSave: (data: AppointmentFormData) => Promise<void>; onCancel: () => void; }) {
    const form = useForm<AppointmentFormData>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: {
            date: format(selectedDate, 'yyyy-MM-dd'),
            title: '',
            time: '',
            clientId: '',
            description: '',
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="time" render={({ field }) => (
                        <FormItem><FormLabel>Heure (HH:mm)</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
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
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
                    <Button type="submit">Enregistrer</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export default function AppointmentsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedDateForNew, setSelectedDateForNew] = useState<Date>(new Date());
    
    let today = new Date();
    let [currentDate, setCurrentDate] = useState(today);

    const firstDayCurrentWeek = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    
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
            const dateKey = format(parseISO(app.start), 'yyyy-MM-dd');
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(app);
        });
        Object.values(grouped).forEach(dayApps => dayApps.sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime()));
        return grouped;
    }, [appointments]);

    const handlePreviousWeek = () => setCurrentDate(subDays(currentDate, 7));
    const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const handleToday = () => setCurrentDate(new Date());

    const handleAddAppointmentClick = (day: Date) => {
        setSelectedDateForNew(day);
        setIsFormOpen(true);
    };
    
    const handleSaveAppointment = async (data: AppointmentFormData) => {
        if (!user) return;
        
        const startDateTime = parseISO(`${data.date}T${data.time || '00:00:00'}`);
        const endDateTime = add(startDateTime, { hours: 1 }); // Default 1 hour duration

        try {
            await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/appointments`), {
                title: data.title,
                start: startDateTime.toISOString(),
                end: endDateTime.toISOString(),
                clientId: data.clientId || null,
                description: data.description || null,
                status: 'scheduled',
                coachId: user.uid,
            });
            toast({ title: "Rendez-vous ajouté" });
            setIsFormOpen(false);
        } catch (error) {
             toast({ title: "Erreur", description: "Impossible d'ajouter le rendez-vous", variant: "destructive" });
        }
    };
    
    const handleDeleteAppointment = (appointmentId: string) => {
        if (!user) return;
        deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/appointments`, appointmentId));
        toast({ title: 'Rendez-vous supprimé' });
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Agenda</h1>
                    <p className="text-muted-foreground">Gérez votre emploi du temps et vos rendez-vous.</p>
                </div>
            </div>
            
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <h2 className="font-semibold text-xl capitalize">
                         {format(firstDayCurrentWeek, 'MMMM yyyy', { locale: fr })}
                    </h2>
                    <div className="flex items-center gap-2">
                         <Button variant="outline" onClick={handleToday}>Aujourd'hui</Button>
                        <Button variant="outline" size="icon" onClick={handlePreviousWeek}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={handleNextWeek}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-7 border-t border-l">
                        {days.map(day => (
                            <div key={day.toString()} className="border-r">
                                <div className={cn("text-center py-2 border-b", isToday(day) && "bg-primary/10 text-primary font-bold")}>
                                    <p className="text-xs uppercase">{format(day, 'EEE', { locale: fr })}</p>
                                    <p className="text-2xl">{format(day, 'd')}</p>
                                </div>
                                 <div className="p-2 h-[60vh] overflow-y-auto space-y-2">
                                     {isLoading ? <Skeleton className="h-16 w-full" /> : 
                                      (appointmentsByDay[format(day, 'yyyy-MM-dd')] || []).map(app => (
                                         <div key={app.id} className="p-2 rounded-md bg-green-100 text-green-800 text-xs group relative">
                                            <p className="font-bold truncate">{app.title}</p>
                                            <p>{format(parseISO(app.start), 'HH:mm')}</p>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteAppointment(app.id)}>
                                                <Trash2 className="h-3 w-3 text-destructive"/>
                                            </Button>
                                         </div>
                                     ))}
                                     <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => handleAddAppointmentClick(day)}>
                                        <PlusCircle className="h-4 w-4 mr-2"/>
                                        Ajouter
                                     </Button>
                                 </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
             </Card>
             
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nouveau rendez-vous</DialogTitle>
                            <DialogDescription>Ajouter un nouveau rendez-vous pour le {format(selectedDateForNew, 'PPP', { locale: fr })}.</DialogDescription>
                        </DialogHeader>
                        <AppointmentForm 
                            selectedDate={selectedDateForNew} 
                            clients={clients || []}
                            onSave={handleSaveAppointment}
                            onCancel={() => setIsFormOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
        </div>
    );
}
