

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, Check, Loader2, Percent, Star, Users } from "lucide-react";
import Image from "next/image";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc } from 'firebase/firestore';
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
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { useAgency } from '@/context/agency-provider';
import type { SubscriptionPlan, WhiteLabelStat } from '@/app/admin/settings/personalization/page';


type Contract = {
    id: string;
    title: string;
    content: string;
};

const signUpFormSchema = z.object({
    firstName: z.string().min(1, "Le prénom est requis."),
    lastName: z.string().min(1, "Le nom de famille est requis."),
    email: z.string().email("Veuillez entrer une adresse e-mail valide."),
    password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères."),
});

type SignUpFormData = z.infer<typeof signUpFormSchema>;


function PlanSelectorCard() {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const { personalization } = useAgency();

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [contractAccepted, setContractAccepted] = useState(false);

    const form = useForm<SignUpFormData>({
        resolver: zodResolver(signUpFormSchema),
        defaultValues: { firstName: '', lastName: '', email: '', password: '' },
    });

    const plans = personalization?.whiteLabelSection?.plans || [];

    const selectedPlan = useMemo(() => {
        if (!selectedPlanId || !plans) return null;
        return plans.find(p => p.id === selectedPlanId);
    }, [selectedPlanId, plans]);

    const contractRef = useMemoFirebase(() => {
        if (!selectedPlan?.contractId) return null;
        return doc(firestore, 'contracts', selectedPlan.contractId);
    }, [firestore, selectedPlan]);

    const { data: contract, isLoading: isContractLoading } = useDoc<Contract>(contractRef);
    
    React.useEffect(() => {
        if (plans && plans.length > 0 && !selectedPlanId) {
            const featured = plans.find(p => p.isFeatured);
            setSelectedPlanId(featured ? featured.id : plans[0].id);
        }
    }, [plans, selectedPlanId]);
    
    React.useEffect(() => {
        if(isDialogOpen) {
            setContractAccepted(false);
        }
    }, [isDialogOpen, selectedPlanId]);


    const onSubmit = async (values: SignUpFormData) => {
        if (!selectedPlan) return;
        setIsSubmitting(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;

            const userDocRef = doc(firestore, 'users', user.uid);
             await setDocumentNonBlocking(userDocRef, {
                firstName: values.firstName,
                lastName: values.lastName,
                email: user.email,
                role: 'conseiller',
                planId: selectedPlan.id,
                subscriptionStatus: 'pending_payment',
                counselorId: user.uid,
                dateJoined: new Date().toISOString(),
            }, { merge: true });

            toast({
                title: "Compte créé avec succès !",
                description: "Vous allez être redirigé pour finaliser votre abonnement.",
            });

            if (selectedPlan.paypalSubscriptionId) {
                const paypalUrl = `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${selectedPlan.paypalSubscriptionId}`;
                window.location.href = paypalUrl;
            } else {
                 toast({
                    title: "Configuration manquante",
                    description: "Aucun ID d'abonnement PayPal n'est configuré pour ce plan. Le paiement n'a pas pu être initié.",
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
    
    if (plans.length === 0) {
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
    
    const showContract = selectedPlan && selectedPlan.contractId;
    const formDisabled = showContract && !contractAccepted;

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
                    <TabsList className={cn("grid w-full", plans.length === 1 && "grid-cols-1", plans.length === 2 && "grid-cols-2", plans.length >= 3 && "grid-cols-3")}>
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
                            {(selectedPlan.features || []).map((feature, i) => (
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

        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Devenir Conseiller - {selectedPlan?.name}</DialogTitle>
                <DialogDescription>
                    {showContract ? "Veuillez lire et accepter les termes du contrat avant de finaliser votre inscription." : "Créez votre compte pour commencer. Vous serez ensuite redirigé pour finaliser le paiement."}
                </DialogDescription>
            </DialogHeader>

            {showContract && (
                <div className='space-y-4'>
                    <p className='font-medium text-sm'>{isContractLoading ? <Skeleton className="h-5 w-3/4" /> : contract?.title}</p>
                    <ScrollArea className="h-64 w-full rounded-md border p-4">
                       {isContractLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                       ) : contract ? (
                             <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: contract.content }} />
                       ) : (
                            <p className="text-destructive text-sm">Impossible de charger le contrat.</p>
                       )}
                    </ScrollArea>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="terms" checked={contractAccepted} onCheckedChange={(checked) => setContractAccepted(checked as boolean)} />
                        <Label htmlFor="terms" className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                            J'ai lu et j'accepte les termes du contrat.
                        </Label>
                    </div>
                </div>
            )}
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <fieldset disabled={formDisabled} className="space-y-4 disabled:opacity-50">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Mot de passe</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </fieldset>
                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting || formDisabled} className="w-full">
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

const statIcons = {
    Users: Users,
    Percent: Percent,
    Star: Star,
};


export function WhiteLabelSection() {
    const { personalization, isLoading } = useAgency();
    const wl = personalization?.whiteLabelSection;

    if (isLoading) {
        return (
            <section className="bg-background text-foreground py-16 sm:py-24">
                <div className="container mx-auto px-4">
                    <Skeleton className="h-12 w-1/2 mx-auto mb-6" />
                    <Skeleton className="h-6 w-3/4 mx-auto mb-12" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="space-y-8">
                            <Skeleton className="aspect-video w-full rounded-lg" />
                            <Skeleton className="h-40 w-full rounded-lg" />
                        </div>
                        <div>
                             <Skeleton className="h-[500px] w-full rounded-lg" />
                        </div>
                    </div>
                </div>
            </section>
        );
    }
    
    if (!wl) return null;


    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{wl.title}</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-3xl mx-auto">
                        {wl.description}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left Column */}
                    <div className="space-y-8">
                        <div className="aspect-video w-full">
                            {wl.mediaType === 'video' ? (
                                <iframe
                                    className="w-full h-full rounded-lg shadow-xl"
                                    src={wl.videoUrl}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                    allowFullScreen>
                                </iframe>
                            ) : (
                                wl.imageUrl && <Image src={wl.imageUrl} alt="Média Marque Blanche" width={1280} height={720} className="w-full h-full object-cover rounded-lg shadow-xl" />
                            )}
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">Évaluation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                   {wl.stats?.map(stat => {
                                       const Icon = statIcons[stat.icon];
                                       return (
                                            <div key={stat.id} className="flex flex-col items-center">
                                                <Icon className="h-8 w-8 text-primary mb-2" />
                                                <p className="text-2xl font-bold">{stat.value}</p>
                                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                                            </div>
                                       )
                                   })}
                                </div>
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
