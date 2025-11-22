
'use client';

import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
];

export function TrainingCatalogSection() {
    return (
        <section className="bg-muted/30 text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Catalogue des Formations</h2>
                    <p className="text-lg text-muted-foreground mt-2">
                        Montez en compétences avec nos formations conçues pour les professionnels.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {trainings.map((training) => {
                        const image = PlaceHolderImages.find((p) => p.id === training.id);
                        return (
                            <Card key={training.id} className="overflow-hidden group flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-300">
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
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

    