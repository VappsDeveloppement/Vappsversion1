
'use client';

import { useAgency } from "@/context/agency-provider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";

export function JobOffersSection() {
    const { personalization } = useAgency();
    const jobOffersSettings = personalization?.jobOffersSection;

    if (!jobOffersSettings || !jobOffersSettings.offers || jobOffersSettings.offers.length === 0) {
        return null;
    }
    
    const { title, subtitle, offers } = jobOffersSettings;

    return (
        <section className="bg-muted/30 text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    <p className="text-lg text-muted-foreground mt-2">{subtitle}</p>
                </div>

                <Carousel
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    className="w-full max-w-5xl mx-auto"
                >
                    <CarouselContent>
                        {offers.map((offer) => (
                            <CarouselItem key={offer.id} className="md:basis-1/2 lg:basis-1/3">
                                <div className="p-1">
                                    <Card className="flex flex-col h-full">
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
                                            <Button variant="outline" className="w-full">Voir l'offre</Button>
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

    