
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDoc, useMemoFirebase, setDocumentNonBlocking, useUser } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { doc, setDoc, query, collection, where, getDocs, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Upload, Trash2, Eye } from 'lucide-react';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link as LinkIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const heroSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  cta2Text: z.string().optional(),
  cta2Link: z.string().optional(),
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
});

const aboutSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  text: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
});

const miniSiteSchema = z.object({
  hero: heroSchema.optional(),
  attentionSection: attentionSchema.optional(),
  aboutSection: aboutSchema.optional(),
});

type MiniSiteFormData = z.infer<typeof miniSiteSchema>;


type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  publicProfileName?: string;
  miniSite?: MiniSiteFormData;
  dashboardTheme?: any;
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
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserProfile>(userDocRef);

  const [heroBgImagePreview, setHeroBgImagePreview] = useState<string | null | undefined>(null);
  const [aboutImagePreview, setAboutImagePreview] = useState<string | null | undefined>(null);

  const form = useForm<MiniSiteFormData>({
    resolver: zodResolver(miniSiteSchema),
    defaultValues: {
      hero: {
        title: '',
        subtitle: '',
        ctaText: '',
        ctaLink: '',
        cta2Text: '',
        cta2Link: '',
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
      },
      aboutSection: {
        enabled: false,
        title: 'À propos de moi',
        subtitle: 'Une approche sur-mesure',
        text: '',
        imageUrl: null,
      },
    },
  });

  useEffect(() => {
    if (userData?.miniSite) {
      form.reset(userData.miniSite);
      setHeroBgImagePreview(userData.miniSite.hero?.bgImageUrl);
      setAboutImagePreview(userData.miniSite.aboutSection?.imageUrl);
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

      if(userData?.role === 'conseiller') {
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
  
  if (userData?.role !== 'conseiller') {
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
                    <p className="text-muted-foreground">La gestion du mini-site est réservée aux conseillers.</p>
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
          Gérez l'apparence et le contenu de votre page publique de conseiller.
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
                                <FormField control={form.control} name="hero.cta2Text" render={({ field }) => (<FormItem><FormLabel>Texte du bouton secondaire</FormLabel><FormControl><Input placeholder="Mon Espace" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="hero.cta2Link" render={({ field }) => (<FormItem><FormLabel>Lien du bouton secondaire</FormLabel><FormControl><Input placeholder="/application" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
                             <FormField control={form.control} name="attentionSection.enabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Afficher cette section</FormLabel><FormDescription>Active ou désactive la section "Attention" sur votre mini-site.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name="attentionSection.title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Titre de la section" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="attentionSection.subtitle" render={({ field }) => (<FormItem><FormLabel>Sous-titre (optionnel)</FormLabel><FormControl><Input placeholder="Sous-titre" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="attentionSection.text" render={({ field }) => (<FormItem><FormLabel>Texte</FormLabel><FormControl><Textarea placeholder="Contenu de la section..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>)}/>
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
