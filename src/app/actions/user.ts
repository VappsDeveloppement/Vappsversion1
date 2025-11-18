
'use server';

import { initializeAdminApp } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function createUser(userData: any) {
  try {
    const adminApp = initializeAdminApp();
    const auth = getAuth(adminApp);
    const firestore = getFirestore(adminApp);

    const { email, password, firstName, lastName, role, phone, address, zipCode, city } = userData;
    
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: `${firstName} ${lastName}`,
    });

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
    if (error.uid) {
        try {
            const adminApp = initializeAdminApp();
            await getAuth(adminApp).deleteUser(error.uid);
        } catch (cleanupError) {
            console.error("Failed to cleanup created auth user:", cleanupError);
        }
    }
    return { success: false, error: error.message };
  }
}
