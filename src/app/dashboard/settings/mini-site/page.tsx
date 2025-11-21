
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, Upload, Trash2, PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CounselorHero } from '@/components/shared/counselor-hero';
import Image from 'next/image';
import { AttentionSection } from '@/components/shared/attention-section';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AboutMeSection } from '@/components/shared/about-me-section';
import { ActivitiesSection } from '@/components/shared/activities-section';
import { CounselorServicesSection } from '@/components/shared/counselor-services-section';
import { ParcoursSection } from '@/components/shared/parcours-section';

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});

const heroSchema = z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    text: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    showPhoto: z.boolean().default(true),
    bgColor: z.string().optional(),
    bgImageUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
});

const attentionSchema = z.object({
    enabled: z.boolean().default(true),
    title: z.string().optional(),
    text: z.string().optional(),
});

const aboutSchema = z.object({
  enabled: z.boolean().default(true),
  imageUrl: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
});

const activitiesSchema = z.object({
  enabled: z.boolean().default(true),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
});


const serviceItemSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Le titre est requis.'),
    description: z.string().min(1, 'La description est requise.'),
    imageUrl: z.string().optional(),
});

const servicesSchema = z.object({
    enabled: z.boolean().default(true),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    services: z.array(serviceItemSchema),
});

const parcoursStepSchema = z.object({
    id: z.string(),
    title: z.string().min(1, "Le titre de l'étape est requis."),
    description: z.string().min(1, "La description est requise."),
});

const parcoursSchema = z.object({
    enabled: z.boolean().default(true),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    steps: z.array(parcoursStepSchema),
});

const sectionConfigSchema = z.object({
  id: z.string(),
  label: z.string(),
  enabled: z.boolean(),
});

const miniSiteSchema = z.object({
    hero: heroSchema,
    attentionSection: attentionSchema,
    aboutSection: aboutSchema,
    activitiesSection: activitiesSchema,
    parcoursSection: parcoursSchema,
    servicesSection: servicesSchema,
    sections: z.array(sectionConfigSchema),
});

type MiniSiteFormData = z.infer<typeof miniSiteSchema>;
export type ServiceItem = z.infer<typeof serviceItemSchema>;
export type ParcoursStep = z.infer<typeof parcoursStepSchema>;
type Section = z.infer<typeof sectionConfigSchema>;


const defaultMiniSiteConfig: MiniSiteFormData = {
    hero: {
        title: 'Donnez un nouvel élan à votre carrière',
        subtitle: 'Un accompagnement personnalisé pour atteindre vos objectifs.',
        text: "Avec plus de 10 ans d'expérience, je vous guide vers une carrière alignée avec vos valeurs et ambitions. Ensemble, nous révélerons votre plein potentiel.",
        ctaText: 'Prendre rendez-vous',
        ctaLink: '#contact',
        showPhoto: true,
        bgColor: '#111827',
        bgImageUrl: '',
        primaryColor: '#0ea5e9',
        secondaryColor: '#f8fafc',
    },
    attentionSection: {
        enabled: true,
        title: 'Attention',
        text: 'Mettez en avant un message important ici.',
    },
    aboutSection: {
        enabled: true,
        imageUrl: '',
        title: 'À propos de moi',
        text: "Votre biographie ou texte de présentation s'affichera ici.",
    },
    activitiesSection: {
        enabled: true,
        imageUrl: '',
        videoUrl: '',
        title: 'Mes Activités',
        text: "Présentez ici vos activités, ateliers ou conférences.",
    },
    parcoursSection: {
        enabled: true,
        title: "Votre parcours de transformation",
        subtitle: "Un cheminement structuré et bienveillant pour vous guider à chaque étape de votre évolution.",
        steps: [
            { id: 'step-1', title: "Étape 1: Bilan & Intention", description: "Faire le point sur votre situation, vos besoins et poser une intention claire." },
            { id: 'step-2', title: "Étape 2: Exploration", description: "Séances personnalisées alliant coaching et outils de développement personnel." },
            { id: 'step-3', title: "Étape 3: Intégration", description: "Nous consolidons vos acquis et mettons en place un plan d'action durable." },
            { id: 'step-4', title: "Étape 4: Épanouissement", description: "Vous repartez avec les clés pour poursuivre votre chemin en toute autonomie." }
        ]
    },
    servicesSection: {
        enabled: true,
        title: "Mes Services",
        subtitle: "Découvrez comment je peux vous aider",
        services: [
            { id: 'service-1', title: 'Service 1', description: 'Description du service 1.', imageUrl: '' },
            { id: 'service-2', title: 'Service 2', description: 'Description du service 2.', imageUrl: '' },
            { id: 'service-3', title: 'Service 3', description: 'Description du service 3.', imageUrl: '' },
        ]
    },
    sections: [
        { id: 'hero', label: 'Héro', enabled: true },
        { id: 'attentionSection', label: 'Attention', enabled: true },
        { id: 'aboutSection', label: 'À propos', enabled: true },
        { id: 'activitiesSection', label: 'Mes Activités', enabled: true },
        { id: 'parcoursSection', label: 'Parcours', enabled: true },
        { id: 'servicesSection', label: 'Services', enabled: true },
    ]
};

function PreviewPanel({ formData, userData }: { formData: any, userData: any }) {
    const counselorPreviewData = {
        ...(userData || {}),
        miniSite: {
            ...userData?.miniSite,
            ...formData,
        }
    };
    
    const copyrightText = counselorPreviewData.agencyInfo?.copyrightText || "VApps.";
    const copyrightUrl = counselorPreviewData.agencyInfo?.copyrightUrl || "/";
    const footerBgColor = formData.hero?.bgColor || '#f1f5f9';
    const primaryColor = formData.hero?.primaryColor || '#10B981';

    const sections = formData.sections || [];

    const sectionComponents: { [key: string]: React.ComponentType<{ counselor: any }> } = {
        hero: CounselorHero,
        attentionSection: AttentionSection,
        aboutSection: AboutMeSection,
        activitiesSection: ActivitiesSection,
        parcoursSection: ParcoursSection,
        servicesSection: CounselorServicesSection,
    };

    return (
        <SheetContent className="w-full sm:max-w-full lg:w-[80vw] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Aperçu de la page</SheetTitle>
            <SheetDescription>
              Ceci est une prévisualisation de votre page publique. Les modifications apparaissent en temps réel.
            </SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100vh-80px)] overflow-y-auto bg-muted">
            {sections.map((section: Section) => {
                if (!section.enabled) return null;
                const Component = sectionComponents[section.id];
                return Component ? <Component key={section.id} counselor={counselorPreviewData} /> : null;
            })}
             <footer className="py-6 text-center text-sm" style={{ backgroundColor: footerBgColor }}>
                <p className="text-muted-foreground">© {new Date().getFullYear()} - <Link href={copyrightUrl} className="hover:underline" style={{color: primaryColor}}>{copyrightText}</Link></p>
             </footer>
          </div>
        </SheetContent>
    )
}

export default function MiniSitePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const aboutImageInputRef = useRef<HTMLInputElement>(null);
  const activitiesImageInputRef = useRef<HTMLInputElement>(null);
  const servicesImageInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'minisites', user.uid);
  }, [firestore, user]);
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const form = useForm<MiniSiteFormData>({
    resolver: zodResolver(miniSiteSchema),
    defaultValues: defaultMiniSiteConfig,
  });

  const { watch, setValue, control } = form;
  const watchedFormData = watch();
  
  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control,
    name: "servicesSection.services",
  });
  
  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: "parcoursSection.steps",
  });
  
   const { fields: sectionFields, move: moveSection, update: updateSection } = useFieldArray({
    control,
    name: "sections",
  });

  
  useEffect(() => {
    if (userData?.miniSite) {
        form.reset({
            hero: { ...defaultMiniSiteConfig.hero, ...(userData.miniSite.hero || {}) },
            attentionSection: { ...defaultMiniSiteConfig.attentionSection, ...(userData.miniSite.attentionSection || {}) },
            aboutSection: { ...defaultMiniSiteConfig.aboutSection, ...(userData.miniSite.aboutSection || {}) },
            activitiesSection: { ...defaultMiniSiteConfig.activitiesSection, ...(userData.miniSite.activitiesSection || {}) },
            parcoursSection: { ...defaultMiniSiteConfig.parcoursSection, ...(userData.miniSite.parcoursSection || {}) },
            servicesSection: { ...defaultMiniSiteConfig.servicesSection, ...(userData.miniSite.servicesSection || {}) },
            sections: userData.miniSite.sections || defaultMiniSiteConfig.sections,
        });
    }
  }, [userData, form]);

  const [bgImagePreview, setBgImagePreview] = useState(form.getValues('hero.bgImageUrl'));
  const [aboutImagePreview, setAboutImagePreview] = useState(form.getValues('aboutSection.imageUrl'));
  const [activitiesImagePreview, setActivitiesImagePreview] = useState(form.getValues('activitiesSection.imageUrl'));


    useEffect(() => {
        setBgImagePreview(form.watch('hero.bgImageUrl'));
    }, [form.watch('hero.bgImageUrl')]);
    
    useEffect(() => {
        setAboutImagePreview(form.watch('aboutSection.imageUrl'));
    }, [form.watch('aboutSection.imageUrl')]);

    useEffect(() => {
        setActivitiesImagePreview(form.watch('activitiesSection.imageUrl'));
    }, [form.watch('activitiesSection.imageUrl')]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: any) => {
      const file = event.target.files?.[0];
      if (file) {
          const base64 = await toBase64(file);
          setValue(fieldName, base64);
      }
  };

  const onSubmit = async (data: MiniSiteFormData) => {
    if (!userDocRef) return;
    setIsSubmitting(true);
    try {
        await setDocumentNonBlocking(userDocRef, {
            miniSite: {
                ...(userData?.miniSite || {}),
                ...data,
            },
        }, { merge: true });
        toast({ title: "Paramètres enregistrés", description: "Votre mini-site a été mis à jour." });
    } catch (error) {
        toast({ title: "Erreur", description: "Impossible de sauvegarder les paramètres.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
      return <div>Chargement...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold font-headline">Mon Mini-site</h1>
            <p className="text-muted-foreground">
            Gérez l'apparence et le contenu de votre page publique de conseiller.
            </p>
        </div>
         <div className="flex items-center gap-2">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline"><Eye className="mr-2" /> Aperçu</Button>
                </SheetTrigger>
                <PreviewPanel formData={watchedFormData} userData={userData} />
            </Sheet>
            {user && userData?.miniSite?.publicProfileName && (
                <Button asChild>
                    <Link href={`/c/${userData.miniSite.publicProfileName}`} target="_blank">
                        Ouvrir la page publique
                    </Link>
                </Button>
            )}
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Accordion type="single" collapsible defaultValue="organization-section" className="w-full space-y-4">
                <AccordionItem value="organization-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='bg-muted/50 px-6 py-4 font-semibold text-lg'>Organisation des sections</AccordionTrigger>
                    <AccordionContent>
                        <div className="p-6 space-y-2">
                        {sectionFields.map((section, index) => (
                            <div key={section.id} className="flex items-center gap-2 p-3 border rounded-md bg-background">
                                <div className="flex-1 font-medium">{section.label}</div>
                                <div className="flex gap-1">
                                    <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveSection(index, index - 1)}
                                    disabled={index === 0}
                                    className="h-8 w-8"
                                    >
                                    <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveSection(index, index + 1)}
                                    disabled={index === sectionFields.length - 1}
                                    className="h-8 w-8"
                                    >
                                    <ArrowDown className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Switch
                                    checked={section.enabled}
                                    onCheckedChange={(checked) => updateSection(index, { ...section, enabled: checked })}
                                />
                            </div>
                        ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="hero-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='bg-muted/50 px-6 py-4 font-semibold text-lg'>Section Héro</AccordionTrigger>
                    <AccordionContent>
                        <div className="p-6 space-y-6">
                            <FormField control={form.control} name="hero.title" render={({ field }) => ( <FormItem> <FormLabel>Titre principal</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="hero.subtitle" render={({ field }) => ( <FormItem> <FormLabel>Sous-titre</FormLabel> <FormControl> <Textarea {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="hero.text" render={({ field }) => ( <FormItem> <FormLabel>Texte de présentation</FormLabel> <FormControl> <Textarea {...field} rows={4} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="hero.ctaText" render={({ field }) => ( <FormItem> <FormLabel>Texte du bouton d'action</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="hero.ctaLink" render={({ field }) => ( <FormItem> <FormLabel>Lien du bouton d'action</FormLabel> <FormControl> <Input {...field} placeholder="#contact ou https://..." /> </FormControl> <FormMessage /> </FormItem> )}/>
                            </div>
                            <div className="space-y-4 rounded-lg border p-4">
                                <h4 className="font-medium">Options d'affichage</h4>
                                <FormField control={form.control} name="hero.showPhoto" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"> <div className="space-y-0.5"> <FormLabel>Afficher ma photo de profil</FormLabel> </div> <FormControl> <Switch checked={field.value} onCheckedChange={field.onChange} /> </FormControl> </FormItem> )}/>
                            </div>
                            <div className="space-y-4 rounded-lg border p-4">
                                <h4 className="font-medium">Arrière-plan</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="hero.bgColor" render={({ field }) => ( <FormItem> <FormLabel>Couleur de fond</FormLabel> <FormControl> <div className="flex items-center gap-2"> <Input type="color" {...field} className="p-1 h-10 w-10" /> <Input type="text" {...field} /> </div> </FormControl> <FormMessage /> </FormItem> )}/>
                                    <div>
                                        <FormLabel>Image de fond</FormLabel>
                                        <input type="file" ref={bgImageInputRef} onChange={(e) => handleFileUpload(e, 'hero.bgImageUrl')} className="hidden" accept="image/*" />
                                        <div className="mt-2 flex items-center gap-4">
                                            <div className="w-24 h-16 rounded border bg-muted flex items-center justify-center">
                                                {bgImagePreview ? <Image src={bgImagePreview} alt="Aperçu" width={96} height={64} className="object-cover h-full w-full rounded" /> : <span className="text-xs text-muted-foreground">Aucune</span>}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <Button type="button" variant="outline" size="sm" onClick={() => bgImageInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Uploader</Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setValue('hero.bgImageUrl', '')}><Trash2 className="mr-2 h-4 w-4" /> Retirer</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 rounded-lg border p-4">
                                <h4 className="font-medium">Couleurs dominantes</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="hero.primaryColor" render={({ field }) => ( <FormItem> <FormLabel>Couleur primaire (boutons, liens)</FormLabel> <FormControl> <div className="flex items-center gap-2"> <Input type="color" {...field} className="p-1 h-10 w-10" /> <Input type="text" {...field} /> </div> </FormControl> <FormMessage /> </FormItem> )}/>
                                    <FormField control={form.control} name="hero.secondaryColor" render={({ field }) => ( <FormItem> <FormLabel>Couleur secondaire</FormLabel> <FormControl> <div className="flex items-center gap-2"> <Input type="color" {...field} className="p-1 h-10 w-10" /> <Input type="text" {...field} /> </div> </FormControl> <FormMessage /> </FormItem> )}/>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="attention-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='bg-muted/50 px-6 py-4 font-semibold text-lg'>Section "Attention"</AccordionTrigger>
                    <AccordionContent>
                        <div className="p-6 space-y-6">
                            <FormField control={form.control} name="attentionSection.title" render={({ field }) => ( <FormItem> <FormLabel>Titre</FormLabel> <FormControl> <Input {...field} placeholder="Titre de la section..." /> </FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="attentionSection.text" render={({ field }) => ( <FormItem> <FormLabel>Texte</FormLabel> <FormControl> <Textarea {...field} placeholder="Votre message important..." rows={5}/> </FormControl> <FormMessage /> </FormItem> )}/>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="about-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='bg-muted/50 px-6 py-4 font-semibold text-lg'>Section "À Propos"</AccordionTrigger>
                    <AccordionContent>
                        <div className="p-6 space-y-6">
                            <FormField control={form.control} name="aboutSection.title" render={({ field }) => ( <FormItem> <FormLabel>Titre</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="aboutSection.text" render={({ field }) => ( <FormItem> <FormLabel>Texte</FormLabel> <FormControl> <Textarea {...field} rows={8}/> </FormControl> <FormMessage /> </FormItem> )}/>
                            <div>
                                <FormLabel>Image</FormLabel>
                                <div className="mt-2 flex items-center gap-4">
                                    <div className="w-24 h-16 rounded border bg-muted flex items-center justify-center">
                                        {aboutImagePreview ? <Image src={aboutImagePreview} alt="Aperçu" width={96} height={64} className="object-cover h-full w-full rounded" /> : <span className="text-xs text-muted-foreground">Image</span>}
                                    </div>
                                    <input type="file" ref={aboutImageInputRef} onChange={(e) => handleFileUpload(e, 'aboutSection.imageUrl')} className="hidden" accept="image/*" />
                                    <div className="flex flex-col gap-1">
                                        <Button type="button" variant="outline" size="sm" onClick={() => aboutImageInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Changer l'image</Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setValue('aboutSection.imageUrl', '')}><Trash2 className="mr-2 h-4 w-4" /> Retirer</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="activities-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='bg-muted/50 px-6 py-4 font-semibold text-lg'>Section "Mes Activités"</AccordionTrigger>
                    <AccordionContent>
                        <div className="p-6 space-y-6">
                            <FormField control={form.control} name="activitiesSection.title" render={({ field }) => ( <FormItem> <FormLabel>Titre</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="activitiesSection.text" render={({ field }) => ( <FormItem> <FormLabel>Texte</FormLabel> <FormControl> <Textarea {...field} rows={8}/> </FormControl> <FormMessage /> </FormItem> )}/>
                            <div>
                                <FormLabel>Média (Vidéo ou Image)</FormLabel>
                                <div className="mt-2 p-4 border rounded-md space-y-4">
                                    <FormField control={form.control} name="activitiesSection.videoUrl" render={({ field }) => ( <FormItem> <FormLabel>URL de la vidéo (prioritaire)</FormLabel> <FormControl> <Input {...field} placeholder="https://www.youtube.com/embed/..."/> </FormControl> <FormMessage /> </FormItem> )}/>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-grow border-t"></div>
                                        <span className="text-xs text-muted-foreground">OU</span>
                                        <div className="flex-grow border-t"></div>
                                    </div>
                                    <div>
                                        <FormLabel>Image</FormLabel>
                                        <div className="mt-2 flex items-center gap-4">
                                            <div className="w-24 h-16 rounded border bg-muted flex items-center justify-center">
                                                {activitiesImagePreview ? <Image src={activitiesImagePreview} alt="Aperçu" width={96} height={64} className="object-cover h-full w-full rounded" /> : <span className="text-xs text-muted-foreground">Image</span>}
                                            </div>
                                            <input type="file" ref={activitiesImageInputRef} onChange={(e) => handleFileUpload(e, 'activitiesSection.imageUrl')} className="hidden" accept="image/*" />
                                            <div className="flex flex-col gap-1">
                                                <Button type="button" variant="outline" size="sm" onClick={() => activitiesImageInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Changer l'image</Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setValue('activitiesSection.imageUrl', '')}><Trash2 className="mr-2 h-4 w-4" /> Retirer</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="parcours-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='bg-muted/50 px-6 py-4 font-semibold text-lg'>Section "Parcours"</AccordionTrigger>
                    <AccordionContent>
                        <div className="p-6 space-y-6">
                            <FormField control={form.control} name="parcoursSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="parcoursSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                            <div className='space-y-4'>
                                <Label>Étapes du parcours</Label>
                                {stepFields.map((item, index) => (
                                    <div key={item.id} className="p-4 border rounded-lg space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-medium">Étape {index + 1}</h4>
                                            <Button variant="ghost" size="icon" onClick={() => removeStep(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                        <FormField control={form.control} name={`parcoursSection.steps.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Titre de l'étape</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`parcoursSection.steps.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description de l'étape</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendStep({ id: `step-${Date.now()}`, title: '', description: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter une étape</Button>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="services-section" className='border rounded-lg overflow-hidden'>
                    <AccordionTrigger className='bg-muted/50 px-6 py-4 font-semibold text-lg'>Section "Services"</AccordionTrigger>
                    <AccordionContent>
                        <div className="p-6 space-y-6">
                            <FormField control={form.control} name="servicesSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="servicesSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <div className='space-y-4'>
                                <Label>Services</Label>
                                {serviceFields.map((item, index) => (
                                    <div key={item.id} className="p-4 border rounded-lg space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-medium">Service {index + 1}</h4>
                                            <Button variant="ghost" size="icon" onClick={() => removeService(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                        <FormField control={form.control} name={`servicesSection.services.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Titre du service</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`servicesSection.services.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Description du service</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div>
                                            <Label>Image du service</Label>
                                            <input type="file" ref={el => servicesImageInputRefs.current[index] = el} onChange={(e) => handleFileUpload(e, `servicesSection.services.${index}.imageUrl`)} className="hidden" accept="image/*" />
                                            <div className="mt-2 flex items-center gap-4">
                                                <div className="w-24 h-16 rounded border bg-muted flex items-center justify-center">
                                                    {watch(`servicesSection.services.${index}.imageUrl`) ? <Image src={watch(`servicesSection.services.${index}.imageUrl`)!} alt="Aperçu" width={96} height={64} className="object-cover h-full w-full rounded" /> : <span className="text-xs text-muted-foreground">Aucune</span>}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => servicesImageInputRefs.current[index]?.click()}><Upload className="mr-2 h-4 w-4" /> Uploader</Button>
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => setValue(`servicesSection.services.${index}.imageUrl`, '')}><Trash2 className="mr-2 h-4 w-4" /> Retirer</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendService({ id: `service-${Date.now()}`, title: '', description: '', imageUrl: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un service</Button>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les modifications
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
