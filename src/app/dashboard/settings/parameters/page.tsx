
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Eye, EyeOff, Info, Mail } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { sendTestEmail } from '@/app/actions/email';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const paymentSettingsSchema = z.object({
    ribIban: z.string().optional(),
    ribBic: z.string().optional(),
    paypalClientId: z.string().optional(),
    paypalClientSecret: z.string().optional(),
    paypalMeLink: z.string().optional(),
});

const emailSettingsSchema = z.object({
    smtpHost: z.string().optional(),
    smtpPort: z.number().optional(),
    smtpUser: z.string().optional(),
    smtpPass: z.string().optional(),
    smtpSecure: z.boolean().optional(),
    fromEmail: z.string().email({ message: "Email invalide" }).optional().or(z.literal('')),
    fromName: z.string().optional(),
});

const parametersSchema = z.object({
  paymentSettings: paymentSettingsSchema.optional(),
  emailSettings: emailSettingsSchema.optional(),
});

type ParametersFormData = z.infer<typeof parametersSchema>;

type UserProfile = {
    role: 'conseiller' | 'superadmin' | 'membre';
    paymentSettings?: ParametersFormData['paymentSettings'];
    emailSettings?: ParametersFormData['emailSettings'];
};

export default function CounselorParametersPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSmtpPass, setShowSmtpPass] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [isTestingEmail, setIsTestingEmail] = useState(false);

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userData, isLoading: isUserDataLoading } = useDoc<UserProfile>(userDocRef);

    const form = useForm<ParametersFormData>({
        resolver: zodResolver(parametersSchema),
        defaultValues: {
            paymentSettings: {
                ribIban: '',
                ribBic: '',
                paypalClientId: '',
                paypalClientSecret: '',
                paypalMeLink: '',
            },
            emailSettings: {
                smtpHost: '',
                smtpPort: 587,
                smtpUser: '',
                smtpPass: '',
                smtpSecure: true,
                fromEmail: '',
                fromName: '',
            },
        },
    });

    useEffect(() => {
        if (userData) {
            form.reset({
                paymentSettings: {
                    ribIban: userData.paymentSettings?.ribIban || '',
                    ribBic: userData.paymentSettings?.ribBic || '',
                    paypalClientId: userData.paymentSettings?.paypalClientId || '',
                    paypalClientSecret: userData.paymentSettings?.paypalClientSecret || '',
                    paypalMeLink: userData.paymentSettings?.paypalMeLink || '',
                },
                emailSettings: {
                    smtpHost: userData.emailSettings?.smtpHost || '',
                    smtpPort: userData.emailSettings?.smtpPort || 587,
                    smtpUser: userData.emailSettings?.smtpUser || '',
                    smtpPass: userData.emailSettings?.smtpPass || '',
                    smtpSecure: userData.emailSettings?.smtpSecure === undefined ? true : userData.emailSettings.smtpSecure,
                    fromEmail: userData.emailSettings?.fromEmail || '',
                    fromName: userData.emailSettings?.fromName || '',
                },
            });
        }
    }, [userData, form]);

    const onSubmit = async (data: ParametersFormData) => {
        if (!user || !userDocRef) return;
        setIsSubmitting(true);

        try {
            await setDocumentNonBlocking(userDocRef, {
                paymentSettings: data.paymentSettings,
                emailSettings: data.emailSettings,
            }, { merge: true });

            toast({
                title: 'Paramètres mis à jour',
                description: 'Vos paramètres de paiement et d\'e-mail ont été sauvegardés.',
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
    
    const handleTestEmail = async () => {
        if (!testEmail) {
            toast({ title: "Erreur", description: "Veuillez saisir une adresse e-mail de destination.", variant: "destructive"});
            return;
        }
        
        const currentEmailSettings = form.getValues('emailSettings');
        if (!currentEmailSettings?.smtpHost || !currentEmailSettings?.smtpUser || !currentEmailSettings?.smtpPass) {
             toast({ title: "Configuration incomplète", description: "Veuillez remplir tous les champs SMTP requis.", variant: "destructive"});
            return;
        }

        setIsTestingEmail(true);
        const result = await sendTestEmail({ settings: currentEmailSettings as any, recipient: testEmail });
        setIsTestingEmail(false);

        if (result.success) {
            toast({ title: "Succès", description: "E-mail de test envoyé avec succès à " + testEmail });
        } else {
            toast({ title: "Échec de l'envoi", description: result.error, variant: "destructive" });
        }
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
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (userData?.role !== 'conseiller' && userData?.role !== 'superadmin') {
     return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Mes Paramètres</h1>
                <p className="text-muted-foreground">
                    Gérez vos propres paramètres de paiement et d'envoi d'e-mails.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Fonctionnalité non disponible</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">La gestion des paramètres est réservée aux conseillers et super administrateurs.</p>
                </CardContent>
            </Card>
        </div>
     )
    }
    
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Mes Paramètres</h1>
                <p className="text-muted-foreground">
                    Gérez vos propres paramètres de paiement et d'envoi d'e-mails.
                </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Tabs defaultValue="payment">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="payment">Paramètres de Paiement</TabsTrigger>
                            <TabsTrigger value="email">Paramètres d'E-mail</TabsTrigger>
                        </TabsList>
                        <TabsContent value="payment">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Moyens de Paiement</CardTitle>
                                    <CardDescription>Configurez les moyens de paiement que vous acceptez. Ces informations seront utilisées pour générer vos factures.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <section>
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Virement Bancaire (RIB)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField control={form.control} name="paymentSettings.ribIban" render={({ field }) => (<FormItem><FormLabel>IBAN</FormLabel><FormControl><Input placeholder="FR76..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="paymentSettings.ribBic" render={({ field }) => (<FormItem><FormLabel>BIC / SWIFT</FormLabel><FormControl><Input placeholder="AGRIFRPP888" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">PayPal</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField control={form.control} name="paymentSettings.paypalClientId" render={({ field }) => (<FormItem><FormLabel>Client ID PayPal</FormLabel><FormControl><Input placeholder="Votre Client ID" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="paymentSettings.paypalClientSecret" render={({ field }) => (<FormItem><FormLabel>Client Secret PayPal</FormLabel><FormControl><Input type="password" placeholder="Votre Client Secret" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="paymentSettings.paypalMeLink" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Lien PayPal.Me</FormLabel><FormControl><Input placeholder="https://paypal.me/votrecompte" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </section>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="email">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Paramètres d'E-mail (SMTP)</CardTitle>
                                    <CardDescription>Configurez votre propre serveur SMTP pour l'envoi des devis et factures.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                     <section>
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Expéditeur</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField control={form.control} name="emailSettings.fromName" render={({ field }) => (<FormItem><FormLabel>Nom de l'expéditeur</FormLabel><FormControl><Input placeholder="Jean Dupont" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="emailSettings.fromEmail" render={({ field }) => (<FormItem><FormLabel>E-mail de l'expéditeur</FormLabel><FormControl><Input type="email" placeholder="contact@mondomaine.com" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </section>
                                    <section>
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Serveur SMTP</h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2 md:col-span-2">
                                                    <FormField control={form.control} name="emailSettings.smtpHost" render={({ field }) => (<FormItem><FormLabel>Hôte SMTP</FormLabel><FormControl><Input placeholder="smtp.fournisseur.com" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                </div>
                                                <div className="space-y-2">
                                                     <FormField control={form.control} name="emailSettings.smtpPort" render={({ field }) => (<FormItem><FormLabel>Port SMTP</FormLabel><FormControl><Input type="number" placeholder="587" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                                </div>
                                            </div>
                                            <FormField control={form.control} name="emailSettings.smtpUser" render={({ field }) => (<FormItem><FormLabel>Nom d'utilisateur SMTP</FormLabel><FormControl><Input placeholder="Votre nom d'utilisateur" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="emailSettings.smtpPass" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Mot de passe SMTP</FormLabel>
                                                    <div className="relative">
                                                        <FormControl><Input type={showSmtpPass ? "text" : "password"} placeholder="••••••••••••" {...field} value={field.value || ''} /></FormControl>
                                                        <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-full px-3" onClick={() => setShowSmtpPass(!showSmtpPass)}>
                                                            {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField
                                                control={form.control}
                                                name="emailSettings.smtpSecure"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                        <div className="space-y-0.5">
                                                            <FormLabel>Connexion sécurisée</FormLabel>
                                                            <p className="text-sm text-muted-foreground">Utiliser TLS/SSL pour la connexion SMTP.</p>
                                                        </div>
                                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </section>
                                     <section>
                                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Tester la configuration</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="test-email">Envoyer un e-mail de test à</Label>
                                                <Input id="test-email" type="email" placeholder="votre.email@test.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                                            </div>
                                            <Button type="button" onClick={handleTestEmail} disabled={isTestingEmail}>
                                                {isTestingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                                Envoyer le test
                                            </Button>
                                        </div>
                                    </section>

                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Information sur Gmail</AlertTitle>
                                        <AlertDescription>
                                            Pour utiliser votre compte Gmail, vous devez générer un "mot de passe d'application" dans les paramètres de sécurité de votre compte Google.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sauvegarder les paramètres
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
