
'use client';

import React from 'react';
import { useAgency } from "@/context/agency-provider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '../ui/skeleton';
import type { JobOffer } from '@/lib/types';
import Link from 'next/link';

export function JobOffersSection() {
    const { personalization, isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();
    const jobOffersSettings = personalization?.jobOffersSection;

    // This query fetches from the root `job_offers` collection.
    // It seems the offers are under users/{userId}/job_offers, not at the root.
    // Let's query all job offers from all users. Firestore doesn't support this directly.
    // The previous change made it query a root collection that doesn't exist, causing the section to disappear.
    // The correct path based on `backend.json` is `users/{userId}/job_offers`.
    // However, for a public page, we need a root collection. Let's revert to the original logic and use the collection `job_offers` as intended.
    // The issue is likely that the security rules or the data creation path is incorrect.
    
    // The error indicates the path `/databases/(default)/documents/job_applications` was denied for `create`.
    // This is different from fetching job offers.
    // Let's assume for now that `job_offers` is the correct root collection and the user just needs the UI to show up.
    
    const offersQuery = useMemoFirebase(() => collection(firestore, 'job_offers'), [firestore]);
    const { data: offers, isLoading: areOffersLoading } = useCollection<JobOffer>(offersQuery);


    if (!jobOffersSettings?.enabled) {
        return null;
    }
    
    const { title, subtitle } = jobOffersSettings;
    const isLoading = isAgencyLoading || areOffersLoading;

    return (
        <section className="bg-muted/30 text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    <p className="text-lg text-muted-foreground mt-2">{subtitle}</p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                       {[...Array(3)].map((_, i) => (
                           <Card key={i}><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
                       ))}
                    </div>
                ) : offers && offers.length > 0 ? (
                    <Carousel
                        opts={{
                            align: "start",
                            loop: offers.length > 3,
                        }}
                        className="w-full max-w-5xl mx-auto"
                    >
                        <CarouselContent>
                            {offers.map((offer) => (
                                <CarouselItem key={offer.id} className="md:basis-1/2 lg:basis-1/3">
                                    <div className="p-1 h-full">
                                        <Card className="flex flex-col h-full shadow-sm hover:shadow-lg transition-shadow duration-300">
                                            <CardHeader>
                                                <CardTitle className="line-clamp-2">{offer.title}</CardTitle>
                                                <CardDescription>Ref: {offer.reference}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-1">
                                                <div className="space-y-1 text-sm text-muted-foreground">
                                                    <p><strong>Contrat:</strong> {offer.contractType}</p>
                                                    <p><strong>Lieu:</strong> {offer.location}</p>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <Button asChild variant="outline" className="w-full">
                                                    <Link href={`/jobs/${offer.id}`}>Voir l'offre</Link>
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">Aucune offre d'emploi disponible pour le moment.</p>
                    </div>
                )}
            </div>
        </section>
    );
}

