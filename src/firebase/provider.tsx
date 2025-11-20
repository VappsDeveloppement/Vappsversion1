
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { // Renamed from UserAuthHookResult for consistency if desired, or keep as UserAuthHookResult
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
}


/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
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
      async (firebaseUser) => { // Auth state determined
        if (firebaseUser) {
            try {
                const userDocRef = doc(firestore, "users", firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    // Check if this is the very first user in the entire system.
                    const usersCollectionRef = collection(firestore, 'users');
                    const q = query(usersCollectionRef, where("role", "==", "superadmin"));
                    const superAdminQuerySnap = await getDocs(q);

                    const isFirstUserEver = superAdminQuerySnap.empty;
                    const isSpecificUser = firebaseUser.email === 'admin@example.com';
                    const publicProfileName = isSpecificUser ? 'romain-roussey' : '';

                    const nameParts = firebaseUser.displayName?.split(' ') || [firebaseUser.email?.split('@')[0] || 'Utilisateur', ''];
                    const firstName = nameParts.shift() || 'Nouveau';
                    const lastName = nameParts.join(' ') || 'Utilisateur';

                    const newUserDoc: any = {
                        id: firebaseUser.uid,
                        firstName: firstName,
                        lastName: lastName,
                        email: firebaseUser.email,
                        role: isFirstUserEver ? 'superadmin' : 'membre',
                        counselorId: isFirstUserEver ? firebaseUser.uid : '',
                        dateJoined: new Date().toISOString(),
                        lastSignInTime: new Date().toISOString(),
                        phone: firebaseUser.phoneNumber || '',
                    };
                    
                    if (isSpecificUser) {
                        newUserDoc.publicProfileName = publicProfileName;
                    }

                    await setDoc(userDocRef, newUserDoc);
                    
                    if (isSpecificUser) {
                        const routeDocRef = doc(firestore, 'minisite_routes', publicProfileName);
                        await setDoc(routeDocRef, { counselorId: firebaseUser.uid });
                    }

                } else {
                    const lastSignInTime = new Date().toISOString();
                    const userData = userDocSnap.data();
                    const isSpecificUser = firebaseUser.email === 'admin@example.com';
                    
                    const updateData: { lastSignInTime: string, publicProfileName?: string } = { lastSignInTime };

                    if (isSpecificUser && !userData.publicProfileName) {
                        const publicProfileName = 'romain-roussey';
                        updateData.publicProfileName = publicProfileName;
                         const routeDocRef = doc(firestore, 'minisite_routes', publicProfileName);
                        await setDoc(routeDocRef, { counselorId: firebaseUser.uid });
                    }

                    await setDoc(userDocRef, updateData, { merge: true });
                }
            } catch (error) {
                console.error("Error handling user document:", error);
            }
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
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

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

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
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

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
