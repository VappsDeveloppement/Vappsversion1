'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useAgency } from '@/context/agency-provider';
import { Skeleton } from '../ui/skeleton';
import { ArrowRight, Search, Tag } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import Image from 'next/image';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

type BlogCategory = {
    id: string;
    name: string;
};

type Article = {
    id: string;
    title: string;
    content: string;
    imageUrl?: string | null;
    authorId: string;
    authorName: string;
    categoryId: string;
    categoryName: string;
    status: 'draft' | 'pending' | 'published' | 'rejected';
    createdAt: any;
    publishedAt?: any;
};

function ArticleCard({ article }: { article: Article }) {
    const { personalization } = useAgency();
    const primaryColor = personalization?.primaryColor || '#10B981';

    const excerpt = article.content.replace(/<[^>]+>/g, '').substring(0, 100) + '...';

    return (
        <CarouselItem className="md:basis-1/2 lg:basis-1/3">
            <div className="p-1 h-full">
                <Card className="flex flex-col h-full overflow-hidden group shadow-sm hover:shadow-lg transition-shadow duration-300">
                    <div className="h-48 relative overflow-hidden">
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
                    </div>
                    <CardHeader>
                        <Badge variant="secondary" className="w-fit mb-2">{article.categoryName || 'Non classé'}</Badge>
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

export function BlogSection() {
    const firestore = useFirestore();
    const { personalization, isLoading: isAgencyLoading } = useAgency();

    // Local state to prevent server-side execution of hooks
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
      setIsClient(true);
    }, []);

    const [titleFilter, setTitleFilter] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

    const categoriesQuery = useMemoFirebase(() => isClient ? collection(firestore, 'blog_categories') : null, [firestore, isClient]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<BlogCategory>(categoriesQuery);

    const publishedArticlesQuery = useMemoFirebase(() => {
        return isClient ? query(collection(firestore, 'articles'), where('status', '==', 'published')) : null;
    }, [firestore, isClient]);

    const { data: publishedArticles, isLoading: areArticlesLoading } = useCollection<Article>(publishedArticlesQuery);
    
    const articlesWithCategory = useMemo(() => {
        if (!publishedArticles || !categories) return [];
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        return publishedArticles.map(article => ({
            ...article,
            categoryName: categoryMap.get(article.categoryId) || 'Non classé',
        }));
    }, [publishedArticles, categories]);

    const filteredArticles = useMemo(() => {
        return articlesWithCategory.filter(article => {
            const titleMatch = titleFilter ? article.title.toLowerCase().includes(titleFilter.toLowerCase()) : true;
            const categoryMatch = selectedCategoryId ? article.categoryId === selectedCategoryId : true;
            return titleMatch && categoryMatch;
        });
    }, [articlesWithCategory, titleFilter, selectedCategoryId]);

    const selectedCategoryName = useMemo(() => {
        if (!selectedCategoryId || !categories) return "Toutes les catégories";
        return categories.find(c => c.id === selectedCategoryId)?.name || "Toutes les catégories";
    }, [selectedCategoryId, categories]);

    const isLoading = isAgencyLoading || areCategoriesLoading || areArticlesLoading;

    if (!personalization.blogSection?.enabled && !isLoading) {
        return null;
    }
    
    if (isLoading && !isClient) {
       return (
            <section className="bg-background text-foreground py-16 sm:py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12"><Skeleton className="h-10 w-1/3 mx-auto" /></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => <Card key={i}><Skeleton className="h-64 w-full" /></Card>)}
                    </div>
                </div>
            </section>
        );
    }


    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{personalization.blogSection.title || "Notre Blog"}</h2>
                    <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
                        {personalization.blogSection.description || "Retrouvez nos derniers articles, conseils et actualités."}
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-12 max-w-2xl mx-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par titre..."
                            className="pl-10"
                            value={titleFilter}
                            onChange={(e) => setTitleFilter(e.target.value)}
                        />
                    </div>
                    <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                        <PopoverTrigger asChild>
                             <Button variant="outline" role="combobox" aria-expanded={isCategoryPopoverOpen} className="w-full md:w-[250px] justify-between">
                                <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4"/>
                                    <span className="truncate">{selectedCategoryName}</span>
                                </div>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0">
                             <Command>
                                <CommandInput placeholder="Chercher une catégorie..." />
                                <CommandList>
                                    <CommandEmpty>Aucune catégorie trouvée.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem onSelect={() => { setSelectedCategoryId(null); setIsCategoryPopoverOpen(false); }}>
                                            Toutes les catégories
                                        </CommandItem>
                                        {categories?.map((category) => (
                                            <CommandItem key={category.id} onSelect={() => { setSelectedCategoryId(category.id); setIsCategoryPopoverOpen(false); }}>
                                                {category.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {isLoading ? (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => <Card key={i}><Skeleton className="h-64 w-full" /></Card>)}
                    </div>
                ) : filteredArticles.length > 0 ? (
                    <Carousel opts={{ align: "start", loop: filteredArticles.length > 3 }} className="w-full max-w-6xl mx-auto">
                        <CarouselContent className="-ml-4">
                            {filteredArticles.map((article) => <ArticleCard key={article.id} article={article} />)}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                    </Carousel>
                ) : (
                    <div className="text-center text-muted-foreground py-16">
                        <p>Aucun article ne correspond à votre recherche.</p>
                    </div>
                )}
            </div>
        </section>
    );
}