
'use client';

import { z } from 'zod';

const infoMatchingSchema = z.object({
    yearsExperience: z.string().optional(),
    desiredTraining: z.string().optional(),
    romeCode: z.array(z.string()).optional(),
    otherNames: z.array(z.string()).optional(),
    geographicSector: z.array(z.string()).optional(),
    workingConditions: z.array(z.string()).optional(),
    environment: z.array(z.string()).optional(),
    desiredSkills: z.array(z.string()).optional(),
    softSkills: z.array(z.string()).optional(),
    internalNotes: z.string().optional(),
});

export const jobOfferFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Le titre du poste est requis."),
  reference: z.string().optional(),
  description: z.string().optional(),
  contractType: z.string().optional(),
  workingHours: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  infoMatching: infoMatchingSchema.optional(),
});

export type JobOfferFormData = z.infer<typeof jobOfferFormSchema>;

export type JobOffer = JobOfferFormData & {
  id: string;
  counselorId: string;
};

// Aura Page Types
export const productSchema = z.object({
  title: z.string().min(1, "Le titre du produit est requis."),
  description: z.string().optional(),
  isFeatured: z.boolean().default(false),
  imageUrl: z.string().nullable().optional(),
  price: z.coerce.number().optional(),
  characteristics: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  holisticProfile: z.array(z.string()).optional(),
  pathologies: z.array(z.string()).optional(),
  ctaLink: z.string().url('URL invalide').optional().or(z.literal('')),
});

export type ProductFormData = z.infer<typeof productSchema>;

export type Product = ProductFormData & {
    id: string;
    counselorId: string;
    versions?: any[];
};
