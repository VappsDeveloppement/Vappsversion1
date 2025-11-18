
'use server';

import { getAuth } from 'firebase-admin/auth';
import { initializeAdminApp } from '@/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function createUser(userData: any) {
   try {
    initializeAdminApp();
    const auth = getAuth();
    const firestore = getFirestore();

    // 1. Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: `${userData.firstName} ${userData.lastName}`,
    });
    
    const uid = userRecord.uid;

    // 2. Create user document in Firestore
    const userDocRef = firestore.collection('users').doc(uid);
    await userDocRef.set({
      id: uid,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone || '',
      address: userData.address || '',
      zipCode: userData.zipCode || '',
      city: userData.city || '',
      role: userData.role,
      dateJoined: new Date().toISOString(),
      counselorId: userData.role === 'conseiller' ? uid : userData.creatorId || '',
    });
    
    // 3. Set custom claims if necessary (e.g., to identify role)
    await auth.setCustomUserClaims(uid, { role: userData.role });

    return { success: true, uid: userRecord.uid };

  } catch (error: any) {
    console.error('Error creating user:', error);
    let message = "Une erreur est survenue lors de la création de l'utilisateur.";
    if (error.code === 'auth/email-already-exists') {
        message = "Cette adresse e-mail est déjà utilisée par un autre compte.";
    } else if (error.code === 'auth/invalid-password') {
        message = "Le mot de passe doit contenir au moins 6 caractères.";
    }
    return { success: false, error: message };
  }
}

// This function is deprecated as user creation is handled on login
// by the FirebaseProvider. It is kept for reference but should not be used.
export async function syncFirebaseAuthUsers() {
  return { success: true, createdCount: 0, error: "This function is deprecated." };
}
