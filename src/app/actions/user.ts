
'use server';

import { initializeAdminApp } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function createUser(userData: any) {
  let createdUserUid: string | null = null;
  try {
    const adminApp = initializeAdminApp();
    const auth = getAuth(adminApp);
    const firestore = getFirestore(adminApp);

    const { email, password, firstName, lastName, role, phone, address, zipCode, city } = userData;
    
    // Step 1: Create the user in Firebase Authentication
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: `${firstName} ${lastName}`,
    });
    createdUserUid = userRecord.uid;

    // Step 2: Create the user document in Firestore
    const userDocRef = firestore.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      id: userRecord.uid,
      firstName,
      lastName,
      email,
      role,
      phone: phone || '',
      address: address || '',
      zipCode: zipCode || '',
      city: city || '',
      dateJoined: new Date().toISOString(),
      counselorId: role === 'conseiller' ? userRecord.uid : '',
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error("Error creating user:", error);

    // Cleanup Step: If auth user was created but firestore failed, delete the auth user
    if (createdUserUid) {
        try {
            const adminApp = initializeAdminApp();
            await getAuth(adminApp).deleteUser(createdUserUid);
            console.log(`Successfully cleaned up created auth user ${createdUserUid}`);
        } catch (cleanupError) {
            console.error(`Failed to cleanup created auth user ${createdUserUid}:`, cleanupError);
        }
    }
    
    // Provide a more specific error message
    let friendlyMessage = "Une erreur inconnue est survenue.";
    if (error.code === 'auth/email-already-exists') {
        friendlyMessage = "Cette adresse e-mail est déjà utilisée par un autre compte.";
    } else if (error.code === 'auth/weak-password') {
        friendlyMessage = "Le mot de passe est trop faible. Il doit contenir au moins 6 caractères.";
    } else if (error.message) {
        friendlyMessage = error.message;
    }

    return { success: false, error: friendlyMessage };
  }
}
