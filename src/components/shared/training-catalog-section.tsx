
'use client';

import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { Input } from "../ui/input";
import { Search } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "../ui/skeleton";
import type { Plan as Training } from "./plan-management";

type TrainingWithCategory = Training & { categoryName?: string };
type Category = { id: string; name: string; };

export function TrainingCatalogSection({ primaryColor = '#10B981' }: { primaryColor?: string }) {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const trainingsQuery = useMemoFirebase(() => 
        isClient ? query(collection(firestore, 'trainings'), where('isPublic', '==', true)) : null, 
    [firestore, isClient]);
    const { data: trainings, isLoading: areTrainingsLoading } = useCollection<Training>(trainingsQuery);

    const categoriesQuery = useMemoFirebase(() => 
        isClient ? collection(firestore, 'training_categories') : null, 
    [firestore, isClient]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<Category>(categoriesQuery);

    const trainingsWithCategory = useMemo(() => {
        if (!trainings || !categories) return [];
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        return trainings.map(training => ({
            ...training,
            categoryName: categoryMap.get(training.categoryId) || 'Non classé',
        }));
    }, [trainings, categories]);

    const filteredTrainings = useMemo(() => {
        if (!searchTerm) {
            return trainingsWithCategory;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return trainingsWithCategory.filter(training =>
            training.title.toLowerCase().includes(lowercasedTerm) ||
            training.categoryName?.toLowerCase().includes(lowercasedTerm) ||
            training.description?.toLowerCase().includes(lowercasedTerm)
        );
    }, [searchTerm, trainingsWithCategory]);

    const isLoading = areTrainingsLoading || areCategoriesLoading;

    if (!isClient) {
        return (
             <section className="bg-muted/30 text-foreground py-16 sm:py-24">
                <div className="container mx-auto px-4">
                    <Skeleton className="h-10 w-1/3 mx-auto mb-4" />
                    <Skeleton className="h-6 w-1/2 mx-auto mb-12" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => <Card key={i}><Skeleton className="h-64 w-full" /></Card>)}
                    </div>
                </div>
            </section>
        );
    }

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

                {isLoading ? (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => <Card key={i}><Skeleton className="h-64 w-full" /></Card>)}
                    </div>
                ) : filteredTrainings.length > 0 ? (
                     <Carousel
                        opts={{
                            align: "start",
                            loop: filteredTrainings.length > 3,
                        }}
                        className="w-full max-w-5xl mx-auto"
                    >
                        <CarouselContent>
                            {filteredTrainings.map((training) => {
                                return (
                                     <CarouselItem key={training.id} className="md:basis-1/2 lg:basis-1/3">
                                        <div className="p-1 h-full">
                                            <Card className="overflow-hidden group flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-300 h-full">
                                                {training.imageUrl ? (
                                                    <div className="h-48 relative overflow-hidden">
                                                        <Image
                                                            src={training.imageUrl}
                                                            alt={training.title}
                                                            fill
                                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                                        />
                                                    </div>
                                                ) : <div className="h-48 bg-muted"></div>}
                                                <CardHeader>
                                                    <CardTitle>{training.title}</CardTitle>
                                                    <CardDescription>{training.categoryName}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="flex-1">
                                                    <p className="text-muted-foreground text-sm line-clamp-3">{training.description}</p>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button asChild className="w-full" style={{ backgroundColor: primaryColor }}>
                                                        <Link href={`/dashboard/e-learning/path/${training.id}`}>Voir le programme</Link>
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
