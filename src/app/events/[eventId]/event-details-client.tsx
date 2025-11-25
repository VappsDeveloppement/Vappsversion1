
'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import { EventRegistrationForm } from './event-registration-form';

type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  meetLink?: string;
  isPublic: boolean;
  imageUrl?: string | null;
  maxAttendees?: number;
};

export function EventDetailsClient({ event }: { event: Event }) {
  if (!event) {
    return null;
  }

  return (
    <div className="bg-muted/20 min-h-screen">
      <div className="container mx-auto max-w-4xl py-12 px-4">
        {event.imageUrl && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
                <Image src={event.imageUrl} alt={event.title} fill className="object-cover" priority />
            </div>
        )}
        <h1 className="text-4xl lg:text-5xl font-bold font-headline leading-tight mb-4">{event.title}</h1>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-muted-foreground mb-8">
            <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /><span>{new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</span></div>
            {event.location && <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><span>{event.location}</span></div>}
            {event.meetLink && <div className="flex items-center gap-2"><LinkIcon className="h-5 w-5 text-primary" /><a href={event.meetLink} target="_blank" rel="noopener noreferrer" className="hover:underline">Lien de la réunion</a></div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 prose dark:prose-invert max-w-none">
                <p>{event.description}</p>
            </div>
            <div className="lg:col-span-1">
                <EventRegistrationForm event={event} />
            </div>
        </div>
      </div>
    </div>
  );
}
