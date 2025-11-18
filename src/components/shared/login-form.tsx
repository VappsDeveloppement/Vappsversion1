
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { createUser } from '@/app/actions/user';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


const loginSchema = z.object({
    email: z.string().email({ message: "Veuillez saisir une adresse e-mail valide." }),
    password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
});

const registerSchema = z.object({
    firstName: z.string().min(1, { message: "Le prénom est requis." }),
    lastName: z.string().min(1, { message: "Le nom est requis." }),
    email: z.string().email({ message: "Veuillez saisir une adresse e-mail valide." }),
    password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
});

export function LoginForm() {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [isRegisterLoading, setIsRegisterLoading] = useState(false);
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const loginForm = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const registerForm = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: { firstName: "", lastName: "", email: "", password: "" },
    });

    async function onLogin(values: z.infer<typeof loginSchema>) {
        setIsLoginLoading(true);
        try {
            await signInWithEmailAndPassword(auth, values.email, values.password);
            router.push('/dashboard');
        } catch (error: any) {
            let errorMessage = "Une erreur est survenue lors de la connexion.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage = "L'adresse e-mail ou le mot de passe est incorrect.";
            }
            toast({ variant: "destructive", title: "Erreur de connexion", description: errorMessage });
        } finally {
            setIsLoginLoading(false);
        }
    }
    
    async function onRegister(values: z.infer<typeof registerSchema>) {
        setIsRegisterLoading(true);
        try {
            const result = await createUser({
                ...values,
                role: 'membre', // Default role, will be overridden to superadmin if first user
                creatorId: 'self-registered',
                creatorRole: 'prospect'
            });

            if (result.success) {
                toast({ title: "Compte créé !", description: "Vous pouvez maintenant vous connecter." });
                 // Auto-login the user after successful registration
                await signInWithEmailAndPassword(auth, values.email, values.password);
                router.push('/dashboard');
            } else {
                 throw new Error(result.error);
            }
        } catch (error: any) {
             const message = error.message.includes('auth/email-already-in-use') 
                ? "Cet email est déjà utilisé." 
                : error.message || "Une erreur est survenue lors de l'inscription.";
            toast({ variant: "destructive", title: "Erreur d'inscription", description: message });
        } finally {
            setIsRegisterLoading(false);
        }
    }

    return (
        <Card className="bg-gray-200/90 text-gray-800 border-none shadow-2xl backdrop-blur-sm max-w-md mx-auto w-full">
            <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Connexion</TabsTrigger>
                    <TabsTrigger value="register">Inscription</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
                        <CardDescription>Accédez à votre espace personnel.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...loginForm}>
                            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                                <FormField control={loginForm.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl><Input placeholder="votre@email.com" {...field} className="bg-white" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={loginForm.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mot de passe</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" {...field} className="bg-white pr-10" />
                                                <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7 text-gray-500 hover:bg-gray-200" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <Button type="submit" className="w-full font-bold text-lg h-12" disabled={isLoginLoading}>
                                    {isLoginLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Se connecter'}
                                </Button>
                                <div className="text-center">
                                    <Link href="#" className="text-sm text-gray-600 hover:underline">Mot de passe oublié?</Link>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </TabsContent>
                <TabsContent value="register">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
                        <CardDescription>Rejoignez la plateforme. Le premier compte créé sera un super administrateur.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...registerForm}>
                            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={registerForm.control} name="firstName" render={({ field }) => (
                                        <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="Jean" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={registerForm.control} name="lastName" render={({ field }) => (
                                        <FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="Dupont" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <FormField control={registerForm.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="votre@email.com" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={registerForm.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mot de passe</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} placeholder="6+ caractères" {...field} className="bg-white pr-10" />
                                                <Button type="button" variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7 text-gray-500 hover:bg-gray-200" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <Button type="submit" className="w-full font-bold text-lg h-12" disabled={isRegisterLoading}>
                                    {isRegisterLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'S\'inscrire'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </TabsContent>
            </Tabs>
        </Card>
    );
}
