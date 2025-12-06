
'use client';

import React, { useState, useMemo } from 'react';
import { add, format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks, parseISO, getHours, getMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';

type Appointment = {
    id: string;
    title: string;
    start: string;
    end: string;
    clientId: string;
    clientName: string;
    details?: string;
};

const hours = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);
const startHour = 8;
const hourHeightInRem = 5; // Corresponds to h-20

export default function AppointmentsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const [currentDate, setCurrentDate] = useState(new Date());

    const appointmentsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/appointments`));
    }, [user, firestore]);
    const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

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
}
