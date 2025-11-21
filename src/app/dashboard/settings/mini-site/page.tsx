
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDoc, useMemoFirebase, setDocumentNonBlocking, useUser } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
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

type HeroFormData = z.infer<typeof heroSchema>;

type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  publicProfileName?: string;
  miniSite?: {
    hero?: HeroFormData;
  };
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserProfile>(userDocRef);

  const [bgImagePreview, setBgImagePreview] = useState<string | null | undefined>(null);

  const form = useForm<HeroFormData>({
    resolver: zodResolver(heroSchema),
    defaultValues: {
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
  });

  useEffect(() => {
    if (userData?.miniSite?.hero) {
      form.reset(userData.miniSite.hero);
      setBgImagePreview(userData.miniSite.hero.bgImageUrl);
    }
  }, [userData, form]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const base64 = await toBase64(file);
      setBgImagePreview(base64);
      form.setValue('bgImageUrl', base64);
    }
  };
  
  const handleRemovePhoto = () => {
    setBgImagePreview(null);
    form.setValue('bgImageUrl', null);
  };

  const onSubmit = async (data: HeroFormData) => {
    if (!user || !userDocRef) return;
    setIsSubmitting(true);

    try {
      // 1. Update the user document
      await setDocumentNonBlocking(userDocRef, {
        miniSite: {
          ...userData?.miniSite,
          hero: data
        }
      }, { merge: true });

      // 2. Update the public minisite document
      if(userData?.role === 'conseiller') {
          const minisiteDocRef = doc(firestore, 'minisites', user.uid);
          await setDocumentNonBlocking(minisiteDocRef, {
              miniSite: {
                ...userData?.miniSite,
                hero: data
              }
          }, { merge: true });
      }

      toast({
        title: 'Section Héro mise à jour',
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
            <Card>
                <CardHeader>
                    <CardTitle>Section Héro</CardTitle>
                    <CardDescription>
                        Personnalisez la section principale de votre page publique.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Titre principal</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Donnez un nouvel élan à votre carrière" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="subtitle"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sous-titre</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Un accompagnement personnalisé pour atteindre vos objectifs." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="ctaText" render={({ field }) => (<FormItem><FormLabel>Texte du bouton principal</FormLabel><FormControl><Input placeholder="Prendre rendez-vous" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="ctaLink" render={({ field }) => (<FormItem><FormLabel>Lien du bouton principal</FormLabel><FormControl><Input placeholder="#contact" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="cta2Text" render={({ field }) => (<FormItem><FormLabel>Texte du bouton secondaire</FormLabel><FormControl><Input placeholder="Mon Espace" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="cta2Link" render={({ field }) => (<FormItem><FormLabel>Lien du bouton secondaire</FormLabel><FormControl><Input placeholder="/application" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                        <h4 className="text-sm font-medium">Options d'affichage</h4>
                        <FormField control={form.control} name="showPhoto" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><FormLabel>Afficher ma photo de profil</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                        <FormField control={form.control} name="showPhone" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><FormLabel>Afficher mon numéro de téléphone</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                        <FormField control={form.control} name="showLocation" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><FormLabel>Afficher ma ville</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
                    </div>

                    <div className="space-y-6 rounded-lg border p-4">
                        <h4 className="text-sm font-medium">Arrière-plan</h4>
                         <div className="flex items-center gap-4">
                            <div className="w-32 h-20 flex items-center justify-center rounded-md border bg-muted relative overflow-hidden">
                                {bgImagePreview ? (<Image src={bgImagePreview} alt="Aperçu" layout="fill" objectFit="cover" />) : (<span className="text-xs text-muted-foreground p-2 text-center">Aucune image</span>)}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                            <div className="flex flex-col gap-2">
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Changer l'image</Button>
                                {bgImagePreview && (<Button type="button" variant="destructive" size="sm" onClick={handleRemovePhoto}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>)}
                            </div>
                        </div>
                        <FormField control={form.control} name="bgColor" render={({ field }) => (<FormItem><FormLabel>Couleur de fond (si pas d'image)</FormLabel><div className="flex items-center gap-2"><Input type="color" {...field} className="w-10 h-10 p-1" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                    </div>
                     <div className="space-y-6 rounded-lg border p-4">
                        <h4 className="text-sm font-medium">Couleurs du texte</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="titleColor" render={({ field }) => (<FormItem><FormLabel>Couleur du titre</FormLabel><div className="flex items-center gap-2"><Input type="color" {...field} className="w-10 h-10 p-1" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="subtitleColor" render={({ field }) => (<FormItem><FormLabel>Couleur du sous-titre</FormLabel><div className="flex items-center gap-2"><Input type="color" {...field} className="w-10 h-10 p-1" /><FormControl><Input {...field} /></FormControl></div><FormMessage /></FormItem>)}/>
                        </div>
                    </div>
                </CardContent>
            </Card>

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

