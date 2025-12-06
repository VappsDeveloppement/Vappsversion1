
'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import { AgencyProvider } from "@/context/agency-provider";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

export function Providers({ children }: { children: ReactNode }) {
    const [firebaseServices, setFirebaseServices] = React.useState<FirebaseServices | null>(null);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      const init = async () => {
        try {
          const services = await initializeFirebase();
          setFirebaseServices(services);
        } catch (e) {
          console.error("Firebase initialization error in Providers:", e);
          setError(e as Error);
        }
      };
      init();
    }, []);

    if (error) {
      return <div>Error initializing Firebase. See console for details.</div>;
    }
    
    if (!firebaseServices) {
      return null; // Or a loading spinner
    }

    return (
        <FirebaseProvider
          firebaseApp={firebaseServices.firebaseApp}
          auth={firebaseServices.auth}
          firestore={firebaseServices.firestore}
          storage={firebaseServices.storage}
        >
            <AgencyProvider>
                {children}
                <Toaster />
            </AgencyProvider>
        </FirebaseProvider>
    );
}
