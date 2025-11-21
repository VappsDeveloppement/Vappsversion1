

'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Plan } from '@/components/shared/plan-management';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';

type Contract = {
    id: string;
    title: string;
    content: string;
}

type CounselorProfile = {
    id: string;
    miniSite?: {
        hero?: {
            primaryColor?: string;
        }
        pricingSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            planIds?: string[];
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    }
};

function ContractModal({ contractId, buttonText, primaryColor }: { contractId: string; buttonText: string, primaryColor: string }) {
    const firestore = useFirestore();
    const contractRef = useMemoFirebase(() => doc(firestore, 'contracts', contractId), [firestore, contractId]);
    const { data: contract, isLoading } = useDoc<Contract>(contractRef);

    return (
        <Dialog>
            <DialogTrigger asChild>
                 <Button className="w-full font-bold" style={{ backgroundColor: primaryColor }}>
                    {buttonText}
                </Button>
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

export function CounselorPricingSection({ counselor }: { counselor: CounselorProfile }) {
    const firestore = useFirestore();
    const pricingConfig = counselor.miniSite?.pricingSection || {};
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    const { enabled, title, subtitle, planIds } = pricingConfig;

    const selectedPlansQuery = useMemoFirebase(() => {
        if (!planIds || planIds.length === 0) return null;
        const plansCollectionRef = collection(firestore, 'plans');
        return query(plansCollectionRef, where(documentId(), 'in', planIds));
    }, [firestore, planIds]);

    const { data: plans, isLoading } = useCollection<Plan>(selectedPlansQuery);

    if (!enabled) {
        return null;
    }

    const sortedPlans = useMemo(() => {
        if (!plans || !planIds) return [];
        return plans.sort((a, b) => planIds.indexOf(a.id) - planIds.indexOf(b.id));
    }, [plans, planIds]);

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title || "Mes Formules"}</h2>
                    {subtitle && <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">{subtitle}</p>}
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {[...Array(planIds?.length || 1)].map((_, i) => (
                            <Card key={i} className="flex flex-col h-full"><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent className="flex-1"><Skeleton className="h-24 w-full" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
                        ))}
                    </div>
                ) : sortedPlans && sortedPlans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
                        {sortedPlans.map((plan) => (
                            <Card key={plan.id} className={cn("flex flex-col h-full shadow-lg", plan.isFeatured && "border-2 relative")} style={plan.isFeatured ? {borderColor: primaryColor} : {}}>
                                {plan.isFeatured && (
                                    <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                                        <div className="text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: primaryColor }}>
                                            Recommandé
                                        </div>
                                    </div>
                                )}
                                <CardHeader className="pt-10 text-center">
                                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                    <CardDescription className="break-words">{plan.description}</CardDescription>
                                    <div className="py-4">
                                        <span className="text-4xl font-bold" style={{ color: primaryColor }}>{plan.price}€</span>
                                        <span className="text-muted-foreground">{plan.period}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-3">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                                                <span className="text-muted-foreground">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    {plan.contractId ? (
                                        <ContractModal contractId={plan.contractId} buttonText={plan.cta || 'Choisir cette formule'} primaryColor={primaryColor} />
                                    ) : (
                                        <Button className="w-full font-bold" style={{ backgroundColor: primaryColor }}>
                                            {plan.cta || 'Choisir cette formule'}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground">
                        <p>Aucune formule sélectionnée pour l'affichage.</p>
                    </div>
                )}
            </div>
        </section>
    );
}

    