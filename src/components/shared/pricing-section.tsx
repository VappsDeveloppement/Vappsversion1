

'use client';

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAgency } from "@/context/agency-provider";
import { useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import type { Plan } from "@/components/shared/plan-management";
import { Skeleton } from "../ui/skeleton";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Contract } from "./contract-management";


function ContractModal({ contractId, buttonText }: { contractId: string; buttonText: string }) {
    const firestore = useFirestore();
    const contractRef = useMemoFirebase(() => doc(firestore, 'contracts', contractId), [firestore, contractId]);
    const { data: contract, isLoading } = useDoc<Contract>(contractRef);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="w-full font-bold">{buttonText}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                 <DialogHeader>
                    <DialogTitle>{isLoading ? 'Chargement...' : contract?.title}</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <Skeleton className="h-64 w-full" />
                ) : contract ? (
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: contract.content }} />
                    </ScrollArea>
                ) : (
                    <p>Contrat non trouvé.</p>
                )}
            </DialogContent>
        </Dialog>
    );
}

export function PricingSection() {
    const { isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();

    const publicPlansQuery = useMemoFirebase(() => {
        const plansCollectionRef = collection(firestore, 'plans');
        return query(plansCollectionRef, where("isPublic", "==", true));
    }, [firestore]);

    const { data: plans, isLoading: arePlansLoading } = useCollection<Plan>(publicPlansQuery);

    const isLoading = isAgencyLoading || arePlansLoading;

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
        return null; // Don't render the section if there are no public plans
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {plans.map((tier) => (
                        <Card key={tier.id} className={cn("flex flex-col h-full", tier.isFeatured && "border-primary border-2 shadow-lg relative")}>
                            {tier.isFeatured && (
                                <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                                        Recommandé
                                    </div>
                                </div>
                            )}
                            <CardHeader className="pt-10">
                                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                                <CardDescription className="break-words">{tier.description}</CardDescription>
                                <div>
                                    <span className="text-4xl font-bold text-primary">{tier.price}€</span>
                                    <span className="text-muted-foreground">{tier.period}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3">
                                    {tier.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <Check className="h-5 w-5 text-green-500" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                {tier.contractId ? (
                                    <ContractModal contractId={tier.contractId} buttonText={tier.cta || 'Choisir ce plan'} />
                                ) : (
                                     <Button className={cn("w-full", !tier.isFeatured && "variant-secondary")}>
                                        {tier.cta || 'Choisir ce plan'}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

    