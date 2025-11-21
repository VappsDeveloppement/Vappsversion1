
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, Check, Loader2, Percent, Star, Users } from "lucide-react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase/provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const signupSchema = z.object({
    firstName: z.string().min(1, "Le prénom est requis."),
    lastName: z.string().min(1, "Le nom de famille est requis."),
    email: z.string().email("Veuillez entrer une adresse e-mail valide."),
    password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères."),
});

// The local Plan type must include paypalSubscriptionId
type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  period: string;
  features: string[];
  isFeatured: boolean;
  isPublic: boolean;
  imageUrl?: string;
  cta?: string;
  counselorId?: string;
  contractId?: string;
  paypalSubscriptionId?: string; // This was missing
};


function PlanSelectorCard() {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const form = useForm<z.infer<typeof signupSchema>>({
        resolver: zodResolver(signupSchema),
        defaultValues: { firstName: '', lastName: '', email: '', password: '' },
    });

    const publicPlansQuery = useMemoFirebase(() => {
        const plansCollectionRef = collection(firestore, 'plans');
        return query(plansCollectionRef, where("isPublic", "==", true));
    }, [firestore]);

    const { data: plans, isLoading } = useCollection<Plan>(publicPlansQuery);

    const selectedPlan = useMemo(() => {
        if (!selectedPlanId || !plans) return null;
        return plans.find(p => p.id === selectedPlanId);
    }, [selectedPlanId, plans]);
    
    React.useEffect(() => {
        if (plans && plans.length > 0 && !selectedPlanId) {
            const featured = plans.find(p => p.isFeatured);
            setSelectedPlanId(featured ? featured.id : plans[0].id);
        }
    }, [plans, selectedPlanId]);

    const onSubmit = async (values: z.infer<typeof signupSchema>) => {
        if (!selectedPlan) return;
        setIsSubmitting(true);

        try {
            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;

            // 2. Create user document in Firestore
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, {
                id: user.uid,
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                role: 'conseiller', // New users from this flow are counselors
                planId: selectedPlan.id,
                subscriptionStatus: 'pending_payment',
                counselorId: user.uid, // A counselor is their own counselor
                dateJoined: new Date().toISOString(),
            });

            toast({
                title: "Compte créé avec succès !",
                description: "Vous allez être redirigé pour finaliser votre abonnement.",
            });

            // 3. Redirect to PayPal
            if (selectedPlan.paypalSubscriptionId) {
                const paypalUrl = `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${selectedPlan.paypalSubscriptionId}`;
                window.location.href = paypalUrl;
            } else {
                 toast({
                    title: "Configuration manquante",
                    description: "Aucun ID d'abonnement PayPal n'est configuré pour ce plan.",
                    variant: "destructive",
                });
            }
             setIsDialogOpen(false);

        } catch (error: any) {
             let message = "Une erreur est survenue lors de l'inscription.";
            if (error.code === 'auth/email-already-in-use') {
                message = "Cette adresse e-mail est déjà utilisée par un autre compte.";
            }
            toast({ title: 'Erreur', description: message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) {
        return (
             <Card className="overflow-hidden">
                <div className="relative h-48 w-full bg-muted"></div>
                <CardContent className="p-6">
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <Skeleton className="h-10 w-full mb-6" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
                 <CardFooter>
                    <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        )
    }

    if (!plans || plans.length === 0) {
        return (
            <Card className="overflow-hidden">
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Aucun plan disponible</AlertTitle>
                        <AlertDescription>
                            Aucun plan public n'a été configuré pour être affiché ici.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }
    
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Card className={cn("overflow-hidden flex flex-col h-full", selectedPlan?.isFeatured && "border-primary border-2")}>
             {selectedPlan?.imageUrl && (
                <div className="relative h-48 w-full">
                    <Image
                        src={selectedPlan.imageUrl}
                        alt={selectedPlan.name}
                        fill
                        sizes="100vw"
                        className="object-cover"
                    />
                </div>
            )}
            <CardHeader>
                <Tabs value={selectedPlanId || ''} onValueChange={setSelectedPlanId} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        {plans.slice(0, 3).map(plan => (
                             <TabsTrigger key={plan.id} value={plan.id}>{plan.name}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="p-6 flex-1">
                {selectedPlan && (
                    <>
                        <p className="text-muted-foreground mb-4 h-12">
                            {selectedPlan.description}
                        </p>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-primary">{selectedPlan.price}€</span>
                            <span className="text-muted-foreground">{selectedPlan.period}</span>
                        </div>
                        <ul className="space-y-3">
                            {selectedPlan.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </CardContent>
            <CardFooter>
                  <DialogTrigger asChild>
                    <Button className="w-full">Choisir ce plan</Button>
                  </DialogTrigger>
            </CardFooter>
        </Card>

        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Devenir Conseiller - {selectedPlan?.name}</DialogTitle>
                <DialogDescription>
                    Créez votre compte pour commencer. Vous serez ensuite redirigé pour finaliser le paiement.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Mot de passe</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            S'inscrire et Payer {selectedPlan?.price}€
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    )
}


export function WhiteLabelSection() {
    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Notre Plateforme en Marque Blanche</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
                        Offrez une expérience de coaching et d'accompagnement de premier ordre, entièrement personnalisée à votre image de marque.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left Column */}
                    <div className="space-y-8">
                        <div className="aspect-video w-full">
                            <iframe
                                className="w-full h-full rounded-lg shadow-xl"
                                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen>
                            </iframe>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">Évaluation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                    <div className="flex flex-col items-center">
                                        <Users className="h-8 w-8 text-green-500 mb-2" />
                                        <p className="text-2xl font-bold">1,200+</p>
                                        <p className="text-sm text-muted-foreground">Bêta-testeurs</p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <Percent className="h-8 w-8 text-green-500 mb-2" />
                                        <p className="text-2xl font-bold">98%</p>
                                        <p className="text-sm text-muted-foreground">Réussite aux tests</p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <Star className="h-8 w-8 text-green-500 mb-2" />
                                        <p className="text-2xl font-bold">4.9/5</p>
                                        <p className="text-sm text-muted-foreground">Note Globale</p>
                                    </div>
                                </div>
                                <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold">
                                    Évaluer l'application
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div>
                        <PlanSelectorCard />
                    </div>
                </div>
            </div>
        </section>
    );
}
