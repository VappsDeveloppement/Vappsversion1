
'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// Cache the promise outside the component to ensure it's created only once.
const firebaseServicesPromise = initializeFirebase();

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // React.use can now safely consume the cached promise.
  const firebaseServices = React.use(firebaseServicesPromise);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
