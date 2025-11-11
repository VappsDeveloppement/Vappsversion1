import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";

const services = [
    {
        id: "service-bilan",
        title: "Bilan de Compétences",
        description: "Faites le point sur vos forces et aspirations pour définir un projet clair.",
    },
    {
        id: "service-coaching",
        title: "Coaching Carrière",
        description: "Un accompagnement personnalisé pour atteindre vos objectifs professionnels.",
    },
    {
        id: "service-leadership",
        title: "Formation au Leadership",
        description: "Développez vos compétences managériales et devenez un leader inspirant.",
    },
];

export function ServicesSection() {
    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Nos Accompagnements</h2>
                    <p className="text-lg text-primary font-semibold mt-2">Construisons ensemble votre avenir</p>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                        Que vous soyez en quête de sens, en reconversion ou désireux d'évoluer, nous avons une solution pour vous.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service) => {
                        const image = PlaceHolderImages.find(p => p.id === service.id);
                        return (
                            <Card key={service.id} className="overflow-hidden group flex flex-col">
                                <div className="h-48 relative overflow-hidden">
                                    {image && (
                                        <Image
                                            src={image.imageUrl}
                                            alt={image.description}
                                            fill
                                            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                            data-ai-hint={image.imageHint}
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
