
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";

type CounselorProfile = {
    miniSite?: {
        jobOffersSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            description?: string;
            offers?: { id: string; title: string; contractType: string; location: string }[];
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    };
};

export function CounselorJobOffersSection({ counselor }: { counselor: CounselorProfile }) {
    const jobOffersSettings = counselor.miniSite?.jobOffersSection;
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    if (!jobOffersSettings?.enabled || !jobOffersSettings.offers || jobOffersSettings.offers.length === 0) {
        return null;
    }
    
    const { title, subtitle, description, offers } = jobOffersSettings;

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    {subtitle && <p className="text-lg font-semibold mt-2" style={{ color: primaryColor }}>{subtitle}</p>}
                    {description && <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{description}</p>}
                </div>

                <Carousel
                    opts={{
                        align: "start",
                        loop: offers.length > 2,
                    }}
                    className="w-full max-w-5xl mx-auto"
                >
                    <CarouselContent>
                        {offers.map((offer) => (
                            <CarouselItem key={offer.id} className="md:basis-1/2 lg:basis-1/3">
                                <div className="p-1 h-full">
                                    <Card className="flex flex-col h-full shadow-lg border-2 border-transparent hover:border-primary transition-all duration-300">
                                        <CardHeader>
                                            <CardTitle>{offer.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                <p><strong>Contrat:</strong> {offer.contractType}</p>
                                                <p><strong>Lieu:</strong> {offer.location}</p>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button className="w-full font-bold" style={{ backgroundColor: primaryColor }}>
                                                Postuler
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
            </div>
        </section>
    );
}
