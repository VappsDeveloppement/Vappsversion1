import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const otherProducts = [
    {
        id: "shop-product-1",
        title: "Pack de Contrats",
    },
    {
        id: "shop-product-2",
        title: "Stratégies Marketing",
    },
    {
        id: "shop-product-3",
        title: "Modèles de Facturation",
    },
];

export function ShopSection() {
    const featuredImage = PlaceHolderImages.find(p => p.id === 'shop-featured-product');

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Boutique</h2>
                    <p className="text-lg text-muted-foreground mt-2">Ressources et outils pour accélérer votre développement.</p>
                </div>

                <div className="mb-24">
                    <Card className="overflow-hidden shadow-lg border-green-500/20">
                        <div className="grid grid-cols-1 md:grid-cols-2">
                             <div className="relative min-h-[250px] md:min-h-full">
                                {featuredImage && (
                                    <Image
                                        src={featuredImage.imageUrl}
                                        alt={featuredImage.description}
                                        fill
                                        className="object-cover"
                                        data-ai-hint={featuredImage.imageHint}
                                    />
                                )}
                            </div>
                            <div className="flex flex-col justify-center p-8">
                                <h3 className="font-bold text-2xl mb-2">Produit du moment</h3>
                                <p className="text-muted-foreground mb-4">La ressource indispensable pour lancer votre agence sur les chapeaux de roues.</p>
                                <div className="flex items-center gap-4">
                                    <p className="text-3xl font-bold text-green-600">49€</p>
                                    <Button className="bg-green-500 hover:bg-green-600 text-white font-bold">Voir le produit</Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="text-center mb-12">
                    <h3 className="text-2xl lg:text-3xl font-bold">Découvrez nos autres produits</h3>
                    <p className="text-muted-foreground mt-2">Des ressources complémentaires pour exceller dans chaque aspect de votre agence.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {otherProducts.map((product) => {
                        const image = PlaceHolderImages.find(p => p.id === product.id);
                        return (
                            <Card key={product.id} className="overflow-hidden group flex flex-col">
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
                                    <h4 className="font-bold text-xl mb-4">{product.title}</h4>
                                    <div className="mt-auto">
                                      <Button variant="outline" className="w-full">Découvrir</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
