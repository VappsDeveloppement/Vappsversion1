
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { add, format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, PlusCircle, Edit, Trash2, ChevronsUpDown, Check, Calendar as CalendarIcon, Ban } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query, doc, where, writeBatch, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


type Appointment = {
    id: string;
    title: string;
    start: string;
    end: string;
    clientId: string;
    clientName: string;
    details?: string;
    counselorId?: string;
};

type Unavailability = {
    id: string;
    title?: string;
    start: string;
    end: string;
}

type Event = {
    id: string;
    title: string;
    date: string; // This is an ISO string
    isPublic: boolean;
};

type Client = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
};

type UserData = {
    id: string;
    role: 'conseiller' | 'membre';
    counselorIds?: string[];
};

const appointmentSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  start: z.string().min(1, "L'heure de début est requise."),
  end: z.string().min(1, "L'heure de fin est requise."),
  details: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

const unavailabilitySchema = z.object({
  title: z.string().optional(),
  start: z.string().min(1, "L'heure de début est requise."),
  end: z.string().min(1, "L'heure de fin est requise."),
  repeatDays: z.coerce.number().min(0).optional(),
});
type UnavailabilityFormData = z.infer<typeof unavailabilitySchema>;


const hours = Array.from({ length: 20 }, (_, i) => `${(i + 4).toString().padStart(2, '0')}:00`);
const startHour = 4;
const hourHeightInRem = 5;

// Helper to format ISO date string to a local datetime-local input format
const toLocalISOString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
};

export default function AppointmentsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAppointmentSheetOpen, setIsAppointmentSheetOpen] = useState(false);
    const [isUnavailabilitySheetOpen, setIsUnavailabilitySheetOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [unavailabilityToDelete, setUnavailabilityToDelete] = useState<Unavailability | null>(null);
    const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
    const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc<UserData>(userDocRef);

    const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
    const [areAppointmentsLoading, setAreAppointmentsLoading] = useState(true);

    useEffect(() => {
        if (!user || !userData) return;
    
        let unsubscribes: Unsubscribe[] = [];
        const appointmentsMap = new Map<string, Appointment>();
    
        const subscribeToAppointments = (queryPath: any, counselorId?: string) => {
            const q = query(queryPath);
            const unsubscribe = onSnapshot(q, snapshot => {
                snapshot.docChanges().forEach(change => {
                    const docData = change.doc.data();
                    const appointmentId = change.doc.id;
                    if (change.type === 'removed') {
                        appointmentsMap.delete(appointmentId);
                    } else {
                        appointmentsMap.set(appointmentId, { 
                            id: appointmentId, 
                            ...docData,
                            counselorId: docData.counselorId || counselorId,
                        } as Appointment);
                    }
                });
                setAllAppointments(Array.from(appointmentsMap.values()));
                setAreAppointmentsLoading(false);
            }, error => {
                console.error("Error fetching appointments:", error);
                setAreAppointmentsLoading(false);
            });
            unsubscribes.push(unsubscribe);
        };
    
        setAreAppointmentsLoading(true);
    
        if (userData.role === 'conseiller') {
            const queryPath = collection(firestore, `users/${user.uid}/appointments`);
            subscribeToAppointments(queryPath, user.uid);
        } else if (userData.role === 'membre' && userData.counselorIds?.length) {
            userData.counselorIds.forEach(counselorId => {
                const queryPath = query(
                    collection(firestore, `users/${counselorId}/appointments`),
                    where('clientId', '==', user.uid)
                );
                subscribeToAppointments(queryPath, counselorId);
            });
            // If the member has no counselors, we need to ensure loading stops
            if (userData.counselorIds.length === 0) {
              setAreAppointmentsLoading(false);
              setAllAppointments([]);
            }
        } else {
            setAreAppointmentsLoading(false);
            setAllAppointments([]);
        }
    
        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user, userData, firestore]);


    
    const unavailabilitiesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/unavailabilities`));
    }, [user, firestore]);
    const { data: unavailabilities, isLoading: areUnavailabilitiesLoading } = useCollection<Unavailability>(unavailabilitiesQuery);

    const eventsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'events'), where('counselorId', '==', user.uid));
    }, [user, firestore]);
    const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);


    const clientsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users'), where('counselorIds', 'array-contains', user.uid));
    }, [user, firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);

    const appointmentForm = useForm<AppointmentFormData>({
        resolver: zodResolver(appointmentSchema),
    });
    
    const unavailabilityForm = useForm<UnavailabilityFormData>({
        resolver: zodResolver(unavailabilitySchema),
         defaultValues: {
            title: '',
            start: '',
            end: '',
            repeatDays: 0,
        }
    });

    useEffect(() => {
        if (isAppointmentSheetOpen) {
            if (editingAppointment) {
                const localStart = toLocalISOString(new Date(editingAppointment.start));
                const localEnd = toLocalISOString(new Date(editingAppointment.end));
                appointmentForm.reset({
                    title: editingAppointment.title,
                    start: localStart,
                    end: localEnd,
                    details: editingAppointment.details || '',
                });
                setSelectedClient({ id: editingAppointment.clientId, name: editingAppointment.clientName });
            } else {
                appointmentForm.reset({ title: '', start: '', end: '', details: '' });
                setSelectedClient(null);
            }
        }
    }, [isAppointmentSheetOpen, editingAppointment, appointmentForm]);
    
    const handleSaveAppointment = async (data: AppointmentFormData) => {
        if (!user) return;
        
        const clientInfo = selectedClient || (editingAppointment ? {id: editingAppointment.clientId, name: editingAppointment.clientName} : null);

        if (!clientInfo) {
             toast({ title: 'Erreur', description: 'Veuillez sélectionner un client.', variant: 'destructive'});
            return;
        }
        
        const newStart = new Date(data.start);
        const newEnd = new Date(data.end);

        if (newEnd <= newStart) {
            toast({ title: 'Erreur', description: 'La date de fin doit être après la date de début.', variant: 'destructive'});
            return;
        }

        const allBlockedSlots = [...(allAppointments || []), ...(unavailabilities || [])];
        const overlap = allBlockedSlots.some(slot => {
            if (editingAppointment && 'title' in slot && slot.id === editingAppointment.id) {
                return false;
            }
             if (!slot.start || !slot.end) {
                return false;
            }
            const existingStart = parseISO(slot.start);
            const existingEnd = parseISO(slot.end);
            return newStart < existingEnd && existingStart < newEnd;
        });

        if (overlap) {
            toast({ title: 'Conflit de créneau', description: 'Ce créneau horaire est déjà occupé ou indisponible.', variant: 'destructive'});
            return;
        }


        setIsSubmitting(true);

        const appointmentData = {
            ...data,
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
            clientId: clientInfo.id,
            clientName: clientInfo.name,
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
            setIsAppointmentSheetOpen(false);
        } catch (error) {
            console.error("Error saving appointment: ", error);
            toast({ title: 'Erreur', description: "Impossible d'enregistrer le rendez-vous.", variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSaveUnavailability = async (data: UnavailabilityFormData) => {
        if (!user) return;

        setIsSubmitting(true);

        const startDate = new Date(data.start);
        const endDate = new Date(data.end);
        const repeatDays = data.repeatDays || 0;

        const batch = writeBatch(firestore);

        for (let i = 0; i <= repeatDays; i++) {
            const currentStartDate = addDays(startDate, i);
            const currentEndDate = addDays(endDate, i);

            const unavailabilityData = {
                title: data.title || 'Indisponible',
                start: currentStartDate.toISOString(),
                end: currentEndDate.toISOString(),
                counselorId: user.uid,
            };
            const newDocRef = doc(collection(firestore, `users/${user.uid}/unavailabilities`));
            batch.set(newDocRef, unavailabilityData);
        }
        
        try {
            await batch.commit();
            toast({ title: 'Indisponibilité(s) ajoutée(s)' });
            setIsUnavailabilitySheetOpen(false);
            unavailabilityForm.reset();
        } catch (error) {
            toast({ title: 'Erreur', description: "Impossible de sauvegarder l'indisponibilité.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteAppointment = async () => {
        if (!appointmentToDelete || !user) return;
        const counselorId = userData?.role === 'conseiller' ? user.uid : appointmentToDelete.counselorId;
        if (!counselorId) {
             toast({ title: "Erreur", description: "Impossible de trouver le créateur du rendez-vous.", variant: 'destructive' });
             return;
        }

        const appointmentRef = doc(firestore, `users/${counselorId}/appointments`, appointmentToDelete.id);
        
        try {
            await deleteDocumentNonBlocking(appointmentRef);
            toast({ title: "Rendez-vous supprimé" });
            setAppointmentToDelete(null);
            setIsAppointmentSheetOpen(false);
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de supprimer le rendez-vous.", variant: 'destructive' });
        }
    };

    const handleDeleteUnavailability = async () => {
        if (!unavailabilityToDelete || !user) return;
        const unavailabilityRef = doc(firestore, `users/${user.uid}/unavailabilities`, unavailabilityToDelete.id);

        try {
            await deleteDocumentNonBlocking(unavailabilityRef);
            toast({ title: "Créneau débloqué" });
        } catch(error) {
            toast({ title: "Erreur", description: "Impossible de supprimer le créneau.", variant: 'destructive'});
        } finally {
            setUnavailabilityToDelete(null);
        }
    }

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }, [currentDate]);

    const firstDayCurrentWeek = weekDays[0];

    const handlePreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const handleToday = () => setCurrentDate(new Date());
    
    function handleEditAppointment(appointment: Appointment) {
        setEditingAppointment(appointment);
        setIsAppointmentSheetOpen(true);
    }
    
    const isConseiller = userData?.role === 'conseiller';

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
                     {isConseiller && (
                        <>
                            <Dialog open={isUnavailabilitySheetOpen} onOpenChange={setIsUnavailabilitySheetOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary"><Ban className="mr-2 h-4 w-4" />Bloquer un créneau</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Bloquer un créneau</DialogTitle>
                                        <DialogDescription>Définissez une période d'indisponibilité.</DialogDescription>
                                    </DialogHeader>
                                    <Form {...unavailabilityForm}>
                                        <form onSubmit={unavailabilityForm.handleSubmit(handleSaveUnavailability)} className="space-y-4 py-4">
                                            <FormField control={unavailabilityForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Motif (optionnel)</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={unavailabilityForm.control} name="start" render={({ field }) => (<FormItem><FormLabel>Début</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={unavailabilityForm.control} name="end" render={({ field }) => (<FormItem><FormLabel>Fin</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <FormField control={unavailabilityForm.control} name="repeatDays" render={({ field }) => (<FormItem><FormLabel>Répéter pour les X prochains jours</FormLabel><FormControl><Input type="number" min="0" placeholder="0" {...field} value={field.value || 0} /></FormControl><FormMessage /></FormItem>)} />
                                            <DialogFooter>
                                                <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                                                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Bloquer</Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                            <Dialog open={isAppointmentSheetOpen} onOpenChange={setIsAppointmentSheetOpen}>
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
                                    <Form {...appointmentForm}>
                                        <form onSubmit={appointmentForm.handleSubmit(handleSaveAppointment)} className="flex-1 flex flex-col overflow-hidden">
                                            <ScrollArea className="flex-1 pr-6 -mr-6">
                                                <div className="space-y-6 py-4">
                                                    <ClientSelector clients={clients || []} onClientSelect={setSelectedClient} isLoading={areClientsLoading} defaultValue={editingAppointment ? {id: editingAppointment.clientId, name: editingAppointment.clientName} : undefined} />
                                                    <FormField control={appointmentForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre du rendez-vous</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <FormField control={appointmentForm.control} name="start" render={({ field }) => (<FormItem><FormLabel>Début</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                        <FormField control={appointmentForm.control} name="end" render={({ field }) => (<FormItem><FormLabel>Fin</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    </div>
                                                    <FormField control={appointmentForm.control} name="details" render={({ field }) => (<FormItem><FormLabel>Détails</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem>)} />
                                                </div>
                                            </ScrollArea>
                                            <DialogFooter className="pt-4 border-t mt-auto flex justify-between w-full">
                                                {editingAppointment && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button type="button" variant="destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Supprimer ce rendez-vous ?</AlertDialogTitle>
                                                                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => { setAppointmentToDelete(editingAppointment); handleDeleteAppointment(); }}>Confirmer</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                                <div className='flex gap-2 ml-auto'>
                                                    <Button type="button" variant="outline" onClick={() => setIsAppointmentSheetOpen(false)}>Annuler</Button>
                                                    <Button type="submit" disabled={isSubmitting}>
                                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                        Sauvegarder
                                                    </Button>
                                                </div>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                    <h2 className="font-semibold text-xl capitalize hidden md:block">
                        {format(firstDayCurrentWeek, 'MMMM yyyy', { locale: fr })}
                    </h2>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-[auto_1fr] overflow-hidden border rounded-lg bg-background">
                <ScrollArea className='h-full'>
                    <div className="bg-muted/50 sticky top-0 left-0 z-10">
                        <div className="h-16 border-b flex items-center justify-center font-semibold">
                        Heures
                        </div>
                        {hours.map(hour => (
                            <div key={hour} className="h-20 text-center border-b flex items-center justify-center">
                                <span className="text-xs text-muted-foreground -translate-y-1/2">{hour}</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <ScrollArea className="h-full">
                    <div className="grid grid-cols-7 relative min-h-full">
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
                                {/* Render Unavailabilities */}
                                {unavailabilities?.filter(unav => unav.start && isSameDay(parseISO(unav.start), day)).map(unav => {
                                    if (!unav.start || !unav.end) return null;
                                    const start = new Date(unav.start);
                                    const end = new Date(unav.end);
                                    
                                    const topOffsetInMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
                                    const top = (topOffsetInMinutes / 60) * hourHeightInRem;

                                    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
                                    const height = (durationMinutes / 60) * hourHeightInRem;

                                    return (
                                        <div
                                            key={unav.id}
                                            onClick={() => isConseiller && setUnavailabilityToDelete(unav)}
                                            className={cn("absolute w-full left-0 bg-gray-200/50 flex items-center justify-center z-20", isConseiller && "cursor-pointer hover:bg-gray-300/50")}
                                            style={{
                                                top: `${top}rem`,
                                                height: `${height}rem`,
                                                backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)',
                                            }}
                                        >
                                            <p className="text-xs text-gray-500 font-medium">{unav.title || 'Indisponible'}</p>
                                        </div>
                                    )
                                })}
                                {/* Render appointments */}
                                {allAppointments?.filter(app => app.start && isSameDay(parseISO(app.start), day)).map(app => {
                                    if (!app.start || !app.end) return null;
                                    const start = new Date(app.start);
                                    const end = new Date(app.end);
                                    
                                    const topOffsetInMinutes = (start.getUTCHours() - startHour) * 60 + start.getUTCMinutes();
                                    const top = (topOffsetInMinutes / 60) * hourHeightInRem;

                                    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
                                    const height = (durationMinutes / 60) * hourHeightInRem;

                                    return (
                                        <div
                                            key={app.id}
                                            className="absolute w-[calc(100%-4px)] left-[2px] bg-primary/20 border-l-4 border-primary p-2 rounded-r-lg overflow-hidden cursor-pointer z-20"
                                            style={{
                                                top: `${top}rem`,
                                                height: `${height}rem`,
                                            }}
                                            onClick={() => isConseiller && handleEditAppointment(app)}
                                        >
                                            <p className="font-bold text-xs truncate">{app.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{app.clientName}</p>
                                        </div>
                                    )
                                })}
                                {/* Render events */}
                                {events?.filter(event => isSameDay(parseISO(event.date), day)).map(event => {
                                    const start = new Date(event.date);
                                    const end = add(start, { hours: 1 });
                                    
                                    const topOffsetInMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
                                    const top = (topOffsetInMinutes / 60) * hourHeightInRem;

                                    const durationMinutes = 60;
                                    const height = (durationMinutes / 60) * hourHeightInRem;
                                    
                                    return (
                                        <div
                                            key={event.id}
                                            className="absolute w-[calc(100%-4px)] left-[2px] bg-blue-500/20 border-l-4 border-blue-500 p-2 rounded-r-lg overflow-hidden z-20"
                                            style={{
                                                top: `${top}rem`,
                                                height: `${height}rem`,
                                            }}
                                        >
                                            <p className="font-bold text-xs truncate flex items-center gap-1"><CalendarIcon className='h-3 w-3'/> {event.title}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
             <AlertDialog open={!!unavailabilityToDelete} onOpenChange={(open) => !open && setUnavailabilityToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce créneau d'indisponibilité ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce blocage de créneau ?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUnavailability} className="bg-destructive hover:bg-destructive/90">
                           Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
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

    