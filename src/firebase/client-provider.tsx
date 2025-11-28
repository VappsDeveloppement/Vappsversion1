
'use client';

import React, { type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // This function will run only on the client side.
    const init = async () => {
      try {
        // initializeFirebase handles both server and client, but here we ensure it's client-only.
        const services = await initializeFirebase();
        setFirebaseServices(services);
      } catch (e) {
        console.error("Firebase initialization error:", e);
        setError(e as Error);
      }
    };

    if (typeof window !== 'undefined') {
        init();
    }
  }, []); // Empty dependency array ensures this runs only once on the client.

  if (error) {
    return <div>Error initializing Firebase. See console for details.</div>;
  }

  if (!firebaseServices) {
    // You can return a loading spinner or a skeleton screen here.
    // Returning null is fine if the layout can handle it.
    return null; 
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
