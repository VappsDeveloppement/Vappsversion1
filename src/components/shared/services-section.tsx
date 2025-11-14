
'use client';

import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";
import { useAgency } from "@/context/agency-provider";

export function ServicesSection() {
    const { personalization } = useAgency();
    const servicesSettings = personalization?.servicesSection;

    if (!servicesSettings) return null;

    const { title, subtitle, description, services } = servicesSettings;

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    <p className="text-lg text-primary font-semibold mt-2">{subtitle}</p>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                        {description}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service) => {
                        const placeholderImage = PlaceHolderImages.find(p => p.id === service.id);
                        const imageSrc = service.imageUrl || placeholderImage?.imageUrl;
                        const imageHint = placeholderImage?.imageHint || 'service';

                        return (
                            <Card key={service.id} className="overflow-hidden group flex flex-col">
                                <div className="h-48 relative overflow-hidden">
                                    {imageSrc && (
                                        <Image
                                            src={imageSrc}
                                            alt={service.title}
                                            fill
                                            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                            data-ai-hint={imageHint}
                                        />
                                    )}
                                </div>
                                <CardContent className="p-6 flex-1 flex flex-col">
                                    <h3 className="font-bold text-xl mb-2">{service.title}</h3>
                                    <p className="text-muted-foreground">{service.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
