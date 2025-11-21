
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, Check, Percent, Star, Users } from "lucide-react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import type { Plan } from './plan-management';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

function PlanSelectorCard() {
    const firestore = useFirestore();
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

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
        <Card className={cn("overflow-hidden flex flex-col h-full", selectedPlan?.isFeatured && "border-primary border-2")}>
            {selectedPlan?.imageUrl && (
                <div className="relative h-48 w-full">
                    <Image
                        src={selectedPlan.imageUrl}
                        alt={selectedPlan.name}
                        fill
                        className="object-cover"
                    />
                </div>
            )}
            <CardHeader>
                 <Select value={selectedPlanId || ''} onValueChange={setSelectedPlanId}>
                    <SelectTrigger className="w-full text-lg font-semibold">
                        <SelectValue placeholder="Sélectionnez un plan" />
                    </SelectTrigger>
                    <SelectContent>
                        {plans.map(plan => (
                            <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
                 <Button className="w-full font-bold">
                    {selectedPlan?.cta || 'Choisir ce plan'}
                </Button>
            </CardFooter>
        </Card>
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
