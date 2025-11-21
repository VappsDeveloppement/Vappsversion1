
'use client';

import { Check, EyeOff, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAgency } from "@/context/agency-provider";
import { useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking, useAuth } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import type { Plan } from "@/components/shared/plan-management";
import { Skeleton } from "../ui/skeleton";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword } from "firebase/auth";

type Contract = {
    id: string;
    title: string;
    content: string;
};

const signupFormSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'adresse email est invalide."),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Vous devez accepter les termes du contrat.",
  }),
});
type SignupFormData = z.infer<typeof signupFormSchema>;

export function PricingSection() {
    const { personalization, isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [step, setStep] = useState(1);
    const [contractAccepted, setContractAccepted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const publicPlansQuery = useMemoFirebase(() => {
        const plansCollectionRef = collection(firestore, 'plans');
        return query(plansCollectionRef, where("isPublic", "==", true));
    }, [firestore]);

    const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(publicPlansQuery);
    
    const contractRef = useMemoFirebase(() => selectedPlan?.contractId ? doc(firestore, 'contracts', selectedPlan.contractId) : null, [firestore, selectedPlan]);
    const { data: contract, isLoading: isContractLoading } = useDoc<Contract>(contractRef);

    const isLoading = isAgencyLoading || arePlansLoading;
    const primaryColor = personalization?.primaryColor || '#10B981';

    const form = useForm<SignupFormData>({
        resolver: zodResolver(signupFormSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            acceptTerms: false,
        },
    });
    
    const handleChoosePlan = (plan: Plan) => {
        setSelectedPlan(plan);
        setStep(plan.contractId ? 1 : 2); // Skip to step 2 if no contract
        setIsModalOpen(true);
    };

    const handleModalOpenChange = (open: boolean) => {
        setIsModalOpen(open);
        if (!open) {
            // Reset state on close
            setTimeout(() => {
                setSelectedPlan(null);
                setStep(1);
                setContractAccepted(false);
                form.reset();
            }, 300);
        }
    };
    
    const onSubmit = async (data: SignupFormData) => {
        if (!selectedPlan) return;

        setIsSubmitting(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            const userDocRef = doc(firestore, 'users', user.uid);
            const newUserDoc = {
                id: user.uid,
                firstName: data.firstName,
                lastName: data.lastName,
                email: user.email,
                role: 'conseiller',
                dateJoined: new Date().toISOString(),
                planId: selectedPlan.id,
                subscriptionStatus: 'pending_payment',
            };
            await setDocumentNonBlocking(userDocRef, newUserDoc, { merge: false });

            toast({ title: "Compte créé !", description: "Vous allez être redirigé vers PayPal pour finaliser votre abonnement." });

            if (selectedPlan.paypalSubscriptionId) {
                window.location.href = `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${selectedPlan.paypalSubscriptionId}`;
            } else {
                 toast({ title: "Action requise", description: "Veuillez contacter l'administrateur pour finaliser votre abonnement." });
            }

        } catch (error: any) {
            console.error("Signup error:", error);
            let message = "Une erreur est survenue lors de l'inscription.";
            if (error.code === 'auth/email-already-in-use') {
                message = "Cette adresse e-mail est déjà utilisée.";
            }
            toast({ variant: 'destructive', title: 'Erreur', description: message });
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
             <section className="bg-background text-foreground py-16 sm:py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <Skeleton className="h-10 w-1/3 mx-auto" />
                        <Skeleton className="h-6 w-1/2 mx-auto mt-4" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i} className="flex flex-col h-full">
                                <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                                <CardContent className="flex-1"><Skeleton className="h-24 w-full" /></CardContent>
                                <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        )
    }
    
    if (!plans || plans.length === 0) {
        return null;
    }

    return (
        <>
            <section className="bg-background text-foreground py-16 sm:py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl lg:text-4xl font-bold">Nos Formules</h2>
                        <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
                            Choisissez le plan qui correspond le mieux à vos ambitions et à vos besoins.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
                        {plans.map((tier) => (
                            <Card key={tier.id} className={cn("flex flex-col h-full shadow-lg", tier.isFeatured && "border-2 relative")} style={tier.isFeatured ? {borderColor: primaryColor} : {}}>
                                {tier.isFeatured && (
                                    <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                                        <div className="text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: primaryColor }}>
                                            Recommandé
                                        </div>
                                    </div>
                                )}
                                <CardHeader className="pt-10 text-center">
                                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                                    <CardDescription className="break-words">{tier.description}</CardDescription>
                                    <div className="py-4">
                                        <span className="text-4xl font-bold" style={{color: primaryColor}}>{tier.price}€</span>
                                        <span className="text-muted-foreground">{tier.period}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-3">
                                        {tier.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                                                <span className="text-muted-foreground">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full font-bold" style={{ backgroundColor: primaryColor }} onClick={() => handleChoosePlan(tier)}>
                                        {tier.cta || 'Choisir cette formule'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        
            <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
                <DialogContent className="sm:max-w-2xl">
                     <DialogHeader>
                        <DialogTitle>
                            {step === 1 ? (isContractLoading ? 'Chargement...' : contract?.title) : `Souscrire à l'offre "${selectedPlan?.name}"`}
                        </DialogTitle>
                        <DialogDescription>
                            {step === 1 ? "Veuillez lire et accepter le contrat pour continuer." : "Créez votre compte conseiller pour commencer."}
                        </DialogDescription>
                    </DialogHeader>
                    {step === 1 ? (
                        <>
                            {isContractLoading ? (
                                <Skeleton className="h-64 w-full" />
                            ) : contract ? (
                                <ScrollArea className="max-h-[50vh] pr-4 border rounded-md p-4">
                                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: contract.content }} />
                                </ScrollArea>
                            ) : (
                                <p className="text-destructive">Contrat non trouvé.</p>
                            )}
                            <div className="flex items-center space-x-2 pt-4">
                                <Checkbox id="terms" checked={contractAccepted} onCheckedChange={(checked) => setContractAccepted(checked as boolean)} />
                                <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Je reconnais avoir lu et accepté les termes du contrat
                                </label>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => setStep(2)} disabled={!contractAccepted || !contract}>
                                    Continuer
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="firstName" render={({ field }) => (
                                        <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="lastName" render={({ field }) => (
                                        <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mot de passe</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? "text" : "password"} {...field} />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                {selectedPlan?.contractId && (
                                    <FormField
                                        control={form.control}
                                        name="acceptTerms"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Je reconnais avoir lu et accepté les termes du contrat.
                                                </FormLabel>
                                                <FormMessage />
                                            </div>
                                            </FormItem>
                                        )}
                                    />
                                )}
                                <DialogFooter>
                                    {selectedPlan?.contractId && <Button type="button" variant="ghost" onClick={() => setStep(1)}>Retour</Button>}
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Valider et Payer
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
