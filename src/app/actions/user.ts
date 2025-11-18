
'use server';

import { z } from 'zod';
import { initializeAdminApp } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const userFormSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email n'est pas valide."),
  phone: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  role: z.enum(['superadmin', 'conseiller', 'membre'], { required_error: "Le rôle est requis." }),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères."),
});

type CreateUserResponse = {
  success: boolean;
  error?: string;
  userId?: string;
};

export async function createUser(data: z.infer<typeof userFormSchema>): Promise<CreateUserResponse> {
  const validation = userFormSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }
  
  const { app } = initializeAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  const { email, password, firstName, lastName, role, phone, address, zipCode, city } = validation.data;

  try {
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: `${firstName} ${lastName}`,
    });

    const uid = userRecord.uid;

    await db.collection('users').doc(uid).set({
        id: uid,
        firstName,
        lastName,
        email,
        role,
        phone,
        address,
        zipCode,
        city,
        counselorId: role === 'conseiller' ? uid : '',
        dateJoined: new Date().toISOString(),
    });

    return { success: true, userId: uid };
  } catch (error: any) {
    let errorMessage = "Une erreur inconnue est survenue lors de la création de l'utilisateur.";
    if (error.code === 'auth/email-already-exists') {
        errorMessage = 'Cette adresse e-mail est déjà utilisée par un autre compte.';
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = 'Le mot de passe fourni n\'est pas valide. Il doit comporter au moins 6 caractères.';
    }
    return { success: false, error: errorMessage };
  }
}
