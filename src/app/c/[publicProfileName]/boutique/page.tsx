

'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product as ProductType } from '@/app/dashboard/aura/page';


type CounselorProfile = {
    id: string;
    firstName: string;
    lastName: string;
    publicProfileName: string;
    dashboardTheme?: {
        primaryColor?: string;
    };
};

export default function CounselorBoutiquePage() {
    const params = useParams();
    const { publicProfileName } = params;
    const firestore = useFirestore();

    const counselorQuery = useMemoFirebase(() => {
        if (!publicProfileName || !firestore) return null;
        return query(
            collection(firestore, 'minisites'), 
            where("miniSite.publicProfileName", "==", publicProfileName), 
            limit(1)
        );
    }, [publicProfileName, firestore]);

    const { data: counselors, isLoading: isCounselorLoading } = useCollection<CounselorProfile>(counselorQuery);
    const counselor = counselors?.[0];

    const productsQuery = useMemoFirebase(() => {
        if (!counselor?.id) return null;
        return query(
            collection(firestore, 'products'),
            where('counselorId', '==', counselor.id)
        );
    }, [firestore, counselor?.id]);

    const { data: products, isLoading: areProductsLoading } = useCollection<ProductType>(productsQuery);

    const isLoading = isCounselorLoading || areProductsLoading;
    const primaryColor = counselor?.dashboardTheme?.primaryColor || '#10B981';

    if (isLoading) {
        return (
            <div className="container mx-auto py-12 px-4">
                <Skeleton className="h-8 w-48 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i}><Skeleton className="h-80 w-full" /></Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!counselor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-muted">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Conseiller non trouvé</h1>
                <p className="text-muted-foreground mt-2">
                    Le profil que vous cherchez n'existe pas ou le lien est incorrect.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/">Retour à l'accueil</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <div className="bg-muted/20 min-h-screen">
            <div className="container mx-auto py-12 px-4">
                <Button asChild variant="ghost" className="mb-8">
                    <Link href={`/c/${publicProfileName}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour au profil de {counselor.firstName} {counselor.lastName}
                    </Link>
                </Button>

                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline">Boutique</h1>
                    <p className="text-lg text-muted-foreground mt-2">
                        Découvrez tous les produits proposés par {counselor.firstName} {counselor.lastName}.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products && products.length > 0 ? (
                        products.map((product) => {
                            const ctaLink = product.ctaLink || '#';
                            const target = product.ctaLink ? '_blank' : '_self';
                            return (
                                <Card key={product.id} className="overflow-hidden group flex flex-col shadow-md hover:shadow-xl transition-shadow duration-300">
                                    {(product.versions && product.versions.length > 0 && product.versions[0].imageUrl) && (
                                        <div className="h-48 relative overflow-hidden">
                                            <Image
                                                src={product.versions[0].imageUrl}
                                                alt={product.title}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                            />
                                        </div>
                                    )}
                                    <CardHeader>
                                        <CardTitle>{product.title}</CardTitle>
                                        {(product.versions && product.versions.length > 0 && product.versions[0].price != null) && (
                                            <p className="text-xl font-bold" style={{ color: primaryColor }}>
                                                {product.versions[0].price}€
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <p className="text-muted-foreground text-sm">{product.description}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button as="a" href={ctaLink} target={target} className="w-full font-bold" style={{ backgroundColor: primaryColor }}>
                                            Voir le produit
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })
                    ) : (
                        <p className="col-span-full text-center text-muted-foreground py-16">
                            Cette boutique est vide pour le moment.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
