

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Upload, Trash2, Info } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const profileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  publicTitle: z.string().optional(),
  publicBio: z.string().optional(),
  publicProfileName: z.string().optional(),
  photoUrl: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  commercialName: z.string().optional(),
  siret: z.string().optional(),
  dashboardTheme: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    bgColor: z.string().optional(),
  }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  publicTitle?: string;
  publicBio?: string;
  publicProfileName?: string;
  photoUrl?: string;
  phone?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  commercialName?: string;
  siret?: string;
  dashboardTheme?: {
    primaryColor?: string;
    secondaryColor?: string;
    bgColor?: string;
  };
};

// Helper to convert file to Base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});


export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserProfile>(userDocRef);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      publicTitle: '',
      publicBio: '',
      publicProfileName: '',
      photoUrl: '',
      phone: '',
      address: '',
      zipCode: '',
      city: '',
      commercialName: '',
      siret: '',
      dashboardTheme: {
        primaryColor: '#10B981',
        secondaryColor: '#059669',
        bgColor: '#f1f5f9',
      },
    },
  });
  
  useEffect(() => {
    if (userData) {
      form.reset({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        publicTitle: userData.publicTitle || '',
        publicBio: userData.publicBio || '',
        publicProfileName: userData.publicProfileName || '',
        photoUrl: userData.photoUrl || '',
        phone: userData.phone || '',
        address: userData.address || '',
        zipCode: userData.zipCode || '',
        city: userData.city || '',
        commercialName: userData.commercialName || '',
        siret: userData.siret || '',
        dashboardTheme: {
          primaryColor: userData.dashboardTheme?.primaryColor || '#10B981',
          secondaryColor: userData.dashboardTheme?.secondaryColor || '#059669',
          bgColor: userData.dashboardTheme?.bgColor || '#f1f5f9',
        },
      });
      setPhotoPreview(userData.photoUrl || null);
    }
  }, [userData, form]);
  
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD") // split an accented letter in the base letter and the accent
      .replace(/[\u0300-\u036f]/g, "") // remove all previously split accents
      .replace(/\s+/g, '-') // replace spaces with -
      .replace(/[^\w-]+/g, '') // remove all non-word chars
      .replace(/--+/g, '-'); // replace multiple - with single -
  }

  const handleNameBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const nameValue = event.target.value;
    if (nameValue && !form.getValues('publicProfileName')) {
        form.setValue('publicProfileName', generateSlug(nameValue));
    }
  };


  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !userDocRef) return;

    // Auto-generate slug from first and last name if empty
    const finalData = { ...data };
    if (!finalData.publicProfileName && finalData.firstName && finalData.lastName) {
        finalData.publicProfileName = generateSlug(`${finalData.firstName} ${finalData.lastName}`);
    }

    setIsSubmitting(true);
    try {
      await setDocumentNonBlocking(userDocRef, finalData, { merge: true });
      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations personnelles ont été sauvegardées.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la mise à jour de votre profil.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const base64 = await toBase64(file);
      setPhotoPreview(base64);
      form.setValue('photoUrl', base64);
    }
  };
  
  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    form.setValue('photoUrl', '');
  };

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32 ml-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Mes infos & coordonnées</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et votre profil public.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Informations Personnelles & Publiques</CardTitle>
              <CardDescription>
                Ces informations sont utilisées pour votre compte et votre page de conseiller.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input {...field} onBlur={handleNameBlur} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input {...field} onBlur={handleNameBlur} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
               <div>
                  <Label>Photo de profil</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={photoPreview || undefined} alt="Aperçu de la photo" />
                      <AvatarFallback className="text-2xl">
                         {userData?.firstName?.charAt(0)}{userData?.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                    <div className="flex flex-col gap-2">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            Changer la photo
                        </Button>
                        {photoPreview && (
                            <Button type="button" variant="destructive" size="sm" onClick={handleRemovePhoto}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                            </Button>
                        )}
                    </div>
                  </div>
               </div>

              <FormField
                control={form.control}
                name="publicTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre Professionnel (public)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Conseiller en évolution professionnelle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="publicProfileName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de profil public (pour l'URL)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: jean-dupont" {...field} />
                    </FormControl>
                     <FormMessage />
                     <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>URL de votre page publique</AlertTitle>
                        <AlertDescription>
                          Ceci déterminera l'URL de votre mini-site: <code className="bg-muted px-1 rounded">votresite.com/{field.value || "..."}</code>.
                          Utilisez des minuscules, des chiffres et des tirets.
                        </AlertDescription>
                      </Alert>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publicBio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biographie Publique</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Parlez de votre parcours, de votre approche..."
                        rows={8}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <div className="border-t pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="commercialName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nom commercial (Optionnel)</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="siret"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>SIRET (Optionnel)</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code Postal</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ville</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personnalisation du Tableau de Bord</CardTitle>
              <CardDescription>
                Choisissez les couleurs de votre espace de travail personnel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="dashboardTheme.primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Couleur Primaire</FormLabel>
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
                    name="dashboardTheme.secondaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Couleur Secondaire</FormLabel>
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
                    name="dashboardTheme.bgColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Couleur de Fond</FormLabel>
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

    