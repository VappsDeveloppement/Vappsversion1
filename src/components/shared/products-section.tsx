
'use client';

import Image from "next/image";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ProductItem } from "@/app/dashboard/settings/mini-site/page";

type CounselorProfile = {
    miniSite?: {
        productsSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            description?: string;
            products?: ProductItem[];
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    };
};

export function ProductsSection({ counselor }: { counselor: CounselorProfile }) {
    const productsConfig = counselor.miniSite?.productsSection;
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    if (!productsConfig?.enabled || !productsConfig.products || productsConfig.products.length === 0) {
        return null;
    }

    const { title, subtitle, description, products } = productsConfig;
    
    // Filter for featured products only
    const featuredProducts = products.filter((product: any) => product.isFeatured);

    if (featuredProducts.length === 0) {
        return null; // Don't render the section if no products are featured
    }

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title || "Nos Produits"}</h2>
                    {subtitle && <p className="text-lg font-semibold mt-2" style={{ color: primaryColor }}>{subtitle}</p>}
                    {description && <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{description}</p>}
                </div>

                {/* Main Content with Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left Column (for future categories) */}
                    <aside className="lg:col-span-1">
                        {/* This column is reserved for future category navigation */}
                        <div className="sticky top-24">
                           {/* You can add a placeholder or a title here if you want */}
                           {/* <h3 className="font-semibold mb-4">Catégories</h3> */}
                        </div>
                    </aside>

                    {/* Right Column (Products Grid) */}
                    <div className="lg:col-span-2">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {featuredProducts.map((product) => (
                                <Card key={product.id} className="overflow-hidden group flex flex-col shadow-md hover:shadow-xl transition-shadow duration-300">
                                    {product.imageUrl && (
                                        <div className="h-48 relative overflow-hidden">
                                            <Image
                                                src={product.imageUrl}
                                                alt={product.title}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                            />
                                        </div>
                                    )}
                                    <CardHeader>
                                        <CardTitle>{product.title}</CardTitle>
                                        {product.price != null && (
                                            <p className="text-xl font-bold" style={{ color: primaryColor }}>
                                                {product.price}€
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <p className="text-muted-foreground text-sm">{product.description}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button as="a" href={product.ctaLink || '#'} target="_blank" className="w-full font-bold" style={{ backgroundColor: primaryColor }}>
                                            {product.ctaText || 'Voir le produit'}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Centered Button at the bottom */}
                <div className="text-center mt-16">
                    <Button asChild size="lg">
                        <Link href="/boutique">Voir la boutique</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
    