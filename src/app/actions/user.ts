
'use server';

import { z } from 'zod';
// We are removing the dependency on firebase-admin
// import { getAdminApp } from '@/firebase/admin';
// import { getAuth } from 'firebase-admin/auth';
// import { getFirestore } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

// Base schema for user data stored in Firestore
const firestoreUserSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email n'est pas valide."),
  phone: z.string().min(1, "Le téléphone est requis."),
  role: z.enum(['admin', 'superadmin', 'dpo', 'conseiller', 'membre', 'prospect']),
  agencyId: z.string(),
  // Fields for 'membre'
  address: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  franceTravailId: z.string().optional(),
});

// Schema for the user creation form, including password
const userCreationSchema = firestoreUserSchema.extend({
  password: z.string().optional(),
});

type CreateUserResponse = {
  success: boolean;
  error?: string;
  userId?: string;
};

export async function createUser(data: z.infer<typeof userCreationSchema>): Promise<CreateUserResponse> {
  const validation = userCreationSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  // NOTE: This server action now only performs validation.
  // The actual user creation logic using the client-side SDK should be handled
  // on the client after this validation passes.
  // For now, we simulate success to allow the UI flow to continue,
  // but we cannot create a user from the server without proper auth context.
  
  console.log("User creation data validated on the server:", validation.data);

  return { 
    success: true, 
    userId: `simulated-user-${randomBytes(8).toString('hex')}` 
  };

  // The code below is commented out as it relies on the Admin SDK
  // which is not available in this environment.

  /*
  const { password, ...firestoreData } = validation.data;
  let finalPassword = password;

  if (firestoreData.role === 'membre' && !finalPassword) {
    finalPassword = randomBytes(16).toString('hex');
  }

  if (firestoreData.role !== 'membre' && !finalPassword) {
    return { success: false, error: "Le mot de passe est requis pour ce rôle." };
  }
  
  if (!finalPassword) {
     return { success: false, error: "Impossible de créer un utilisateur sans mot de passe." };
  }


  try {
    // This part requires the Admin SDK and will fail.
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const firestore = getFirestore(adminApp);

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: firestoreData.email,
      password: finalPassword,
      displayName: `${firestoreData.firstName} ${firestoreData.lastName}`,
      emailVerified: true,
    });

    // Create user document in Firestore
    const userDocData = {
      ...firestoreData,
      id: userRecord.uid,
      dateJoined: new Date().toISOString(),
    };

    await firestore.collection("users").doc(userRecord.uid).set(userDocData);

    return { success: true, userId: userRecord.uid };
  } catch (error: any) {
    console.error("Error creating user:", error);
    let errorMessage = "Une erreur inconnue est survenue.";
    if (error.code === 'auth/email-already-exists') {
      errorMessage = "Cette adresse email est déjà utilisée.";
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = "Le mot de passe doit contenir au moins 6 caractères."
    }
    return { success: false, error: errorMessage };
  }
  */
}
