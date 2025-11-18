
// This file is intentionally left almost empty.
// Firebase Admin SDK should not be used from the client-side or in server actions
// in this project's architecture. The new logic in FirebaseProvider handles
// user document creation on first login.
import { getApps, initializeApp, cert } from 'firebase-admin/app';

export function initializeAdminApp() {
    if (getApps().length > 0) {
        return;
    }
    // This function is not meant to be fully functional in this environment.
    // The service account details are intentionally left incomplete.
    // The purpose is to have a placeholder for a secure server-side initialization.
    const serviceAccount = {
        // These values should be stored in environment variables, not hardcoded.
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY, // This will be undefined
    };

    try {
         initializeApp({
            credential: cert(serviceAccount),
        });
    } catch(e) {
        console.error("Firebase Admin SDK service account configuration is incomplete. This is expected in a client-side only environment without backend secrets.");
    }
}
