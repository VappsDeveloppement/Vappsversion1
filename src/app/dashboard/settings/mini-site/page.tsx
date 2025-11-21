
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, Upload, Trash2, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CounselorHero } from '@/components/shared/counselor-hero';
import Image from 'next/image';
import { AttentionSection } from '@/components/shared/attention-section';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    showPhoto: z.boolean().default(false),
    bgColor: z.string().optional(),
    bgImageUrl: z.string().optional(),
    showPhone: z.boolean().default(false),
    showLocation: z.boolean().default(false),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
});

const attentionSchema = z.object({
    enabled: z.boolean().default(true),
    title: z.string().optional(),
    text: z.string().optional(),
});


const miniSiteSchema = z.object({
    hero: heroSchema,
    attentionSection: attentionSchema,
});

type MiniSiteFormData = z.infer<typeof miniSiteSchema>;


const defaultMiniSiteConfig: MiniSiteFormData = {
    hero: {
        title: 'Donnez un nouvel élan à votre carrière',
        subtitle: 'Un accompagnement personnalisé pour atteindre vos objectifs.',
        ctaText: 'Prendre rendez-vous',
        ctaLink: '#contact',
        showPhoto: true,
        bgColor: '#f1f5f9',
        bgImageUrl: '',
        showPhone: false,
        showLocation: false,
        primaryColor: '#10B981',
        secondaryColor: '#059669',
    },
    attentionSection: {
        enabled: true,
        title: "Section d'attention",
        text: "Mettez en avant un message important ici."
    }
};

function PreviewPanel({ formData, userData }: { formData: any, userData: any }) {
    const counselorPreviewData = {
        ...(userData || {}),
        miniSite: {
            ...userData?.miniSite,
            hero: formData.hero,
            attentionSection: formData.attentionSection,
        }
    };
    
    // Fallback to a default, just in case.
    const copyrightText = counselorPreviewData.agencyInfo?.copyrightText || "VApps.";
    const copyrightUrl = counselorPreviewData.agencyInfo?.copyrightUrl || "/";
    const footerBgColor = formData.hero?.bgColor || '#f1f5f9';
    const primaryColor = formData.hero?.primaryColor || '#10B981';

    return (
        <SheetContent className="w-full sm:max-w-full lg:w-[80vw] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Aperçu de la page</SheetTitle>
            <SheetDescription>
              Ceci est une prévisualisation de votre page publique. Les modifications apparaissent en temps réel.
            </SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100vh-80px)] overflow-y-auto bg-muted">
             <CounselorHero counselor={counselorPreviewData} />
             <AttentionSection counselor={counselorPreviewData} />
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'minisites', user.uid);
  }, [firestore, user]);
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const form = useForm<MiniSiteFormData>({
    resolver: zodResolver(miniSiteSchema),
    defaultValues: defaultMiniSiteConfig,
  });

  const { watch } = form;
  const watchedFormData = watch();
  
  useEffect(() => {
    if (userData?.miniSite) {
        form.reset({
            hero: { ...defaultMiniSiteConfig.hero, ...(userData.miniSite.hero || {}) },
            attentionSection: { ...defaultMiniSiteConfig.attentionSection, ...(userData.miniSite.attentionSection || {}) },
        });
    }
  }, [userData, form]);

  const [bgImagePreview, setBgImagePreview] = useState(form.getValues('hero.bgImageUrl'));

    useEffect(() => {
        setBgImagePreview(form.watch('hero.bgImageUrl'));
    }, [form.watch('hero.bgImageUrl')]);
    
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const base64 = await toBase64(file);
          setBgImagePreview(base64);
          form.setValue('hero.bgImageUrl', base64);
      }
  };

  const onSubmit = async (data: MiniSiteFormData) => {
    if (!userDocRef) return;
    setIsSubmitting(true);
    try {
        await setDocumentNonBlocking(userDocRef, {
            miniSite: {
                ...(userData?.miniSite || {}),
                hero: data.hero,
                attentionSection: data.attentionSection,
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
            Gérez l'apparence de votre page publique de conseiller.
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
            <Accordion type="single" collapsible defaultValue="hero-section" className="w-full space-y-4">
              <AccordionItem value="hero-section" className='border rounded-lg overflow-hidden'>
                <AccordionTrigger className='bg-muted/50 px-6 py-4 font-semibold text-lg'>Section Héro</AccordionTrigger>
                <AccordionContent>
                  <div className="p-6 space-y-6">
                    <FormField
                        control={form.control}
                        name="hero.title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Titre principal</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Votre titre accrocheur..." />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="hero.subtitle"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sous-titre</FormLabel>
                                <FormControl>
                                    <Textarea {...field} placeholder="Décrivez votre offre en une phrase..." />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                            control={form.control}
                            name="hero.ctaText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Texte du bouton d'action</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Prendre RDV" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="hero.ctaLink"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lien du bouton d'action</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="#contact ou https://..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                        <h4 className="font-medium">Options d'affichage</h4>
                        <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="hero.showPhoto"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Afficher ma photo de profil</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                            <FormField
                            control={form.control}
                            name="hero.showPhone"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Afficher mon numéro de téléphone</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                            <FormField
                            control={form.control}
                            name="hero.showLocation"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Afficher ma localité</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        </div>
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                        <h4 className="font-medium">Arrière-plan</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="hero.bgColor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Couleur de fond</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input type="color" {...field} className="p-1 h-10 w-10" />
                                                <Input type="text" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div>
                                <FormLabel>Image de fond</FormLabel>
                                <div className="mt-2 flex items-center gap-4">
                                        <div className="w-24 h-16 rounded border bg-muted flex items-center justify-center">
                                        {bgImagePreview ? <Image src={bgImagePreview} alt="Aperçu" width={96} height={64} className="object-cover h-full w-full rounded" /> : <span className="text-xs text-muted-foreground">Aucune</span>}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                    <div className="flex flex-col gap-1">
                                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Uploader</Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => { setBgImagePreview(''); form.setValue('hero.bgImageUrl', '');}}><Trash2 className="mr-2 h-4 w-4" /> Retirer</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4 rounded-lg border p-4">
                        <h4 className="font-medium">Couleurs dominantes</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="hero.primaryColor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Couleur primaire</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input type="color" {...field} className="p-1 h-10 w-10" />
                                                <Input type="text" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="hero.secondaryColor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Couleur secondaire</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input type="color" {...field} className="p-1 h-10 w-10" />
                                                <Input type="text" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="attention-section" className='border rounded-lg overflow-hidden'>
                  <AccordionTrigger className='bg-muted/50 px-6 py-4 font-semibold text-lg'>Section "Attention"</AccordionTrigger>
                  <AccordionContent>
                      <div className="p-6 space-y-6">
                           <FormField
                            control={form.control}
                            name="attentionSection.enabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Activer la section</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="attentionSection.title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Titre</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Titre de la section..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="attentionSection.text"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Texte</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} placeholder="Votre message important..." rows={5}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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

    