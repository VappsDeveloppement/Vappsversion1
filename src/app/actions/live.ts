
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

export async function findConsultation({ liveDate, name, dob }: { liveDate: string, name: string, dob: string }): Promise<Consultation | null> {
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

        // Search for the consultation within those events
        for (const eventDoc of eventSnap.docs) {
            const eventId = eventDoc.id;
            // Query only by name, as date formats can be inconsistent.
            const consultationQuery = query(
                collection(firestore, `events/${eventId}/consultations`),
                where('participantName', '==', name.trim())
            );

            const consultationSnap = await getDocs(consultationQuery);

            if (!consultationSnap.empty) {
                 // Now, filter in code by date of birth for accuracy
                 for (const consultationDoc of consultationSnap.docs) {
                    const data = consultationDoc.data() as FirebaseConsultation;
                    
                    // Normalize both dates to YYYY-MM-DD format for reliable comparison
                    const dobFromDb = data.participantDob ? new Date(data.participantDob).toISOString().split('T')[0] : null;
                    const dobFromInput = new Date(dob).toISOString().split('T')[0];

                    if (dobFromDb === dobFromInput) {
                        return {
                            ...data,
                            id: consultationDoc.id,
                            createdAt: data.createdAt.toDate().toISOString(),
                        };
                    }
                 }
            }
        }

        return null;
    } catch (error) {
        console.error("Server Action: Error searching consultation:", error);
        // In a server action, returning null is often better than throwing
        // unless you want the client to handle a hard failure.
        return null;
    }
}
