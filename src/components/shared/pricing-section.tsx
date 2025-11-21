'use client';

import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAgency } from "@/context/agency-provider";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from "@/firebase/provider";
import type { Plan } from "@/components/shared/plan-management";
import { Skeleton } from "../ui/skeleton";
import React from "react";
import { useToast } from "@/hooks/use-toast";

export function PricingSection() {
    const { personalization, isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();
    const { toast } = useToast();

    const publicPlansQuery = useMemoFirebase(() => {
        const plansCollectionRef = collection(firestore, 'plans');
        return query(plansCollectionRef, where("isPublic", "==", true));
    }, [firestore]);

    const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(publicPlansQuery);
    
    const isLoading = isAgencyLoading || arePlansLoading;
    const primaryColor = personalization?.primaryColor || '#10B981';

    const handleButtonClick = (planName: string) => {
        toast({
            title: "Bouton cliqué !",
            description: `Vous avez cliqué sur le plan : ${planName}`,
        });
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
                            <Card key={i} className="flex flex-col h-full"><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent className="flex-1"><Skeleton className="h-24 w-full" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
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
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Nos Formules</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
                        Choisissez le plan qui correspond le mieux à vos ambitions et à vos besoins.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
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
                                <Button 
                                    className="w-full font-bold" 
                                    style={{ backgroundColor: primaryColor }}
                                    onClick={() => handleButtonClick(tier.name)}
                                >
                                    {tier.cta || 'Choisir cette formule'}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
