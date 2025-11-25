
'use server';

import { initializeFirebase } from '@/firebase/server';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

interface Consultation {
    id: string;
    participantName: string;
    participantDob?: string;
    question: string;
    createdAt: string;
}

interface FirebaseConsultation extends Omit<Consultation, 'createdAt'> {
    createdAt: Timestamp;
}

export async function findConsultation({ liveDate, name }: { liveDate: string, name: string }): Promise<Consultation | null> {
    try {
        const { firestore } = initializeFirebase();
        const eventsCollectionRef = collection(firestore, 'events');
        
        // Find events on the specified date.
        const startOfDay = new Date(liveDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(liveDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const eventQuery = query(
            eventsCollectionRef,
            where('date', '>=', startOfDay),
            where('date', '<=', endOfDay),
            where('isPublic', '==', true)
        );
        const eventSnap = await getDocs(eventQuery);

        if (eventSnap.empty) {
            return null;
        }

        // Search for the consultation within those events by participant name
        for (const eventDoc of eventSnap.docs) {
            const eventId = eventDoc.id;
            const consultationQuery = query(
                collection(firestore, `events/${eventId}/consultations`),
                where('participantName', '==', name.trim())
            );

            const consultationSnap = await getDocs(consultationQuery);

            if (!consultationSnap.empty) {
                // Return the first match
                const consultationDoc = consultationSnap.docs[0];
                const data = consultationDoc.data() as FirebaseConsultation;
                return {
                    ...data,
                    id: consultationDoc.id,
                    createdAt: data.createdAt.toDate().toISOString(),
                };
            }
        }

        return null;
    } catch (error) {
        console.error("Server Action: Error searching consultation:", error);
        return null;
    }
}
