
import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET() {
  try {
    initializeAdminApp();
    const db = getFirestore();

    const allOffers: any[] = [];
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      // We only look for offers from counselors
      if (userDoc.data().role === 'conseiller') {
        const offersSnapshot = await db.collection('users').doc(userDoc.id).collection('job_offers').get();
        offersSnapshot.forEach(offerDoc => {
          allOffers.push({
            id: offerDoc.id,
            ...offerDoc.data(),
            counselorId: userDoc.id, // Add counselorId to identify the author
          });
        });
      }
    }

    return NextResponse.json(allOffers);

  } catch (error) {
    console.error('Error fetching job offers:', error);
    if (error instanceof Error) {
        return new NextResponse(
            JSON.stringify({ message: 'Internal Server Error', error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
    return new NextResponse(
        JSON.stringify({ message: 'An unknown error occurred' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
