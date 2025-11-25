
import React from 'react';
import { notFound } from 'next/navigation';
import { initializeFirebase } from '@/firebase/server';
import { doc, getDoc } from 'firebase/firestore';
import { EventDetailsClient } from './event-details-client';

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

async function getEventData(eventId: string): Promise<Event | null> {
    if (!eventId) return null;
    try {
        const { firestore } = initializeFirebase();
        const eventRef = doc(firestore, 'events', eventId);
        const eventSnap = await getDoc(eventRef);

        if (!eventSnap.exists() || !eventSnap.data().isPublic) {
            return null;
        }

        const eventData = eventSnap.data() as Omit<Event, 'id'>;
        return { id: eventSnap.id, ...eventData };
    } catch (error) {
        console.error("Error fetching event data on server:", error);
        return null;
    }
}

export default async function EventDetailsPage({ params }: { params: { eventId: string } }) {
  const { eventId } = params;
  const event = await getEventData(eventId);

  if (!event) {
    notFound();
  }

  return <EventDetailsClient event={event} />;
}
