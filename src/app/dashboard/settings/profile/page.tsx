
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
import { Loader2, Upload, Trash2 } from 'lucide-react';
import Image from 'next/image';

const profileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  publicTitle: z.string().optional(),
  publicBio: z.string().optional(),
  photoUrl: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  publicTitle?: string;
  publicBio?: string;
  photoUrl?: string;
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
      photoUrl: '',
    },
  });
  
  useEffect(() => {
    if (userData) {
      form.reset({
        firstName: userData.firstName,
        lastName: userData.lastName,
        publicTitle: userData.publicTitle || '',
        publicBio: userData.publicBio || '',
        photoUrl: userData.photoUrl || '',
      });
      setPhotoPreview(userData.photoUrl || null);
    }
  }, [userData, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !userDocRef) return;
    setIsSubmitting(true);
    try {
      await setDocumentNonBlocking(userDocRef, data, { merge: true });
      toast({
        title: 'Profil mis à jour',
        description: 'Votre profil public a été sauvegardé avec succès.',
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
        <h1 className="text-3xl font-bold font-headline">Mon Profil Public</h1>
        <p className="text-muted-foreground">
          Personnalisez les informations qui seront affichées sur votre page de conseiller.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informations Publiques</CardTitle>
          <CardDescription>
            Ces informations sont visibles par tous les visiteurs de votre page publique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
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
                    <FormLabel>Titre Professionnel</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Conseiller en évolution professionnelle" {...field} />
                    </FormControl>
                    <FormMessage />
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

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sauvegarder les modifications
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
