
'use server';

import { initializeFirebase } from '@/firebase/server';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

type Event = {
  id: string;
  title: string;
  date: string;
  isPublic: boolean;
  counselorId: string;
};

type FirebaseEvent = Omit<Event, 'date'> & {
    date: Timestamp;
}

export async function getPublicAgencyEvents(agencyId: string): Promise<Event[]> {
  try {
    const { firestore } = initializeFirebase();
    const eventsCollectionRef = collection(firestore, 'events');
    const q = query(
        eventsCollectionRef,
        where('isPublic', '==', true),
        where('counselorId', '==', agencyId)
    );

    const querySnapshot = await getDocs(q);

    const events = querySnapshot.docs.map(doc => {
      const data = doc.data() as FirebaseEvent;
      return {
        ...data,
        id: doc.id,
        date: data.date.toDate().toISOString(),
      };
    });

    return events;
  } catch (error) {
    console.error("Error fetching public agency events:", error);
    return [];
  }
}
