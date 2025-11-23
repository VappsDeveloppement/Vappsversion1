
'use client';

import React, { useMemo } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';

type Article = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  categoryId: string;
  status: 'published';
  publishedAt?: any;
};

type CounselorProfile = {
    id: string;
    miniSite?: {
        blogSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    }
};

function ArticleCard({ article, primaryColor }: { article: Article, primaryColor: string }) {
    const excerpt = article.content.replace(/<[^>]+>/g, '').substring(0, 100) + '...';

    return (
        <CarouselItem className="md:basis-1/2 lg:basis-1/3">
            <div className="p-1 h-full">
                <Card className="flex flex-col h-full overflow-hidden group shadow-sm hover:shadow-lg transition-shadow duration-300">
                    <Link href={`/blog/${article.id}`} className="block h-48 relative overflow-hidden">
                        {article.imageUrl ? (
                            <Image
                                src={article.imageUrl}
                                alt={article.title}
                                fill
                                className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                            />
                        ) : (
                            <div className="h-full bg-muted flex items-center justify-center">
                                <span className="text-muted-foreground text-sm">Pas d'image</span>
                            </div>
                        )}
                    </Link>
                    <CardHeader>
                        <CardTitle className="line-clamp-2 h-14">{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-muted-foreground text-sm line-clamp-3">{excerpt}</p>
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="ghost" className="w-full justify-start p-0" style={{color: primaryColor}}>
                            <Link href={`/blog/${article.id}`}>
                                Lire la suite <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </CarouselItem>
    );
}

export function CounselorBlogSection({ counselor }: { counselor: CounselorProfile }) {
    const firestore = useFirestore();
    const blogConfig = counselor.miniSite?.blogSection;
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    const articlesQuery = useMemoFirebase(() => {
        return query(
            collection(firestore, 'articles'),
            where('authorId', '==', counselor.id),
            where('status', '==', 'published')
        );
    }, [firestore, counselor.id]);

    const { data: articles, isLoading } = useCollection<Article>(articlesQuery);

    if (!blogConfig?.enabled || !articles || articles.length === 0) {
        return null;
    }

    return (
        <section className="py-16 sm:py-24 bg-muted/50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{blogConfig.title || "Mes Derniers Articles"}</h2>
                    {blogConfig.subtitle && <p className="text-lg mt-2" style={{ color: primaryColor }}>{blogConfig.subtitle}</p>}
                </div>

                {isLoading ? (
                    <p>Chargement...</p>
                ) : (
                    <Carousel
                        opts={{
                            align: "start",
                            loop: articles.length > 3,
                        }}
                        className="w-full max-w-6xl mx-auto"
                    >
                        <CarouselContent className="-ml-4">
                            {articles.map((article) => (
                                <ArticleCard key={article.id} article={article} primaryColor={primaryColor} />
                            ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                )}
            </div>
        </section>
    );
}

    