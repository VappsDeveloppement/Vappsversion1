
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
import { useAgency } from "@/context/agency-provider";
import { Badge } from "../ui/badge";

type TrainingWithCategory = Training & { categoryName?: string, type?: 'internal' | 'external', externalUrl?: string, financingOptions?: string[] };
type Category = { id: string; name: string; };

interface TrainingCatalogSectionProps {
    primaryColor?: string;
    counselorId: string;
    sectionData?: {
        title?: string;
        subtitle?: string;
    }
}

export function TrainingCatalogSection({ sectionData, counselorId, primaryColor: propPrimaryColor }: TrainingCatalogSectionProps) {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const { personalization } = useAgency();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const primaryColor = propPrimaryColor || personalization?.primaryColor || '#10B981';
    const title = sectionData?.title || "Catalogue des Formations";
    const description = sectionData?.subtitle || "Montez en compétences avec nos formations conçues pour les professionnels.";

    const trainingsQuery = useMemoFirebase(() => {
        if (!isClient || !counselorId) return null;
        return query(
            collection(firestore, 'trainings'), 
            where('isPublic', '==', true),
            where('authorId', '==', counselorId)
        );
    }, [firestore, isClient, counselorId]);

    const { data: trainings, isLoading: areTrainingsLoading } = useCollection<TrainingWithCategory>(trainingsQuery);
    
    const categoriesQuery = useMemoFirebase(() => {
        if (!isClient || !counselorId) return null;
        return query(
            collection(firestore, 'training_categories'), 
            where('counselorId', '==', counselorId)
        );
    }, [firestore, isClient, counselorId]);
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

    return (
        <section className="bg-muted/30 text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    <p className="text-lg text-muted-foreground mt-2">
                        {description}
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
                                const isExternal = training.type === 'external';
                                const linkHref = isExternal ? (training.externalUrl || '#') : `/training/${training.id}`;
                                const linkTarget = isExternal ? '_blank' : '_self';
                                
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
                                                    {training.financingOptions && training.financingOptions.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 pt-2">
                                                            {training.financingOptions.map(option => (
                                                                <Badge key={option} variant="secondary">{option}</Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardHeader>
                                                <CardContent className="flex-1">
                                                    <p className="text-muted-foreground text-sm line-clamp-3">{training.description}</p>
                                                </CardContent>
                                                <CardFooter>
                                                    <Button asChild className="w-full" style={{ backgroundColor: primaryColor }}>
                                                        <Link href={linkHref} target={linkTarget}>
                                                            Voir le programme
                                                        </Link>
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
