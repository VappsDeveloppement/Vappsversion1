
'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';

async function getAdminServices() {
    const { auth, firestore } = initializeAdminApp();
    return { auth, firestore };
}

export async function syncFirebaseAuthUsers() {
  try {
    const { auth, firestore } = await getAdminServices();

    const listUsersResult = await auth.listUsers(1000);
    const authUsers = listUsersResult.users;
    
    const usersCollection = firestore.collection('users');
    const existingUsersSnapshot = await usersCollection.get();
    const existingUserIds = new Set(existingUsersSnapshot.docs.map(doc => doc.id));

    let createdCount = 0;

    for (const userRecord of authUsers) {
      if (!existingUserIds.has(userRecord.uid)) {
        const nameParts = userRecord.displayName?.split(' ') || [userRecord.email?.split('@')[0] || 'Utilisateur', ''];
        const firstName = nameParts.shift() || 'Nouveau';
        const lastName = nameParts.join(' ') || 'Utilisateur';

        const newUserDoc = {
          id: userRecord.uid,
          firstName: firstName,
          lastName: lastName,
          email: userRecord.email,
          role: 'membre', // Default role for synced users
          dateJoined: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
          phone: userRecord.phoneNumber || '',
        };
        await usersCollection.doc(userRecord.uid).set(newUserDoc);
        createdCount++;
      }
    }

    return { success: true, createdCount };
  } catch (error: any) {
    console.error('Error syncing Firebase Auth users:', error);
    return { success: false, error: error.message };
  }
}

export async function createUser(userData: any) {
  try {
    const { auth, firestore } = await getAdminServices();

    // Check if it's the very first user
    const usersSnapshot = await firestore.collection('users').limit(1).get();
    let finalRole = userData.role;
    if (usersSnapshot.empty) {
        finalRole = 'superadmin';
    }
    
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: `${userData.firstName} ${userData.lastName}`,
    });

    let dataToSave: any = {
      id: userRecord.uid,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone || '',
      address: userData.address || '',
      zipCode: userData.zipCode || '',
      city: userData.city || '',
      role: finalRole,
      dateJoined: Timestamp.now().toDate().toISOString(),
    };
    
    if (userData.creatorRole === 'superadmin' && finalRole === 'conseiller') {
        dataToSave.counselorId = userRecord.uid;
    } else if (finalRole === 'superadmin') {
        dataToSave.counselorId = userRecord.uid;
    } else {
        dataToSave.counselorId = userData.creatorId;
    }
    
    await firestore.collection('users').doc(userRecord.uid).set(dataToSave);
    
    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

    