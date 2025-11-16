
'use server';

import { z } from 'zod';

// This schema is simplified as `agencyId` is no longer a direct property of the user.
// The role is also simplified as the detailed role per agency will be in the 'memberships' collection.
const firestoreUserSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email n'est pas valide."),
  phone: z.string().min(1, "Le téléphone est requis."),
  role: z.enum(['admin', 'superadmin', 'dpo', 'conseiller', 'membre', 'prospect']),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  franceTravailId: z.string().optional(),
});

const userCreationSchema = firestoreUserSchema.extend({
  password: z.string().optional(),
});

type ValidateUserResponse = {
  success: boolean;
  error?: string;
};

export async function validateUser(data: z.infer<typeof userCreationSchema>): Promise<ValidateUserResponse> {
  const validation = userCreationSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  // This server action now ONLY performs validation.
  // The actual user creation logic and membership creation is handled on the client.
  return { success: true };
}
