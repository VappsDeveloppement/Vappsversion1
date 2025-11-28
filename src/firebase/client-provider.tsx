
'use client';

import React, { type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, getSdks } from '@/firebase';
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
        const services = await initializeFirebase();
        setFirebaseServices(services);
      } catch (e) {
        console.error("Firebase initialization error:", e);
        setError(e as Error);
      }
    };

    init();
  }, []); // Empty dependency array ensures this runs only once.

  if (error) {
    // You can render a more specific error UI here if needed.
    return <div>Error initializing Firebase. See console for details.</div>;
  }

  // Render a loading state while Firebase is initializing.
  if (!firebaseServices) {
    // You can return a loading spinner or a skeleton screen here.
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
