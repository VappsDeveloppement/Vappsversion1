
'use client';

import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { Input } from "../ui/input";
import { Search } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const trainings = [
    {
        id: "training-1",
        title: "Devenir un Manager Inspirant",
        description: "Développez les compétences clés pour motiver et mener votre équipe vers le succès.",
        category: "Management",
    },
    {
        id: "training-2",
        title: "Maîtriser la Prise de Parole en Public",
        description: "Gagnez en confiance et en impact lors de vos présentations et réunions.",
        category: "Communication",
    },
    {
        id: "training-3",
        title: "Gestion du Temps et des Priorités",
        description: "Optimisez votre organisation pour plus d'efficacité et moins de stress.",
        category: "Productivité",
    },
    {
        id: "training-4",
        title: "Négociation et Influence",
        description: "Apprenez à convaincre et à obtenir de meilleurs résultats dans vos échanges.",
        category: "Communication",
    },
    {
        id: "training-5",
        title: "Leadership Agile",
        description: "Adaptez votre style de management aux environnements complexes et changeants.",
        category: "Management",
    }
];

export function TrainingCatalogSection() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTrainings = useMemo(() => {
        if (!searchTerm) {
            return trainings;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return trainings.filter(training =>
            training.title.toLowerCase().includes(lowercasedTerm) ||
            training.category.toLowerCase().includes(lowercasedTerm) ||
            training.description.toLowerCase().includes(lowercasedTerm)
        );
    }, [searchTerm]);

    return (
        <section className="bg-muted/30 text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Catalogue des Formations</h2>
                    <p className="text-lg text-muted-foreground mt-2">
                        Montez en compétences avec nos formations conçues pour les professionnels.
                    </p>
                </div>
                
                <div className="max-w-md mx-auto mb-12">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher une formation..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {filteredTrainings.length > 0 ? (
                     <Carousel
                        opts={{
                            align: "start",
                            loop: false,
                        }}
                        className="w-full max-w-5xl mx-auto"
                    >
                        <CarouselContent>
                            {filteredTrainings.map((training) => {
                                const image = PlaceHolderImages.find((p) => p.id === training.id);
                                return (
                                     <CarouselItem key={training.id} className="md:basis-1/2 lg:basis-1/3">
                                        <div className="p-1 h-full">
                                            <Card className="overflow-hidden group flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-300 h-full">
                                                {image && (
                                                    <div className="h-48 relative overflow-hidden">
                                                        <Image
                                                            src={image.imageUrl}
                                                            alt={image.description}
                                                            fill
                                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                                            data-ai-hint={image.imageHint}
                                                        />
                                                    </div>
                                                )}
                                                <CardHeader>
                                                    <CardTitle>{training.title}</CardTitle>
                                                    <CardDescription>{training.category}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="flex-1">
                                                    <p className="text-muted-foreground text-sm">{training.description}</p>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button asChild className="w-full">
                                                        <Link href="#">Voir le programme</Link>
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </div>
                                    </CarouselItem>
                                );
                            })}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                ) : (
                    <div className="text-center text-muted-foreground py-16">
                        <p>Aucune formation ne correspond à votre recherche.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
