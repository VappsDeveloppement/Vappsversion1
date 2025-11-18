
'use server';

// This file is intentionally left almost empty.
// User creation is handled on the client-side via Firebase Auth SDK,
// and the Firestore document creation is triggered by the onAuthStateChanged
// listener in the FirebaseProvider.

export async function syncFirebaseAuthUsers() {
  // This server-side function is no longer needed as the logic
  // is now handled on the client.
  return { success: true, createdCount: 0, error: "This function is deprecated. User sync is now automatic on login." };
}

export async function createUser(userData: any) {
  // This server-side function is no longer needed as the logic
  // is now handled on the client.
   return { success: false, error: "This function is deprecated. User creation is handled via the client-side auth." };
}
