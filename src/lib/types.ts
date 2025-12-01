

import { z } from 'zod';

// Vitae Page Types
export type JobOfferFormData = z.infer<typeof jobOfferFormSchema>;

export type JobOffer = JobOfferFormData & {
  id: string;
  counselorId: string;
};

// Aura Page Types
export type Product = {
    id: string;
    counselorId: string;
    title: string;
    description?: string;
    isFeatured?: boolean;
    imageUrl?: string | null;
    price?: number;
    characteristics?: string[];
    contraindications?: string[];
    holisticProfile?: string[];
    pathologies?: string[];
    ctaLink?: string;
    versions?: any[];
}

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
