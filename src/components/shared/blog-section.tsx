import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const articles = [
    {
        id: "blog-article-1",
        title: "Titre de l'article 1",
        description: "Un bref résumé du contenu de ce premier article de blog.",
    },
    {
        id: "blog-article-2",
        title: "Titre de l'article 2",
        description: "Un bref résumé du contenu de ce deuxième article de blog.",
    },
    {
        id: "blog-article-3",
        title: "Titre de l'article 3",
        description: "Un bref résumé du contenu de ce troisième article de blog.",
    },
];

export function BlogSection() {
    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">Le Blog</h2>
                    <p className="text-lg text-muted-foreground mt-2">
                        Retrouvez nos derniers articles, conseils et actualités.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                    {articles.map((article) => {
                        const image = PlaceHolderImages.find((p) => p.id === article.id);
                        return (
                            <Card key={article.id} className="overflow-hidden group flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-300">
                                {image && (
                                    <div className="h-48 relative overflow-hidden">
                                        <Image
                                            src={image.imageUrl}
                                            alt={image.description}
                                            fill
                                            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                            data-ai-hint={image.imageHint}
                                        />
                                    </div>
                                )}
                                <CardContent className="p-6 flex-1 flex flex-col">
                                    <h3 className="font-bold text-xl mb-2">{article.title}</h3>
                                    <p className="text-muted-foreground text-sm mb-4">{article.description}</p>
                                    <Link href="#" className="text-secondary font-semibold text-sm mt-auto flex items-center gap-1 group-hover:underline">
                                        Lire la suite
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
                
                <div className="text-center">
                    <Button size="lg" className="font-bold">
                        Plus d'articles
                    </Button>
                </div>
            </div>
        </section>
    );
}

    
