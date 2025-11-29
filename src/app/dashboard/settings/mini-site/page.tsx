

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDoc, useMemoFirebase, setDocumentNonBlocking, useUser } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { doc, setDoc, query, collection, where, getDocs, limit, documentId, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Upload, Trash2, Eye, Link as LinkIcon, PlusCircle, CheckCircle, Facebook, Instagram, Linkedin, Youtube, Twitter } from 'lucide-react';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type { Plan } from '@/components/shared/plan-management';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const heroSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  showPhoto: z.boolean().default(true),
  showPhone: z.boolean().default(true),
  showLocation: z.boolean().default(true),
  bgColor: z.string().optional(),
  bgImageUrl: z.string().nullable().optional(),
  titleColor: z.string().optional(),
  subtitleColor: z.string().optional(),
});

const attentionSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  text: z.string().optional(),
  titleColor: z.string().optional(),
  subtitleColor: z.string().optional(),
  bgColor: z.string().optional(),
});

const aboutSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  text: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
});

const serviceItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Le titre est requis."),
  description: z.string().min(1, "La description est requise."),
  imageUrl: z.string().nullable().optional(),
});

const servicesSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  services: z.array(serviceItemSchema).optional(),
});

const parcoursStepSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Le titre est requis."),
  description: z.string().min(1, "La description est requise."),
});

const parcoursSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  steps: z.array(parcoursStepSchema).optional(),
});

const ctaSchema = z.object({
    enabled: z.boolean().default(false),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    text: z.string().optional(),
    buttonText: z.string().optional(),
    buttonLink: z.string().optional(),
    bgColor: z.string().optional(),
    bgImageUrl: z.string().nullable().optional(),
});

const testimonialSchema = z.object({
    id: z.string(),
    authorName: z.string().min(1, 'Le nom de l\'auteur est requis.'),
    authorTitle: z.string().min(1, 'Le titre/poste est requis.'),
    text: z.string().min(1, 'Le témoignage est requis.'),
    photoUrl: z.string().nullable().optional(),
});

const testimonialsSectionSchema = z.object({
    enabled: z.boolean().default(false),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    testimonials: z.array(testimonialSchema).optional(),
}).optional();

const interestItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Le texte est requis."),
  link: z.string().url("Veuillez entrer une URL valide.").optional().or(z.literal('')),
});


const eventItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Le titre est requis."),
  date: z.string().min(1, "La date est requise."),
});

const activitiesSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().optional(),
  text: z.string().optional(),
  mediaType: z.enum(['image', 'video']).default('video'),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().optional(),
  interestsTitle: z.string().optional(),
  interests: z.array(interestItemSchema).optional(),
  events: z.array(eventItemSchema).optional(),
  eventsButtonText: z.string().optional(),
  eventsButtonLink: z.string().optional(),
}).optional();

const pricingSchema = z.object({
    enabled: z.boolean().default(false),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    planIds: z.array(z.string()).optional(),
}).optional();

const jobOfferSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Le titre est requis.'),
    contractType: z.string().min(1, 'Le type de contrat est requis.'),
    location: z.string().min(1, 'Le lieu est requis.'),
});

const jobOffersSectionSchema = z.object({
    enabled: z.boolean().default(false),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    offers: z.array(jobOfferSchema).optional(),
}).optional();

const socialLinksSchema = z.object({
    facebook: z.string().url().or(z.literal('')).optional(),
    instagram: z.string().url().or(z.literal('')).optional(),
    x: z.string().url().or(z.literal('')).optional(),
    linkedin: z.string().url().or(z.literal('')).optional(),
    tiktok: z.string().url().or(z.literal('')).optional(),
    youtube: z.string().url().or(z.literal('')).optional(),
}).optional();

const contactSectionSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  commercialName: z.string().optional(),
  siret: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  socialLinks: socialLinksSchema,
}).optional();

const trainingCatalogSectionSchema = z.object({
    enabled: z.boolean().default(false),
}).optional();

const productItemSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Le titre est requis'),
    description: z.string().optional(),
    imageUrl: z.string().nullable().optional(),
    price: z.coerce.number().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().url('URL invalide').optional().or(z.literal('')),
});

const productsSectionSchema = z.object({
    enabled: z.boolean().default(false),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    products: z.array(productItemSchema).optional(),
}).optional();


const miniSiteSchema = z.object({
  hero: heroSchema.optional(),
  attentionSection: attentionSchema.optional(),
  aboutSection: aboutSchema.optional(),
  servicesSection: servicesSchema.optional(),
  parcoursSection: parcoursSchema.optional(),
  ctaSection: ctaSchema.optional(),
  testimonialsSection: testimonialsSectionSchema,
  activitiesSection: activitiesSchema,
  pricingSection: pricingSchema,
  jobOffersSection: jobOffersSectionSchema,
  trainingCatalogSection: trainingCatalogSectionSchema,
  productsSection: productsSectionSchema,
  contactSection: contactSectionSchema,
});

type MiniSiteFormData = z.infer<typeof miniSiteSchema>;
export type ServiceItem = z.infer<typeof serviceItemSchema>;
export type ParcoursStep = z.infer<typeof parcoursStepSchema>;
export type EventItem = z.infer<typeof eventItemSchema>;
export type JobOffer = z.infer<typeof jobOfferSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type InterestItem = z.infer<typeof interestItemSchema>;
export type ProductItem = z.infer<typeof productItemSchema>;


type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  publicProfileName?: string;
  miniSite?: MiniSiteFormData;
  dashboardTheme?: any;
  commercialName?: string;
  siret?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  phone?: string;
  contactEmail?: string;
  isVatSubject?: boolean;
  vatRate?: number;
  vatNumber?: string;
  role?: string;
};

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});

export default function MiniSitePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputHeroRef = useRef<HTMLInputElement>(null);
  const fileInputAboutRef = useRef<HTMLInputElement>(null);
  const fileInputCtaRef = useRef<HTMLInputElement>(null);
  const fileInputActivitiesRef = useRef<HTMLInputElement>(null);
  const fileInputTestimonialRef = useRef<HTMLInputElement>(null);
  const fileInputProductRef = useRef<HTMLInputElement>(null);
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserProfile>(userDocRef);

  const counselorPlansQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'plans'), where('counselorId', '==', user.uid));
  }, [user, firestore]);
  const { data: counselorPlans, isLoading: arePlansLoading } = useCollection<Plan>(counselorPlansQuery);


  const [heroBgImagePreview, setHeroBgImagePreview] = useState<string | null | undefined>(null);
  const [aboutImagePreview, setAboutImagePreview] = useState<string | null | undefined>(null);
  const [ctaImagePreview, setCtaImagePreview] = useState<string | null | undefined>(null);
  const [activitiesImagePreview, setActivitiesImagePreview] = useState<string | null | undefined>(null);

  const form = useForm<MiniSiteFormData>({
    resolver: zodResolver(miniSiteSchema),
    defaultValues: {
      hero: {
        title: '',
        subtitle: '',
        description: '',
        ctaText: 'Prendre rendez-vous',
        ctaLink: '#contact',
        showPhoto: true,
        showPhone: true,
        showLocation: true,
        bgColor: '#111827',
        bgImageUrl: null,
        titleColor: '#FFFFFF',
        subtitleColor: '#E5E7EB',
      },
      attentionSection: {
        enabled: false,
        title: 'Attention',
        subtitle: '',
        text: '',
        bgColor: '#FFFFFF',
        titleColor: '#000000',
        subtitleColor: '#10B981',
      },
      aboutSection: {
        enabled: false,
        title: 'À propos de moi',
        subtitle: 'Une approche sur-mesure',
        text: '',
        imageUrl: null,
      },
      servicesSection: {
          enabled: false,
          title: 'Mes Services',
          subtitle: 'Découvrez mes accompagnements',
          services: [],
      },
      parcoursSection: {
          enabled: false,
          title: "Etapes d'accompagnement",
          subtitle: 'Mon approche pour votre réussite',
          steps: [],
      },
      ctaSection: {
          enabled: false,
          title: "Prêt(e) à passer à l'action ?",
          subtitle: '',
          text: 'Contactez-moi dès aujourd\'hui pour planifier votre première séance.',
          buttonText: 'Prendre rendez-vous',
          buttonLink: '#contact',
          bgColor: '#F9FAFB',
          bgImageUrl: null
      },
      testimonialsSection: {
        enabled: false,
        title: "Ce qu'ils pensent de mon travail",
        subtitle: "La satisfaction de mes clients est ma priorité",
        testimonials: [
            { id: `testimonial-${Date.now()}-1`, authorName: 'Jean Dupont', authorTitle: 'Chef de projet', text: "Un accompagnement exceptionnel qui a transformé ma vision professionnelle. Je recommande vivement !", photoUrl: null },
            { id: `testimonial-${Date.now()}-2`, authorName: 'Marie Curie', authorTitle: 'Entrepreneure', text: "Grâce à ce coaching, j'ai pu lancer mon projet avec confiance et méthode. Une aide précieuse.", photoUrl: null },
            { id: `testimonial-${Date.now()}-3`, authorName: 'Paul Valéry', authorTitle: 'Étudiant en reconversion', text: "J'étais perdu, et j'ai trouvé une nouvelle voie qui me passionne. Merci pour tout.", photoUrl: null },
        ],
      },
      activitiesSection: {
        enabled: false,
        title: "Nos autres activités",
        text: "Nous accompagnons également les entreprises",
        mediaType: 'video',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        imageUrl: null,
        interestsTitle: "Mes centres d'intérêt",
        interests: [],
        events: [],
        eventsButtonText: "J'ai participé à un live",
        eventsButtonLink: "#",
      },
      pricingSection: {
        enabled: false,
        title: 'Mes Formules',
        subtitle: '',
        planIds: [],
      },
      jobOffersSection: {
        enabled: false,
        title: 'Nos Offres d\'Emploi',
        subtitle: 'Rejoignez mon équipe',
        description: '',
        offers: [],
      },
      trainingCatalogSection: {
        enabled: false,
      },
      productsSection: {
        enabled: false,
        title: 'Mes Produits',
        subtitle: 'Découvrez mes créations',
        description: 'Voici une sélection de produits que je propose à la vente.',
        products: [
            { id: `product-${Date.now()}-1`, title: 'E-book: Le guide de la reconversion', description: 'Un guide complet pour vous aider à changer de voie.', price: 19.99, ctaText: 'Acheter', ctaLink: '#', imageUrl: null },
            { id: `product-${Date.now()}-2`, title: 'Kit Méditation Audio', description: 'Une série de méditations guidées pour la sérénité.', price: 29.99, ctaText: 'Acheter', ctaLink: '#', imageUrl: null },
        ],
      },
      contactSection: {
        enabled: false,
        title: "Contactez-moi",
        subtitle: "Un projet, une question ? N'hésitez pas.",
        commercialName: '',
        siret: '',
        address: '',
        zipCode: '',
        city: '',
        email: '',
        phone: '',
        socialLinks: {
          facebook: '',
          instagram: '',
          x: '',
          linkedin: '',
          tiktok: '',
          youtube: '',
        },
      },
    },
  });
  
    const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
        control: form.control,
        name: "servicesSection.services",
    });
    
    const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
      control: form.control,
      name: "parcoursSection.steps",
    });

    const { fields: testimonialFields, append: appendTestimonial, remove: removeTestimonial } = useFieldArray({
        control: form.control,
        name: "testimonialsSection.testimonials",
    });

    const { fields: eventFields, append: appendEvent, remove: removeEvent } = useFieldArray({
        control: form.control,
        name: "activitiesSection.events",
    });

    const { fields: jobOfferFields, append: appendJobOffer, remove: removeJobOffer } = useFieldArray({
        control: form.control,
        name: "jobOffersSection.offers",
    });

    const { fields: interestFields, append: appendInterest, remove: removeInterest } = useFieldArray({
        control: form.control,
        name: "activitiesSection.interests",
    });
    
     const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
        control: form.control,
        name: "productsSection.products",
    });


  useEffect(() => {
    if (userData?.miniSite) {
       const initialMiniSiteData = {
         ...form.getValues(), // Start with default values
         ...userData.miniSite, // Override with saved data
         hero: {
            ...form.getValues().hero,
            ...userData.miniSite.hero,
         },
         attentionSection: {
            ...form.getValues().attentionSection,
            ...userData.miniSite.attentionSection,
         },
         servicesSection: {
            ...form.getValues().servicesSection,
            ...userData.miniSite.servicesSection,
            services: userData.miniSite.servicesSection?.services || [],
         },
         parcoursSection: {
            ...form.getValues().parcoursSection,
            ...userData.miniSite.parcoursSection,
            steps: userData.miniSite.parcoursSection?.steps || [],
         },
         testimonialsSection: {
            ...form.getValues().testimonialsSection,
            ...userData.miniSite.testimonialsSection,
            testimonials: userData.miniSite.testimonialsSection?.testimonials || [],
         },
         activitiesSection: {
            ...form.getValues().activitiesSection,
            ...userData.miniSite.activitiesSection,
            events: userData.miniSite.activitiesSection?.events || [],
            interests: userData.miniSite.activitiesSection?.interests || [],
         },
         pricingSection: {
            ...form.getValues().pricingSection,
            ...userData.miniSite.pricingSection,
            planIds: userData.miniSite.pricingSection?.planIds || [],
         },
         jobOffersSection: {
            ...form.getValues().jobOffersSection,
            ...userData.miniSite.jobOffersSection,
            offers: userData.miniSite.jobOffersSection?.offers || [],
         },
         trainingCatalogSection: {
            ...form.getValues().trainingCatalogSection,
            ...userData.miniSite.trainingCatalogSection,
         },
         productsSection: {
            ...form.getValues().productsSection,
            ...userData.miniSite.productsSection,
            products: userData.miniSite.productsSection?.products || [],
         },
         contactSection: {
            ...form.getValues().contactSection,
            ...userData.miniSite.contactSection,
            commercialName: userData.miniSite.contactSection?.commercialName || userData.commercialName || '',
            siret: userData.miniSite.contactSection?.siret || userData.siret || '',
            address: userData.miniSite.contactSection?.address || userData.address || '',
            zipCode: userData.miniSite.contactSection?.zipCode || userData.zipCode || '',
            city: userData.miniSite.contactSection?.city || userData.city || '',
            email: userData.miniSite.contactSection?.email || userData.email || '',
            phone: userData.miniSite.contactSection?.phone || userData.phone || '',
            socialLinks: {
              ...form.getValues().contactSection?.socialLinks,
              ...userData.miniSite.contactSection?.socialLinks,
            }
         },
       };
      form.reset(initialMiniSiteData);
      setHeroBgImagePreview(userData.miniSite.hero?.bgImageUrl);
      setAboutImagePreview(userData.miniSite.aboutSection?.imageUrl);
      setCtaImagePreview(userData.miniSite.ctaSection?.bgImageUrl);
      setActivitiesImagePreview(userData.miniSite.activitiesSection?.imageUrl);
    } else if (userData) {
        // Pre-fill contact section from main profile on first load
        form.setValue('contactSection.commercialName', userData.commercialName || '');
        form.setValue('contactSection.siret', userData.siret || '');
        form.setValue('contactSection.address', userData.address || '');
        form.setValue('contactSection.zipCode', userData.zipCode || '');
        form.setValue('contactSection.city', userData.city || '');
        form.setValue('contactSection.email', userData.email || '');
        form.setValue('contactSection.phone', userData.phone || '');
    }
  }, [userData, form]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      const base64 = await toBase64(file);
      callback(base64);
    }
  };

  const onSubmit = async (data: MiniSiteFormData) => {
    if (!user || !userDocRef) return;
    setIsSubmitting(true);

    try {
      const fullMiniSiteData = {
          ...userData?.miniSite,
          ...data,
      };

      await setDocumentNonBlocking(userDocRef, {
        miniSite: fullMiniSiteData,
      }, { merge: true });

      if(userData?.role === 'conseiller' || userData?.role === 'superadmin') {
          const minisiteDocRef = doc(firestore, 'minisites', user.uid);
          await setDocumentNonBlocking(minisiteDocRef, {
              miniSite: fullMiniSiteData,
          }, { merge: true });
      }

      toast({
        title: 'Mini-site mis à jour',
        description: 'Les modifications de votre page publique ont été sauvegardées.',
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la sauvegarde.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
    const handleServiceImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            form.setValue(`servicesSection.services.${index}.imageUrl`, base64);
        }
    };

    const handleProductImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            form.setValue(`productsSection.products.${index}.imageUrl`, base64);
        }
    };
    
  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Mon Mini-site</h1>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }
  
  if (userData?.role !== 'conseiller' && userData?.role !== 'superadmin') {
     return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Mon Mini-site</h1>
                <p className="text-muted-foreground">
                Gérez l'apparence et le contenu de votre page publique.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Fonctionnalité non disponible</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">La gestion du mini-site est réservée aux conseillers et administrateurs.</p>
                </CardContent>
            </Card>
        </div>
     )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Mon Mini-site</h1>
        <p className="text-muted-foreground">
          Gérez l'apparence et le contenu de votre page publique.
        </p>
      </div>

       {userData?.publicProfileName && (
            <Alert>
                <LinkIcon className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                    Votre page est en ligne !
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/c/${userData.publicProfileName}`} target="_blank">
                            <Eye className="mr-2 h-4 w-4" />
                            Voir ma page
                        </Link>
                    </Button>
                </AlertTitle>
                <AlertDescription>
                    Votre mini-site est accessible à l'adresse :{' '}
                    <Link href={`/c/${userData.publicProfileName}`} target='_blank' className="font-mono bg-muted px-1 py-0.5 rounded hover:underline">
                        {`/c/${userData.publicProfileName}`}
                    </Link>
                </AlertDescription>
            </Alert>
        )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Accordion type="multiple" defaultValue={["hero-section"]} className="w-full space-y-4">
                <AccordionItem value="hero-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section Héro</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="hero.title" render={({ field }) => (<FormItem><FormLabel>Titre principal</FormLabel><FormControl><Textarea placeholder="Donnez un nouvel élan à votre carrière" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="hero.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Textarea placeholder="Un accompagnement personnalisé pour atteindre vos objectifs." {...field} /></FormControl><FormMessage /></FormItem>)} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="hero.ctaText" render={({ field }) => (<FormItem><FormLabel>Texte du bouton principal</FormLabel><FormControl><Input placeholder="Prendre rendez-vous" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="hero.ctaLink" render={({ field }) => (<FormItem><FormLabel>Lien du bouton principal</FormLabel><FormControl><Input placeholder="#contact" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label>Texte du bouton secondaire</Label>
                                  <Input value="Mon Espace" disabled />
                                </div>
                                <div className="space-y-2">
                                  <Label>Lien du bouton secondaire</Label>
                                  <Input value="/application" disabled />
                                </div>
                            </div>
                            <div className="space-y-4 rounded-lg border p-4">
                                <h4 className="text-sm font-medium">Options d'affichage</h4>
                                <FormField control={form.control} name="hero.showPhoto" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><FormLabel>Afficher ma photo de profil</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name="hero.showPhone" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><FormLabel>Afficher mon numéro de téléphone</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name="hero.showLocation" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><FormLabel>Afficher ma ville</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            </div>
                            <div className="space-y-6 rounded-lg border p-4">
                                <h4 className="text-sm font-medium">Arrière-plan</h4>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                        {heroBgImagePreview ? (<Image src={heroBgImagePreview} alt="Aperçu" layout="fill" objectFit="cover" />) : (<span className="text-xs text-muted-foreground p-2 text-center">Aucune image</span>)}
                                    </div>
                                    <input type="file" ref={fileInputHeroRef} onChange={(e) => handleFileUpload(e, (base64) => { setHeroBgImagePreview(base64); form.setValue('hero.bgImageUrl', base64); })} className="hidden" accept="image/*" />
                                    <div className="flex flex-col gap-2">
                                        <Button type="button" variant="outline" onClick={() => fileInputHeroRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Changer l'image</Button>
                                        {heroBgImagePreview && (<Button type="button" variant="destructive" size="sm" onClick={() => { setHeroBgImagePreview(null); form.setValue('hero.bgImageUrl', null);}}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>)}
                                    </div>
                                </div>
                                <FormField control={form.control} name="hero.bgColor" render={({ field }) => (<FormItem><FormLabel>Couleur de fond (si pas d'image)</FormLabel><div className="flex items-center gap-2"><Input type="color" {...field} className="w-10 h-10 p-1" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                            </div>
                            <div className="space-y-6 rounded-lg border p-4">
                                <h4 className="text-sm font-medium">Couleurs du texte</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="hero.titleColor" render={({ field }) => (<FormItem><FormLabel>Couleur du titre</FormLabel><div className="flex items-center gap-2"><Input type="color" {...field} className="w-10 h-10 p-1" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="hero.subtitleColor" render={({ field }) => (<FormItem><FormLabel>Couleur du sous-titre</FormLabel><div className="flex items-center gap-2"><Input type="color" {...field} className="w-10 h-10 p-1" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="attention-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section "Attention"</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                             <FormField control={form.control} name="attentionSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="attentionSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Titre de la section" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="attentionSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre (optionnel)</FormLabel><FormControl><Input placeholder="Sous-titre" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="attentionSection.text" render={({ field }) => (<FormItem><FormLabel>Texte</FormLabel><FormControl><Textarea placeholder="Contenu de la section..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>)}/>
                            <div className="space-y-6 rounded-lg border p-4">
                                <h4 className="text-sm font-medium">Couleurs</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <FormField control={form.control} name="attentionSection.titleColor" render={({ field }) => (<FormItem><FormLabel>Couleur du titre</FormLabel><div className="flex items-center gap-2"><Input type="color" {...field} className="w-10 h-10 p-1" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="attentionSection.subtitleColor" render={({ field }) => (<FormItem><FormLabel>Couleur du sous-titre</FormLabel><div className="flex items-center gap-2"><Input type="color" {...field} className="w-10 h-10 p-1" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="attentionSection.bgColor" render={({ field }) => (<FormItem><FormLabel>Couleur de fond</FormLabel><div className="flex items-center gap-2"><Input type="color" {...field} className="w-10 h-10 p-1" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="about-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section "À Propos"</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="aboutSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="aboutSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="À propos de moi" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="aboutSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input placeholder="Une approche sur-mesure" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="aboutSection.text" render={({ field }) => (<FormItem><FormLabel>Texte (si vide, la bio publique sera utilisée)</FormLabel><FormControl><Textarea placeholder="Parlez de votre parcours, de votre approche..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>)}/>
                             <div>
                                 <Label>Image</Label>
                                 <div className="flex items-center gap-4 mt-2">
                                     <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                         {aboutImagePreview ? (<Image src={aboutImagePreview} alt="Aperçu" layout="fill" objectFit="cover" />) : (<span className="text-xs text-muted-foreground p-2 text-center">Aucune image</span>)}
                                     </div>
                                     <input type="file" ref={fileInputAboutRef} onChange={(e) => handleFileUpload(e, (base64) => { setAboutImagePreview(base64); form.setValue('aboutSection.imageUrl', base64); })} className="hidden" accept="image/*" />
                                     <div className="flex flex-col gap-2">
                                         <Button type="button" variant="outline" onClick={() => fileInputAboutRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Changer l'image</Button>
                                         {aboutImagePreview && (<Button type="button" variant="destructive" size="sm" onClick={() => { setAboutImagePreview(null); form.setValue('aboutSection.imageUrl', null);}}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>)}
                                     </div>
                                 </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                
                 <AccordionItem value="services-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section "Mes Services"</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="servicesSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="servicesSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Mes Services" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="servicesSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input placeholder="Découvrez mes accompagnements" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            
                            <div>
                                <Label>Liste des services</Label>
                                <div className="space-y-4 mt-2">
                                    {serviceFields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">Service {index + 1}</h4>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeService(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                             <FormField control={form.control} name={`servicesSection.services.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Titre du service</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                             <FormField control={form.control} name={`servicesSection.services.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem> )}/>
                                             <div>
                                                <Label>Image du service</Label>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                                        {form.watch(`servicesSection.services.${index}.imageUrl`) ? (<Image src={form.watch(`servicesSection.services.${index}.imageUrl`)!} alt="Aperçu" layout="fill" objectFit="cover" />) : (<span className="text-xs text-muted-foreground p-2 text-center">Aucune image</span>)}
                                                    </div>
                                                    <input type="file" id={`service-image-${index}`} onChange={(e) => handleServiceImageUpload(index, e)} className="hidden" accept="image/*" />
                                                    <div className="flex flex-col gap-2">
                                                        <Button type="button" variant="outline" onClick={() => document.getElementById(`service-image-${index}`)?.click()}><Upload className="mr-2 h-4 w-4" />Changer</Button>
                                                        <Button type="button" variant="destructive" size="sm" onClick={() => form.setValue(`servicesSection.services.${index}.imageUrl`, null)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>
                                                    </div>
                                                </div>
                                             </div>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendService({ id: `service-${Date.now()}`, title: 'Nouveau service', description: 'Description du service.', imageUrl: null })}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un service
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="parcours-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Etapes d'accompagnement</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="parcoursSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="parcoursSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Etapes d'accompagnement" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="parcoursSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input placeholder="Mon approche pour votre réussite" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            
                            <div>
                                <Label>Liste des étapes</Label>
                                <div className="space-y-4 mt-2">
                                    {stepFields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">Étape {index + 1}</h4>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                             <FormField control={form.control} name={`parcoursSection.steps.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Titre de l'étape</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                             <FormField control={form.control} name={`parcoursSection.steps.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem> )}/>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendStep({ id: `step-${Date.now()}`, title: 'Nouvelle étape', description: 'Description de l\'étape.'})}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une étape
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="job-offers-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section "Offres d'emploi"</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="jobOffersSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="jobOffersSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Mes Offres d'Emploi" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="jobOffersSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input placeholder="Rejoignez mon équipe" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="jobOffersSection.description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Une description pour la section des offres d'emploi..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <div>
                                <Label>Liste des offres</Label>
                                <div className="space-y-4 mt-2">
                                    {jobOfferFields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">Offre {index + 1}</h4>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeJobOffer(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                             <FormField control={form.control} name={`jobOffersSection.offers.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Titre du poste</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                             <FormField control={form.control} name={`jobOffersSection.offers.${index}.contractType`} render={({ field }) => ( <FormItem><FormLabel>Type de contrat</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                             <FormField control={form.control} name={`jobOffersSection.offers.${index}.location`} render={({ field }) => ( <FormItem><FormLabel>Lieu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendJobOffer({ id: `job-${Date.now()}`, title: 'Nouveau Poste', contractType: 'CDI', location: 'À distance'})}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une offre
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="cta-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section CTA</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="ctaSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="ctaSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Prêt(e) à passer à l'action ?" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="ctaSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre (optionnel)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="ctaSection.text" render={({ field }) => (<FormItem><FormLabel>Texte</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="ctaSection.buttonText" render={({ field }) => (<FormItem><FormLabel>Texte du bouton</FormLabel><FormControl><Input placeholder="Prendre rendez-vous" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="ctaSection.buttonLink" render={({ field }) => (<FormItem><FormLabel>Lien du bouton</FormLabel><FormControl><Input placeholder="#contact" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            </div>
                            <div className="space-y-6 rounded-lg border p-4">
                                <h4 className="text-sm font-medium">Arrière-plan</h4>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                        {ctaImagePreview ? (<Image src={ctaImagePreview} alt="Aperçu CTA" layout="fill" objectFit="cover" />) : (<span className="text-xs text-muted-foreground p-2 text-center">Aucune image</span>)}
                                    </div>
                                    <input type="file" ref={fileInputCtaRef} onChange={(e) => handleFileUpload(e, (base64) => { setCtaImagePreview(base64); form.setValue('ctaSection.bgImageUrl', base64); })} className="hidden" accept="image/*" />
                                    <div className="flex flex-col gap-2">
                                        <Button type="button" variant="outline" onClick={() => fileInputCtaRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Changer</Button>
                                        {ctaImagePreview && (<Button type="button" variant="destructive" size="sm" onClick={() => { setCtaImagePreview(null); form.setValue('ctaSection.bgImageUrl', null);}}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>)}
                                    </div>
                                </div>
                                <FormField control={form.control} name="ctaSection.bgColor" render={({ field }) => (<FormItem><FormLabel>Couleur de fond (si pas d'image)</FormLabel><div className="flex items-center gap-2"><Input type="color" {...field} className="w-10 h-10 p-1" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="pricing-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section Formules (Pricing)</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="pricingSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="pricingSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Mes Formules" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="pricingSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Textarea placeholder="Choisissez la formule qui vous convient le mieux." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            
                            <FormField
                                control={form.control}
                                name="pricingSection.planIds"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-4">
                                            <FormLabel className="text-base">Formules à afficher</FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                Cochez les modèles de prestations que vous souhaitez afficher sur votre mini-site.
                                            </p>
                                        </div>
                                        {arePlansLoading ? <Skeleton className="h-20 w-full" /> : counselorPlans && counselorPlans.length > 0 ? (
                                            counselorPlans.map((plan) => (
                                                <FormField
                                                    key={plan.id}
                                                    control={form.control}
                                                    name="pricingSection.planIds"
                                                    render={({ field }) => {
                                                        return (
                                                        <FormItem
                                                            key={plan.id}
                                                            className="flex flex-row items-start space-x-3 space-y-0 p-3 border rounded-md"
                                                        >
                                                            <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(plan.id)}
                                                                onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...(field.value || []), plan.id])
                                                                    : field.onChange(
                                                                        field.value?.filter(
                                                                        (value) => value !== plan.id
                                                                        )
                                                                    )
                                                                }}
                                                            />
                                                            </FormControl>
                                                            <FormLabel className="font-normal w-full">
                                                                <div className="flex justify-between items-center">
                                                                    <span>{plan.name}</span>
                                                                    <span className="text-sm font-bold text-primary">{plan.price}€</span>
                                                                </div>
                                                            </FormLabel>
                                                        </FormItem>
                                                        )
                                                    }}
                                                    />
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Aucun modèle de prestation créé. Allez dans la section "Facturation" pour en créer.</p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </div>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="training-catalog-section" className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section "Catalogue de formation"</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="trainingCatalogSection.enabled" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Afficher cette section</FormLabel>
                                        <p className="text-sm text-muted-foreground">Affiche le catalogue de formation de la plateforme sur votre mini-site.</p>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )}/>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="products-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section "Nos Produits"</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="productsSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="productsSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="productsSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="productsSection.description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <div>
                                <Label>Liste des produits</Label>
                                <div className="space-y-4 mt-2">
                                    {productFields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">Produit {index + 1}</h4>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                            <FormField control={form.control} name={`productsSection.products.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`productsSection.products.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`productsSection.products.${index}.price`} render={({ field }) => (<FormItem><FormLabel>Prix</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`productsSection.products.${index}.ctaText`} render={({ field }) => (<FormItem><FormLabel>Texte du bouton</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`productsSection.products.${index}.ctaLink`} render={({ field }) => (<FormItem><FormLabel>Lien du bouton</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <div>
                                                <Label>Image</Label>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="w-32 h-32 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                                        {form.watch(`productsSection.products.${index}.imageUrl`) ? <Image src={form.watch(`productsSection.products.${index}.imageUrl`)!} alt="Aperçu" layout="fill" objectFit="cover" /> : <span className="text-xs text-muted-foreground">Aucune image</span>}
                                                    </div>
                                                    <input type="file" id={`product-image-${index}`} onChange={(e) => handleProductImageUpload(index, e)} className="hidden" accept="image/*" />
                                                    <div className="flex flex-col gap-2">
                                                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`product-image-${index}`)?.click()}><Upload className="mr-2 h-4 w-4"/>Uploader</Button>
                                                        <Button type="button" variant="destructive" size="sm" onClick={() => form.setValue(`productsSection.products.${index}.imageUrl`, null)}><Trash2 className="mr-2 h-4 w-4"/>Supprimer</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendProduct({ id: `product-${Date.now()}`, title: 'Nouveau Produit', description: '', price: 0, ctaText: 'Acheter', ctaLink: '#', imageUrl: null })} className="mt-4"><PlusCircle className="mr-2 h-4 w-4" />Ajouter un produit</Button>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="testimonials-section" className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="text-lg font-medium px-6 py-4 bg-muted/50">Section "Témoignages"</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="testimonialsSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="testimonialsSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Ce qu'ils pensent de mon travail" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="testimonialsSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input placeholder="La satisfaction de mes clients est ma priorité" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <div>
                                <Label>Liste des témoignages</Label>
                                <div className="space-y-4 mt-2">
                                    {testimonialFields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">Témoignage {index + 1}</h4>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeTestimonial(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                            <FormField control={form.control} name={`testimonialsSection.testimonials.${index}.authorName`} render={({ field }) => (<FormItem><FormLabel>Nom de l'auteur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`testimonialsSection.testimonials.${index}.authorTitle`} render={({ field }) => (<FormItem><FormLabel>Titre/Poste de l'auteur</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`testimonialsSection.testimonials.${index}.text`} render={({ field }) => (<FormItem><FormLabel>Texte du témoignage</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)}/>
                                            <div>
                                                <Label>Photo de l'auteur</Label>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <Avatar className="h-16 w-16">
                                                        <AvatarImage src={form.watch(`testimonialsSection.testimonials.${index}.photoUrl`) || undefined} />
                                                        <AvatarFallback>
                                                            {form.watch(`testimonialsSection.testimonials.${index}.authorName`)?.charAt(0) || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <input type="file" ref={fileInputTestimonialRef} onChange={(e) => handleFileUpload(e, (base64) => form.setValue(`testimonialsSection.testimonials.${index}.photoUrl`, base64))} className="hidden" accept="image/*" />
                                                    <div className="flex flex-col gap-2">
                                                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputTestimonialRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Changer</Button>
                                                        <Button type="button" variant="destructive" size="sm" onClick={() => form.setValue(`testimonialsSection.testimonials.${index}.photoUrl`, null)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {testimonialFields.length < 3 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendTestimonial({ id: `testimonial-${Date.now()}`, authorName: '', authorTitle: '', text: '', photoUrl: null})}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un témoignage
                                    </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="activities-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section "Autres Activités"</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="activitiesSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="activitiesSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Nos autres activités" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="activitiesSection.text" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input placeholder="Nous accompagnons également les entreprises" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            
                            <div className="space-y-6 rounded-lg border p-4">
                                <h4 className="text-sm font-medium">Média (colonne de gauche)</h4>
                                <FormField
                                    control={form.control}
                                    name="activitiesSection.mediaType"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                        <FormLabel>Type de média</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex items-center space-x-4"
                                            >
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="video" /></FormControl>
                                                <FormLabel className="font-normal">Vidéo</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="image" /></FormControl>
                                                <FormLabel className="font-normal">Image</FormLabel>
                                            </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {form.watch('activitiesSection.mediaType') === 'video' ? (
                                    <FormField control={form.control} name="activitiesSection.videoUrl" render={({ field }) => (<FormItem><FormLabel>URL de la Vidéo</FormLabel><FormControl><Input placeholder="https://www.youtube.com/embed/..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                ) : (
                                    <div>
                                        <Label>Image</Label>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                                {activitiesImagePreview ? (<Image src={activitiesImagePreview} alt="Aperçu" layout="fill" objectFit="cover" />) : (<span className="text-xs text-muted-foreground p-2 text-center">Aucune image</span>)}
                                            </div>
                                            <input type="file" ref={fileInputActivitiesRef} onChange={(e) => handleFileUpload(e, (base64) => { setActivitiesImagePreview(base64); form.setValue('activitiesSection.imageUrl', base64); })} className="hidden" accept="image/*" />
                                            <div className="flex flex-col gap-2">
                                                <Button type="button" variant="outline" onClick={() => fileInputActivitiesRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Changer</Button>
                                                {activitiesImagePreview && (<Button type="button" variant="destructive" size="sm" onClick={() => { setActivitiesImagePreview(null); form.setValue('activitiesSection.imageUrl', null);}}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6 rounded-lg border p-4">
                                <h4 className="text-sm font-medium">Centres d'intérêt (sous le média)</h4>
                                 <FormField control={form.control} name="activitiesSection.interestsTitle" render={({ field }) => (<FormItem><FormLabel>Titre de la section</FormLabel><FormControl><Input placeholder="Mes centres d'intérêt" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <div>
                                    <Label>Liste des intérêts</Label>
                                     <div className="space-y-4 mt-2">
                                        {interestFields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                                                <div className="col-span-5"><FormField control={form.control} name={`activitiesSection.interests.${index}.text`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Texte de l'intérêt" {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                                <div className="col-span-6"><FormField control={form.control} name={`activitiesSection.interests.${index}.link`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Lien (optionnel)" {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                                <div className="col-span-1"><Button type="button" variant="ghost" size="icon" onClick={() => removeInterest(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendInterest({ id: `interest-${Date.now()}`, text: '', link: ''})} className="mt-2">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un intérêt
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-6 rounded-lg border p-4">
                                <h4 className="text-sm font-medium">Événements (colonne de droite)</h4>
                                <div>
                                    <Label>Liste des événements</Label>
                                    <div className="space-y-4 mt-2">
                                        {eventFields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                                                <div className="col-span-5"><FormField control={form.control} name={`activitiesSection.events.${index}.title`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Titre de l'événement" {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                                <div className="col-span-5"><FormField control={form.control} name={`activitiesSection.events.${index}.date`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Date" {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                                <div className="col-span-2"><Button type="button" variant="ghost" size="icon" onClick={() => removeEvent(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendEvent({ id: `event-${Date.now()}`, title: 'Nouvel événement', date: 'Date'})} className="mt-2">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un événement
                                    </Button>
                                </div>
                                <FormField control={form.control} name="activitiesSection.eventsButtonText" render={({ field }) => (<FormItem><FormLabel>Texte du bouton</FormLabel><FormControl><Input placeholder="J'ai participé à un live" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="contact-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='text-lg font-medium px-6 py-4 bg-muted/50'>Section "Contact"</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 p-6">
                            <FormField control={form.control} name="contactSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="contactSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Contactez-moi" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="contactSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input placeholder="Un projet, une question ? N'hésitez pas." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <div className="border-t pt-6 space-y-4">
                                <h4 className="font-medium text-sm text-muted-foreground">Informations de contact (pré-remplies depuis votre profil)</h4>
                                <FormField control={form.control} name="contactSection.commercialName" render={({ field }) => (<FormItem><FormLabel>Nom Commercial</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contactSection.siret" render={({ field }) => (<FormItem><FormLabel>SIRET</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contactSection.address" render={({ field }) => (<FormItem><FormLabel>Adresse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="contactSection.zipCode" render={({ field }) => (<FormItem><FormLabel>Code Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={form.control} name="contactSection.city" render={({ field }) => (<FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                </div>
                                <FormField control={form.control} name="contactSection.email" render={({ field }) => (<FormItem><FormLabel>Email de contact</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contactSection.phone" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            </div>
                            <div className="border-t pt-6 space-y-4">
                                <h4 className="font-medium">Réseaux Sociaux</h4>
                                <FormField control={form.control} name="contactSection.socialLinks.linkedin" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Linkedin className="h-5 w-5" /><FormLabel className="w-20">LinkedIn</FormLabel><FormControl><Input placeholder="URL de votre profil LinkedIn" {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contactSection.socialLinks.facebook" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Facebook className="h-5 w-5" /><FormLabel className="w-20">Facebook</FormLabel><FormControl><Input placeholder="URL de votre page Facebook" {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contactSection.socialLinks.instagram" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Instagram className="h-5 w-5" /><FormLabel className="w-20">Instagram</FormLabel><FormControl><Input placeholder="URL de votre profil Instagram" {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contactSection.socialLinks.x" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Twitter className="h-5 w-5" /><FormLabel className="w-20">X (Twitter)</FormLabel><FormControl><Input placeholder="URL de votre profil X" {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contactSection.socialLinks.youtube" render={({ field }) => (<FormItem><div className="flex items-center gap-2"><Youtube className="h-5 w-5" /><FormLabel className="w-20">YouTube</FormLabel><FormControl><Input placeholder="URL de votre chaîne YouTube" {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="contactSection.socialLinks.tiktok" render={({ field }) => (<FormItem><FormLabel>TikTok</FormLabel><FormControl><Input placeholder="URL de votre profil TikTok" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

            </Accordion>
            <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sauvegarder les modifications
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
