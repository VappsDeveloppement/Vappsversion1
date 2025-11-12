
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Building, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/shared/logo';
import { setDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useFirebase } from '@/firebase';

const onboardingSchema = z.object({
  agencyName: z.string().min(2, "Le nom de l'agence est requis."),
  adminFirstName: z.string().min(1, "Le prénom est requis."),
  adminLastName: z.string().min(1, "Le nom est requis."),
  adminEmail: z.string().email("L'adresse email n'est pas valide."),
  adminPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { auth, firestore } = useFirebase();

    const form = useForm<OnboardingValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            agencyName: '',
            adminFirstName: '',
            adminLastName: '',
            adminEmail: '',
            adminPassword: '',
        },
    });

    async function onSubmit(data: OnboardingValues) {
        setIsLoading(true);
        try {
            // 1. Create the Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, data.adminEmail, data.adminPassword);
            const user = userCredential.user;

            const agencyId = 'vapps-agency';

            // 2. Create the Agency document
            const agencyRef = doc(firestore, 'agencies', agencyId);
            await setDoc(agencyRef, {
                id: agencyId,
                name: data.agencyName,
                // Personalization will be set to default by the provider later
            });

            // 3. Create the User document
            const userRef = doc(firestore, 'users', user.uid);
            await setDoc(userRef, {
                id: user.uid,
                firstName: data.adminFirstName,
                lastName: data.adminLastName,
                email: data.adminEmail,
                role: 'superadmin',
                agencyId: agencyId,
                dateJoined: new Date().toISOString(),
            });

            toast({
                title: "Installation terminée !",
                description: "Votre plateforme est prête. Vous allez être redirigé.",
            });

            router.push('/dashboard');

        } catch (error: any) {
            console.error("Onboarding Error:", error);
            let errorMessage = "Une erreur inconnue est survenue.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Cette adresse email est déjà utilisée.";
            }
            toast({
                variant: 'destructive',
                title: "Erreur d'installation",
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
            <div className='mb-8'>
                <Logo />
            </div>
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Installation de la Plateforme</CardTitle>
                    <CardDescription>
                        Créez votre agence principale et votre compte administrateur pour commencer.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="space-y-4 p-4 border rounded-md">
                                <h3 className="text-lg font-medium flex items-center gap-2"><Building className='w-5 h-5'/> Informations de l'Agence</h3>
                                <FormField
                                    control={form.control}
                                    name="agencyName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nom de l'agence</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Mon Agence Inc." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                             <div className="space-y-4 p-4 border rounded-md">
                                <h3 className="text-lg font-medium flex items-center gap-2"><User className='w-5 h-5'/> Compte Super-Administrateur</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField
                                        control={form.control}
                                        name="adminFirstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Prénom</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Jean" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="adminLastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nom</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Dupont" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="adminEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="admin@monagence.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="adminPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mot de passe</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                     <Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} />
                                                     <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                             </div>
                            
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    "Lancer l'installation"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
