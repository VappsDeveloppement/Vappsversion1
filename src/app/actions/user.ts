
'use server';

import { z } from 'zod';
import { getAdminApp } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const adminFormSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email n'est pas valide."),
  phone: z.string().optional(),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  role: z.enum(['admin', 'superadmin']),
  agencyId: z.string(),
});

type CreateUserResponse = {
  success: boolean;
  error?: string;
};

export async function createUser(data: z.infer<typeof adminFormSchema>): Promise<CreateUserResponse> {
  const validation = adminFormSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  try {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const firestore = getFirestore(adminApp);

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: `${data.firstName} ${data.lastName}`,
      emailVerified: true, // You might want to set this to false and send a verification email
    });

    // Create user document in Firestore
    await firestore.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || '',
      role: data.role,
      agencyId: data.agencyId,
      dateJoined: new Date().toISOString(),
    });

    return { success: true };
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
}
