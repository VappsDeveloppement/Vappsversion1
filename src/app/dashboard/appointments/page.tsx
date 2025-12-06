
'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
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
import { useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { cn } from '@/lib/utils';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const appointmentSchema = z.object({
    title: z.string().min(1, "Le titre est requis."),
    date: z.date({ required_error: "La date est requise." }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:mm)."),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:mm)."),
}).refine(data => {
    return data.endTime > data.startTime;
}, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ['endTime'],
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

type Appointment = {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
};

let colStartClasses = [
  '',
  'col-start-2',
  'col-start-3',
  'col-start-4',
  'col-start-5',
  'col-start-6',
  'col-start-7',
];

export default function AppointmentsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    
    let today = startOfToday();
    let [selectedDay, setSelectedDay] = useState(today);
    let [currentMonth, setCurrentMonth] = useState(format(today, 'MMM-yyyy'));
    let firstDayCurrentMonth = useMemo(() => parse(currentMonth, 'MMM-yyyy', new Date()), [currentMonth]);

    const appointmentsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/appointments`));
    }, [user, firestore]);

    const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsQuery);

    let days = useMemo(() => eachDayOfInterval({
        start: firstDayCurrentMonth,
        end: endOfMonth(firstDayCurrentMonth),
    }), [firstDayCurrentMonth]);

    function previousMonth() {
        let firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 });
        setCurrentMonth(format(firstDayNextMonth, 'MMM-yyyy'));
    }

    function nextMonth() {
        let firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
        setCurrentMonth(format(firstDayNextMonth, 'MMM-yyyy'));
    }
    
    const form = useForm<AppointmentFormData>({
        resolver: zodResolver(appointmentSchema),
    });

    const selectedDayMeetings = useMemo(() => {
        if (!appointments) return [];
        return appointments
            .filter((meeting) => isSameDay(new Date(meeting.startTime), selectedDay))
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [appointments, selectedDay]);

    const onSubmit = async (data: AppointmentFormData) => {
        if (!user) return;
        const { date, startTime, endTime, title } = data;

        const startDateTime = new Date(date);
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        startDateTime.setHours(startHours, startMinutes);

        const endDateTime = new Date(date);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        endDateTime.setHours(endHours, endMinutes);

        try {
            await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/appointments`), {
                title,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                status: 'scheduled',
                coachId: user.uid,
            });
            toast({ title: "Rendez-vous ajouté" });
            setIsFormOpen(false);
            form.reset();
        } catch (error) {
             toast({ title: "Erreur", description: "Impossible d'ajouter le rendez-vous", variant: "destructive" });
        }
    };


    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Agenda</h1>
                    <p className="text-muted-foreground">Gérez votre emploi du temps et vos rendez-vous.</p>
                </div>
                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Nouveau rendez-vous
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nouveau rendez-vous</DialogTitle>
                            <DialogDescription>Ajoutez un nouveau rendez-vous à votre agenda.</DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="title" render={({ field }) => (
                                    <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" onChange={e => field.onChange(new Date(e.target.value))} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="startTime" render={({ field }) => (
                                        <FormItem><FormLabel>Début</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={form.control} name="endTime" render={({ field }) => (
                                        <FormItem><FormLabel>Fin</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Enregistrer</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="md:grid md:grid-cols-2 md:divide-x md:divide-border">
                <div className="pr-8">
                     <div className="flex items-center">
                        <h2 className="flex-auto font-semibold text-foreground capitalize">
                            {format(firstDayCurrentMonth, 'MMMM yyyy', { locale: fr })}
                        </h2>
                        <Button variant="ghost" size="icon" onClick={previousMonth}><span className="sr-only">Previous month</span>&lt;</Button>
                        <Button variant="ghost" size="icon" onClick={nextMonth}><span className="sr-only">Next month</span>&gt;</Button>
                    </div>
                     <div className="grid grid-cols-7 mt-10 text-xs leading-6 text-center text-muted-foreground">
                        <div>DIM</div><div>LUN</div><div>MAR</div><div>MER</div><div>JEU</div><div>VEN</div><div>SAM</div>
                    </div>
                     <div className="grid grid-cols-7 mt-2 text-sm">
                        {days.map((day, dayIdx) => (
                            <div key={day.toString()} className={cn(dayIdx === 0 && colStartClasses[getDay(day)], 'py-1.5')}>
                                <Button
                                    variant="ghost"
                                    onClick={() => setSelectedDay(day)}
                                    className={cn(
                                        'mx-auto flex h-8 w-8 items-center justify-center rounded-full',
                                        isEqual(day, selectedDay) && 'text-white',
                                        !isEqual(day, selectedDay) && isToday(day) && 'text-primary',
                                        !isEqual(day, selectedDay) && !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && 'text-foreground',
                                        !isEqual(day, selectedDay) && !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && 'text-muted-foreground',
                                        isEqual(day, selectedDay) && isToday(day) && 'bg-primary',
                                        isEqual(day, selectedDay) && !isToday(day) && 'bg-gray-900',
                                        !isEqual(day, selectedDay) && 'hover:bg-gray-200',
                                        (isEqual(day, selectedDay) || isToday(day)) && 'font-semibold',
                                    )}
                                >
                                    <time dateTime={format(day, 'yyyy-MM-dd')}>
                                        {format(day, 'd')}
                                    </time>
                                </Button>
                                 <div className="w-1 h-1 mx-auto mt-1">
                                    {appointments?.some(meeting => isSameDay(new Date(meeting.startTime), day)) && (
                                        <div className="w-1 h-1 rounded-full bg-sky-500"></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <section className="mt-12 md:mt-0 md:pl-8">
                     <h2 className="font-semibold text-foreground">
                        Agenda pour <time dateTime={format(selectedDay, 'yyyy-MM-dd')}>{format(selectedDay, 'd MMMM yyyy', { locale: fr })}</time>
                    </h2>
                     <ol className="mt-4 space-y-1 text-sm leading-6 text-muted-foreground">
                        {isLoading ? <Skeleton className="h-20 w-full" /> : 
                         selectedDayMeetings.length > 0 ? (
                            selectedDayMeetings.map((meeting) => (
                                <li key={meeting.id} className="flex items-center px-4 py-2 space-x-4 group rounded-xl focus-within:bg-gray-100 hover:bg-gray-100">
                                    <div className="flex-auto">
                                        <p className="text-foreground font-semibold">{meeting.title}</p>
                                        <p className="mt-0.5">
                                            <time dateTime={meeting.startTime}>{format(new Date(meeting.startTime), 'HH:mm')}</time> -{' '}
                                            <time dateTime={meeting.endTime}>{format(new Date(meeting.endTime), 'HH:mm')}</time>
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100"><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </li>
                            ))
                        ) : (
                            <p>Aucun rendez-vous pour aujourd'hui.</p>
                        )}
                    </ol>
                </section>
            </div>
        </div>
    );
}

