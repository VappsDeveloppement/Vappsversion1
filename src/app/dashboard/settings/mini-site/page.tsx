

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Palette, FileText, Text, Eye, Upload, Trash2, Info, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CounselorHero } from '@/components/shared/counselor-hero';
import Image from 'next/image';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { AboutMeSection } from '@/components/shared/about-me-section';
import { AttentionSection } from '@/components/shared/attention-section';
import { InterestsSection } from '@/components/shared/interests-section';
import { CounselorServicesSection } from '@/components/shared/counselor-services-section';

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

const aboutSchema = z.object({
    enabled: z.boolean().default(true),
    imageUrl: z.string().optional(),
    videoUrl: z.string().optional(),
    mediaText: z.string().optional(),
    title: z.string().optional(),
    text: z.string().optional(),
});

const interestsSchema = z.object({
    enabled: z.boolean().default(true),
    title: z.string().optional(),
    features: z.array(z.object({ value: z.string() })).default([]),
});

const serviceItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Le titre est requis."),
  description: z.string().min(1, "La description est requise."),
  imageUrl: z.string().nullable().optional(),
});

const servicesSchema = z.object({
    enabled: z.boolean().default(true),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    services: z.array(serviceItemSchema).max(3, "Vous pouvez ajouter 3 services au maximum.").default([]),
});

const miniSiteSchema = z.object({
    hero: heroSchema,
    attentionSection: attentionSchema,
    aboutSection: aboutSchema,
    interestsSection: interestsSchema,
    servicesSection: servicesSchema,
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
        title: 'Attention',
        text: 'Ce conseiller n\'a pas encore rédigé de biographie.'
    },
    aboutSection: {
        enabled: true,
        imageUrl: '',
        videoUrl: '',
        mediaText: '',
        title: 'À propos de moi',
        text: '',
    },
    interestsSection: {
        enabled: true,
        title: 'Mes centres d\'intérêt',
        features: [{ value: 'Coaching individuel' }, { value: 'Bilan de compétences' }, { value: 'Reconversion professionnelle' }]
    },
    servicesSection: {
        enabled: true,
        title: 'Mes Services',
        subtitle: 'Découvrez comment je peux vous accompagner',
        services: [
            { id: 'service-1', title: 'Service 1', description: 'Description de mon premier service.', imageUrl: null },
            { id: 'service-2', title: 'Service 2', description: 'Description de mon deuxième service.', imageUrl: null },
            { id: 'service-3', title: 'Service 3', description: 'Description de mon troisième service.', imageUrl: null },
        ]
    }
};

function HeroSettingsTab({ control, userData }: { control: any, userData: any }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    
    const form = useForm<z.infer<typeof heroSchema>>({
        resolver: zodResolver(heroSchema),
        defaultValues: defaultMiniSiteConfig.hero,
        control
    });

    const [bgImagePreview, setBgImagePreview] = useState(form.getValues('bgImageUrl'));

    useEffect(() => {
        setBgImagePreview(form.getValues('bgImageUrl'));
    }, [form.getValues('bgImageUrl')]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            setBgImagePreview(base64);
            form.setValue('bgImageUrl', base64);
        }
    };
    
    const onSubmit = async (data: z.infer<typeof heroSchema>) => {
        if (!userDocRef) return;
        setIsSubmitting(true);
        try {
            await setDocumentNonBlocking(userDocRef, {
                miniSite: {
                    ...(userData?.miniSite || {}),
                    hero: data,
                },
            }, { merge: true });
            toast({ title: "Paramètres enregistrés", description: "Votre section Héro a été mise à jour." });
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de sauvegarder les paramètres.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Section Héro</CardTitle>
                <CardDescription>
                    Personnalisez le premier élément que vos visiteurs voient sur votre page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="title"
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
                            name="subtitle"
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
                                name="ctaText"
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
                                name="ctaLink"
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
                                    name="showPhoto"
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
                                    name="showPhone"
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
                                    name="showLocation"
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
                                    name="bgColor"
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
                                            <Button type="button" variant="ghost" size="sm" onClick={() => { setBgImagePreview(''); form.setValue('bgImageUrl', '');}}><Trash2 className="mr-2 h-4 w-4" /> Retirer</Button>
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
                                    name="primaryColor"
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
                                    name="secondaryColor"
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

                        <div className="flex justify-end pt-6 border-t">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enregistrer les modifications
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function SectionsSettingsTab({ control, userData }: { control: any, userData: any }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const aboutImageRef = useRef<HTMLInputElement>(null);
    const serviceImageRefs = useRef<(HTMLInputElement | null)[]>([]);

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const form = useForm<{ attentionSection: z.infer<typeof attentionSchema>, aboutSection: z.infer<typeof aboutSchema>, interestsSection: z.infer<typeof interestsSchema>, servicesSection: z.infer<typeof servicesSchema> }>({
        resolver: zodResolver(z.object({ attentionSection: attentionSchema, aboutSection: aboutSchema, interestsSection: interestsSchema, servicesSection: servicesSchema })),
        defaultValues: {
            attentionSection: defaultMiniSiteConfig.attentionSection,
            aboutSection: defaultMiniSiteConfig.aboutSection,
            interestsSection: defaultMiniSiteConfig.interestsSection,
            servicesSection: defaultMiniSiteConfig.servicesSection,
        },
        control,
    });
    
    const { fields: interestFields, append: appendInterest, remove: removeInterest } = useFieldArray({
        control: form.control,
        name: "interestsSection.features",
    });

    const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
        control: form.control,
        name: "servicesSection.services",
    });

    const [aboutImagePreview, setAboutImagePreview] = useState(form.getValues('aboutSection.imageUrl'));
    const watchedServices = useWatch({ control: form.control, name: "servicesSection.services" });


    useEffect(() => {
        setAboutImagePreview(form.getValues('aboutSection.imageUrl'));
    }, [form.getValues('aboutSection.imageUrl')]);

    const onSubmit = async (data: any) => {
        if (!userDocRef) return;
        setIsSubmitting(true);
        try {
            const interestsData = {
                ...data.interestsSection,
                features: data.interestsSection.features.map((f: {value: string}) => f.value),
            };

            await setDocumentNonBlocking(userDocRef, {
                miniSite: {
                    ...(userData?.miniSite || {}),
                    attentionSection: data.attentionSection,
                    aboutSection: data.aboutSection,
                    interestsSection: interestsData,
                    servicesSection: data.servicesSection,
                },
            }, { merge: true });
            toast({ title: "Paramètres enregistrés", description: "Vos sections ont été mises à jour." });
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de sauvegarder les paramètres.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                 <Accordion type="multiple" defaultValue={['attention', 'about', 'interests', 'services']} className="w-full space-y-4">
                    <AccordionItem value="attention" className="border rounded-lg bg-background">
                         <AccordionTrigger className="p-4 font-medium hover:no-underline">Section "Attention"</AccordionTrigger>
                         <AccordionContent className="p-4 border-t">
                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="attentionSection.enabled"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Afficher la section</FormLabel>
                                                <FormDescription>Désactivez pour masquer cette section de votre page.</FormDescription>
                                            </div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="attentionSection.title" render={({ field }) => (
                                    <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="attentionSection.text" render={({ field }) => (
                                    <FormItem><FormLabel>Texte</FormLabel><FormControl><Textarea {...field} rows={5}/></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="about" className="border rounded-lg bg-background">
                        <AccordionTrigger className="p-4 font-medium hover:no-underline">Section "À Propos"</AccordionTrigger>
                        <AccordionContent className="p-4 border-t">
                             <div className="space-y-6">
                                <FormField control={form.control} name="aboutSection.enabled" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5"><FormLabel className="text-base">Afficher la section</FormLabel><FormDescription>Désactivez pour masquer cette section.</FormDescription></div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-center">Colonne de gauche (Média)</h4>
                                        <FormField control={form.control} name="aboutSection.videoUrl" render={({ field }) => (
                                            <FormItem><FormLabel>URL Vidéo (YouTube)</FormLabel><FormControl><Input {...field} placeholder="https://youtube.com/embed/..."/></FormControl><FormMessage /><FormDescription>Prioritaire sur l'image si renseigné.</FormDescription></FormItem>
                                        )}/>
                                        <div className="flex items-center"><div className="flex-grow border-t"></div><span className="flex-shrink mx-4 text-muted-foreground text-sm">OU</span><div className="flex-grow border-t"></div></div>
                                        <div>
                                            <Label>Image</Label>
                                            <div className="mt-2 flex items-center gap-4">
                                                <div className="w-24 h-16 rounded border bg-muted flex items-center justify-center">
                                                    {aboutImagePreview ? <Image src={aboutImagePreview} alt="Aperçu" width={96} height={64} className="object-cover h-full w-full rounded" /> : <span className="text-xs text-muted-foreground">Aucune</span>}
                                                </div>
                                                <input type="file" ref={aboutImageRef} onChange={async (e) => {const f=e.target.files?.[0]; if(f) {const b=await toBase64(f); setAboutImagePreview(b); form.setValue('aboutSection.imageUrl', b)}}} className="hidden" accept="image/*" />
                                                <div className="flex flex-col gap-1">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => aboutImageRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Uploader</Button>
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => { setAboutImagePreview(''); form.setValue('aboutSection.imageUrl', '');}}><Trash2 className="mr-2 h-4 w-4" /> Retirer</Button>
                                                </div>
                                            </div>
                                        </div>
                                        <FormField control={form.control} name="aboutSection.mediaText" render={({ field }) => (
                                            <FormItem><FormLabel>Texte sous le média</FormLabel><FormControl><Textarea {...field} rows={3}/></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-center">Colonne de droite (Texte)</h4>
                                        <FormField control={form.control} name="aboutSection.title" render={({ field }) => (
                                            <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="aboutSection.text" render={({ field }) => (
                                            <FormItem><FormLabel>Texte</FormLabel><FormControl><Textarea {...field} rows={8}/></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                     <AccordionItem value="interests" className="border rounded-lg bg-background">
                        <AccordionTrigger className="p-4 font-medium hover:no-underline">Section "Intérêt"</AccordionTrigger>
                        <AccordionContent className="p-4 border-t">
                            <div className="space-y-6">
                                <FormField control={form.control} name="interestsSection.enabled" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5"><FormLabel className="text-base">Afficher la section</FormLabel><FormDescription>Désactivez pour masquer cette section.</FormDescription></div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="interestsSection.title" render={({ field }) => (
                                    <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div>
                                    <Label>Caractéristiques</Label>
                                    <div className="space-y-2 mt-2">
                                        {interestFields.map((field, index) => (
                                            <div key={field.id} className="flex items-center gap-2">
                                                <FormField control={form.control} name={`interestsSection.features.${index}.value`} render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl><Input {...field} placeholder="Caractéristique..." /></FormControl>
                                                    </FormItem>
                                                )}/>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeInterest(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendInterest({ value: '' })} className="mt-2">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une caractéristique
                                    </Button>
                                </div>
                            </div>
                        </AccordionContent>
                     </AccordionItem>
                      <AccordionItem value="services" className="border rounded-lg bg-background">
                        <AccordionTrigger className="p-4 font-medium hover:no-underline">Section "Services"</AccordionTrigger>
                        <AccordionContent className="p-4 border-t">
                             <div className="space-y-6">
                                <FormField control={form.control} name="servicesSection.enabled" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5"><FormLabel className="text-base">Afficher la section</FormLabel><FormDescription>Désactivez pour masquer cette section.</FormDescription></div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="servicesSection.title" render={({ field }) => (
                                    <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="servicesSection.subtitle" render={({ field }) => (
                                    <FormItem><FormLabel>Sous-titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div>
                                    <Label>Cartes de service</Label>
                                    <div className="space-y-4 mt-2">
                                        {serviceFields.map((field, index) => (
                                            <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-medium">Service {index + 1}</h4>
                                                </div>
                                                <FormField control={form.control} name={`servicesSection.services.${index}.title`} render={({ field }) => (
                                                    <FormItem><FormLabel>Titre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                                )}/>
                                                <FormField control={form.control} name={`servicesSection.services.${index}.description`} render={({ field }) => (
                                                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={2}/></FormControl><FormMessage /></FormItem>
                                                )}/>
                                                <div>
                                                    <Label>Image</Label>
                                                    <div className="mt-2 flex items-center gap-4">
                                                        <div className="w-24 h-16 rounded border bg-muted flex items-center justify-center">
                                                            {watchedServices?.[index]?.imageUrl && <Image src={watchedServices[index].imageUrl!} alt="Aperçu" width={96} height={64} className="object-cover h-full w-full rounded" />}
                                                        </div>
                                                        <input type="file" ref={el => serviceImageRefs.current[index] = el} onChange={async (e) => {const f=e.target.files?.[0]; if(f) {const b=await toBase64(f); form.setValue(`servicesSection.services.${index}.imageUrl`, b)}}} className="hidden" accept="image/*" />
                                                        <div className="flex flex-col gap-1">
                                                            <Button type="button" variant="outline" size="sm" onClick={() => serviceImageRefs.current[index]?.click()}><Upload className="mr-2 h-4 w-4" /> Uploader</Button>
                                                            <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue(`servicesSection.services.${index}.imageUrl`, null)}><Trash2 className="mr-2 h-4 w-4" /> Retirer</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <div className="flex justify-end pt-6 border-t">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer les modifications
                    </Button>
                </div>
            </form>
        </Form>
    )
}

function PreviewPanel({ formData, userData }: { formData: any, userData: any }) {
    const counselorPreviewData = {
        ...(userData || {}),
        miniSite: {
            ...userData?.miniSite,
            hero: formData.hero,
            attentionSection: formData.attentionSection,
            aboutSection: formData.aboutSection,
            interestsSection: {
                ...formData.interestsSection,
                features: formData.interestsSection.features.map((f: {value: string}) => f.value),
            },
            servicesSection: formData.servicesSection,
        }
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
             <CounselorHero counselor={counselorPreviewData} />
             {counselorPreviewData.miniSite.attentionSection?.enabled && <AttentionSection counselor={counselorPreviewData} />}
             {counselorPreviewData.miniSite.aboutSection?.enabled && <AboutMeSection counselor={counselorPreviewData} />}
             {counselorPreviewData.miniSite.interestsSection?.enabled && <InterestsSection counselor={counselorPreviewData} />}
             {counselorPreviewData.miniSite.servicesSection?.enabled && <CounselorServicesSection counselor={counselorPreviewData} />}
          </div>
        </SheetContent>
    )
}

export default function MiniSitePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const form = useForm<MiniSiteFormData>({
    resolver: zodResolver(miniSiteSchema),
    defaultValues: defaultMiniSiteConfig,
  });
  
  useEffect(() => {
    if (userData?.miniSite) {
        const interestsFeatures = (userData.miniSite.interestsSection?.features || defaultMiniSiteConfig.interestsSection.features).map((f: any) => typeof f === 'string' ? {value: f} : f);
        const servicesData = (userData.miniSite.servicesSection?.services || defaultMiniSiteConfig.servicesSection.services).map((s: any) => ({ ...s, imageUrl: s.imageUrl || null }));

        form.reset({
            hero: { ...defaultMiniSiteConfig.hero, ...(userData.miniSite.hero || {}) },
            attentionSection: { ...defaultMiniSiteConfig.attentionSection, ...(userData.miniSite.attentionSection || {}) },
            aboutSection: { ...defaultMiniSiteConfig.aboutSection, ...(userData.miniSite.aboutSection || {}) },
            interestsSection: {
              ...defaultMiniSiteConfig.interestsSection,
              ...(userData.miniSite.interestsSection || {}),
              features: interestsFeatures
            },
            servicesSection: {
              ...defaultMiniSiteConfig.servicesSection,
              ...(userData.miniSite.servicesSection || {}),
              services: servicesData,
            }
        });
    } else {
        form.reset(defaultMiniSiteConfig);
    }
  }, [userData, form]);
  
  const watchedFormData = useWatch({ control: form.control });

  if (isUserLoading || isUserDataLoading) {
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
            {user && (
                <Button asChild>
                    <Link href={`/c/${user.uid}`} target="_blank">
                        Ouvrir la page publique
                    </Link>
                </Button>
            )}
        </div>
      </div>
      <Tabs defaultValue="hero-content">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hero-content">
            <Text className="mr-2 h-4 w-4" />
            Contenu Héro
          </TabsTrigger>
          <TabsTrigger value="personal-page">
            <FileText className="mr-2 h-4 w-4" />
            Sections de la Page
          </TabsTrigger>
        </TabsList>
        <TabsContent value="hero-content">
          <HeroSettingsTab control={form.control} userData={userData} />
        </TabsContent>
        <TabsContent value="personal-page">
          <SectionsSettingsTab control={form.control} userData={userData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
