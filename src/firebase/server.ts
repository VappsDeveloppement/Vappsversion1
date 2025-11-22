import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export function initializeFirebase() {
  const firebaseApp = getFirebaseApp();
  const firestore = getFirestore(firebaseApp);
  return { firebaseApp, firestore };
}

export { getSdks } from './index';
