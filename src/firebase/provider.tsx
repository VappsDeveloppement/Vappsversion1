

'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { Firestore, doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { setDocumentNonBlocking } from './non-blocking-updates';

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  storage: FirebaseStorage | null;
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { 
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

interface FirebaseProviderProps {
    children: ReactNode;
    firebaseApp: FirebaseApp;
    firestore: Firestore;
    auth: Auth;
    storage: FirebaseStorage;
}


/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth || !firestore) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => { // Auth state determined
        if (firebaseUser) {
            // This function is now async and self-executing to not block state updates
            (async () => {
              try {
                  const userDocRef = doc(firestore, "users", firebaseUser.uid);
                  const userDocSnap = await getDoc(userDocRef);

                  if (!userDocSnap.exists()) {
                      const usersCollectionRef = collection(firestore, 'users');
                      const q = query(usersCollectionRef);
                      const allUsersSnapshot = await getDocs(q);
                      const isFirstUser = allUsersSnapshot.empty;

                      const nameParts = firebaseUser.displayName?.split(' ') || [firebaseUser.email?.split('@')[0] || 'Utilisateur', ''];
                      const firstName = nameParts.shift() || 'Nouveau';
                      const lastName = nameParts.join(' ') || 'Utilisateur';

                      const newUserDoc: any = {
                          id: firebaseUser.uid,
                          firstName: firstName,
                          lastName: lastName,
                          email: firebaseUser.email,
                          role: 'conseiller', 
                          dateJoined: new Date().toISOString(),
                          lastSignInTime: new Date().toISOString(),
                          phone: firebaseUser.phoneNumber || '',
                      };
                      
                      // This ensures the very first user ever gets admin rights.
                      if (isFirstUser) {
                        newUserDoc.permissions = ['FULLACCESS'];
                        console.log(`First user detected (${firebaseUser.email}). Assigning FULLACCESS.`);
                      }
                      
                      setDocumentNonBlocking(userDocRef, newUserDoc);
                      
                  } else {
                      // This logic handles the case for an existing user.
                      const userData = userDocSnap.data();
                      const usersCollectionRef = collection(firestore, 'users');
                      const allUsersSnapshot = await getDocs(usersCollectionRef);

                      // If this is the only user account and it doesn't have permissions set, grant them.
                      if (allUsersSnapshot.size === 1 && !userData.permissions) {
                           setDocumentNonBlocking(userDocRef, { permissions: ['FULLACCESS'] }, { merge: true });
                           console.log(`Sole user (${firebaseUser.email}) detected without permissions. Assigning FULLACCESS.`);
                      } else {
                          // Just update the sign-in time for regular users.
                          const lastSignInTime = new Date().toISOString();
                          setDocumentNonBlocking(userDocRef, { lastSignInTime }, { merge: true });
                      }
                  }
              } catch (error) {
                  console.error("Error handling user document:", error);
              }
            })(); // Self-execute the async function
        }
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth, firestore]); // Depends on the auth instance

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && storage);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      storage: servicesAvailable ? storage : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, storage, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.storage) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    storage: context.storage,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

/** Hook to access Firebase Storage instance. */
export const useStorage = (): FirebaseStorage => {
    const { storage } = useFirebase();
    return storage;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
