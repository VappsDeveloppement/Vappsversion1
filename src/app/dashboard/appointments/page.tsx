
'use client';

import React, { useState, useMemo } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  subWeeks,
  addWeeks,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Generate hours from 8 AM to 8 PM
const hours = Array.from({ length: 13 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

export default function AppointmentsPage() {
    const [currentDate, setCurrentDate] = useState(new Date());

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }, [currentDate]);

    const firstDayCurrentWeek = weekDays[0];

    const handlePreviousWeek = () => {
        setCurrentDate(subWeeks(currentDate, 1));
    };

    const handleNextWeek = () => {
        setCurrentDate(addWeeks(currentDate, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    return (
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
                     <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nouveau rendez-vous
                    </Button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-[auto,1fr] overflow-auto border rounded-lg">
                {/* Time column */}
                <div className="bg-muted/50">
                    <div className="h-16 border-b"></div> {/* Empty corner */}
                    {hours.map(hour => (
                         <div key={hour} className="h-20 text-center border-b flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">{hour}</span>
                        </div>
                    ))}
                </div>

                {/* Days columns */}
                <div className="grid grid-cols-7">
                    {weekDays.map(day => (
                        <div key={day.toString()} className="border-l">
                            <div className="h-16 border-b p-2 text-center sticky top-0 bg-background z-10">
                                <p className="text-sm text-muted-foreground">{format(day, 'EEE', { locale: fr })}</p>
                                <p className={`text-2xl font-bold ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                                    {format(day, 'd')}
                                </p>
                            </div>
                            <div className="relative h-[calc(13*5rem)]"> {/* 13 hours * 5rem height */}
                                 {hours.map((hour, index) => (
                                     <div key={hour} className="h-20 border-b"></div>
                                 ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
