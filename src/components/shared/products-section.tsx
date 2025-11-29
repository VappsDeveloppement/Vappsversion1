

'use client';

import Image from "next/image";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Product } from "@/app/dashboard/aura/page";

type CounselorProfile = {
    publicProfileName?: string;
    id: string; // Add id to counselor profile
    miniSite?: {
        productsSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            description?: string;
            buttonText?: string;
            buttonLink?: string;
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    };
};

export function ProductsSection({ counselor, products }: { counselor: CounselorProfile, products: Product[] }) {
    const productsConfig = counselor.miniSite?.productsSection;
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    if (!productsConfig?.enabled) {
        return null;
    }

    const { title, subtitle, description, buttonText, buttonLink } = productsConfig;
    
    // Filter for featured products only
    const featuredProducts = products.filter((product: Product) => product.isFeatured);

    if (featuredProducts.length === 0) {
        return null; // Don't render the section if there are no featured products
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
                <div className="max-w-6xl mx-auto">
                     {featuredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {featuredProducts.map((product) => {
                                const ctaLink = product.ctaLink;
                                const target = '_blank';
                                
                                return (
                                    <Card key={product.id} className="overflow-hidden group flex flex-col shadow-md hover:shadow-xl transition-shadow duration-300">
                                        {(product.versions && product.versions.length > 0 && product.versions[0].imageUrl) ? (
                                            <div className="w-full h-48 relative overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={product.versions[0].imageUrl}
                                                    alt={product.title}
                                                    fill
                                                    className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-48 bg-muted flex-shrink-0" />
                                        )}
                                        <div className="flex flex-col flex-1 p-4">
                                            <CardHeader className="p-0 mb-2">
                                                <CardTitle className="line-clamp-2 text-lg">{product.title}</CardTitle>
                                                {(product.versions && product.versions.length > 0 && product.versions[0].price != null) && (
                                                    <p className="text-xl font-bold" style={{ color: primaryColor }}>
                                                        {product.versions[0].price}€
                                                    </p>
                                                )}
                                            </CardHeader>
                                            <CardContent className="p-0 flex-1 mb-4">
                                                <p className="text-muted-foreground text-sm line-clamp-3">{product.description}</p>
                                            </CardContent>
                                            <CardFooter className="p-0 mt-auto">
                                                {ctaLink && (
                                                    <Button asChild className="w-full font-bold" style={{ backgroundColor: primaryColor }}>
                                                       <Link href={ctaLink} target={target}>Voir le produit</Link>
                                                    </Button>
                                                )}
                                            </CardFooter>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                     ) : (
                        <div className="text-center text-muted-foreground py-16 col-span-2">
                            <p>Aucun produit mis en vedette pour le moment.</p>
                        </div>
                     )}
                </div>

                 {buttonText && buttonLink && (
                    <div className="text-center mt-12">
                        <Button size="lg" asChild>
                            <Link href={buttonLink} target="_blank">{buttonText}</Link>
                        </Button>
                    </div>
                 )}
            </div>
        </section>
    );
}
    
