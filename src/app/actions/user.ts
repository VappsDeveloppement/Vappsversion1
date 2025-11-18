
'use server';

import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/firebase/admin';

// This function is deprecated as user creation is handled on login
// by the FirebaseProvider. It is kept for reference but should not be used.
export async function syncFirebaseAuthUsers() {
  return { success: true, createdCount: 0, error: "This function is deprecated." };
}

export async function createUser(userData: any) {
   // This function is now also deprecated.
   // The logic has been moved to the FirebaseProvider.
   return { success: false, error: "This function is deprecated. User creation is handled via the client-side auth." };
}
