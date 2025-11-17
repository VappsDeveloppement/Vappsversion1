

'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Loader2, Palette, FileText, Text, Link as LinkIcon, Eye } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';


const heroSchema = z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    showPhoto: z.boolean().default(false),
});

type HeroFormData = z.infer<typeof heroSchema>;

const defaultMiniSiteConfig = {
    hero: {
        title: 'Donnez un nouvel élan à votre carrière',
        subtitle: 'Un accompagnement personnalisé pour atteindre vos objectifs.',
        ctaText: 'Prendre rendez-vous',
        ctaLink: '#contact',
        showPhoto: true,
    },
};

function HeroSettingsTab() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    
    const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

    const form = useForm<HeroFormData>({
        resolver: zodResolver(heroSchema),
        defaultValues: defaultMiniSiteConfig.hero
    });
    
    useEffect(() => {
        if (userData?.miniSite?.hero) {
            form.reset(userData.miniSite.hero);
        } else {
            form.reset(defaultMiniSiteConfig.hero);
        }
    }, [userData, form]);

    const onSubmit = async (data: HeroFormData) => {
        if (!userDocRef) return;
        setIsSubmitting(true);
        try {
            await setDocumentNonBlocking(userDocRef, {
                miniSite: {
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

    if (isUserLoading || isUserDataLoading) {
        return <p>Chargement...</p>;
    }

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
                        <FormField
                            control={form.control}
                            name="showPhoto"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Afficher ma photo de profil</FormLabel>
                                        <FormMessage />
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
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

export default function MiniSitePage() {
  const { user } = useUser();
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold font-headline">Mon Mini-site</h1>
            <p className="text-muted-foreground">
            Gérez l'apparence et le contenu de votre page publique de conseiller.
            </p>
        </div>
        {user && (
            <Button variant="outline" asChild>
                <Link href={`/c/${user.uid}`} target="_blank">
                    <Eye className="mr-2" />
                    Voir ma page publique
                </Link>
            </Button>
        )}
      </div>
      <Tabs defaultValue="hero-content">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hero-content">
            <Text className="mr-2 h-4 w-4" />
            Contenu Héro
          </TabsTrigger>
          <TabsTrigger value="visual-identity" disabled>
            <Palette className="mr-2 h-4 w-4" />
            Identité Visuelle
          </TabsTrigger>
          <TabsTrigger value="personal-page" disabled>
            <FileText className="mr-2 h-4 w-4" />
            Sections de la Page
          </TabsTrigger>
        </TabsList>
        <TabsContent value="hero-content">
          <HeroSettingsTab />
        </TabsContent>
        <TabsContent value="visual-identity">
          {/* Placeholder for future implementation */}
        </TabsContent>
        <TabsContent value="personal-page">
          {/* Placeholder for future implementation */}
        </TabsContent>
      </Tabs>
    </div>
  );
}

    