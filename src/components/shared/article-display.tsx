
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Calendar, Home, Linkedin, Facebook, Twitter, User } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Article = {
    id: string;
    title: string;
    content: string;
    imageUrl?: string | null;
    authorId: string;
    authorName: string;
    authorPhotoUrl?: string | null;
    categoryId: string;
    categoryName: string;
    status: 'draft' | 'pending' | 'published' | 'rejected';
    publishedAt?: {
        seconds: number;
        nanoseconds: number;
    };
};

type AuthorProfile = {
    miniSite?: {
        publicProfileName?: string;
    }
} | null;

interface ArticleDisplayProps {
    article: Article;
    authorProfile: AuthorProfile;
}

export function ArticleDisplay({ article, authorProfile }: ArticleDisplayProps) {
    const router = useRouter();

    const shareOnSocial = (platform: 'twitter' | 'facebook' | 'linkedin') => {
        const url = window.location.href;
        const text = `Découvrez cet article intéressant : ${article?.title}`;
        let shareUrl = '';

        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(article?.title || '')}&summary=${encodeURIComponent(text)}`;
                break;
        }
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    };

    const authorPublicProfileUrl = authorProfile?.miniSite?.publicProfileName
        ? `/c/${authorProfile.miniSite.publicProfileName}`
        : null;

    const publishedDate = article.publishedAt
        ? new Date(article.publishedAt.seconds * 1000).toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric'
        })
        : 'Date non disponible';

    const AuthorNameDisplay = () => {
        const content = (
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={article.authorPhotoUrl || undefined} alt={article.authorName} />
                    <AvatarFallback>{article.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>Par {article.authorName}</span>
            </div>
        );

        if (authorPublicProfileUrl) {
            return <Link href={authorPublicProfileUrl} className="hover:underline">{content}</Link>;
        }
        return content;
    };

    return (
        <div className="bg-background">
            <div className="container mx-auto max-w-4xl py-12 px-4">
                <article>
                    <header className="mb-8">
                        <Badge variant="secondary" className="mb-4">{article.categoryName}</Badge>
                        <h1 className="text-4xl lg:text-5xl font-bold font-headline leading-tight mb-4">{article.title}</h1>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground">
                           <AuthorNameDisplay />
                            <span className="hidden sm:inline">|</span>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Publié le {publishedDate}</span>
                            </div>
                        </div>
                    </header>

                    {article.imageUrl && (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
                            <Image
                                src={article.imageUrl}
                                alt={article.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}

                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />

                    <footer className="mt-12 pt-8 border-t">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold">Partager :</h4>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="icon" onClick={() => shareOnSocial('twitter')}>
                                        <Twitter className="h-4 w-4" />
                                        <span className="sr-only">Partager sur Twitter</span>
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => shareOnSocial('facebook')}>
                                        <Facebook className="h-4 w-4" />
                                        <span className="sr-only">Partager sur Facebook</span>
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => shareOnSocial('linkedin')}>
                                        <Linkedin className="h-4 w-4" />
                                        <span className="sr-only">Partager sur LinkedIn</span>
                                    </Button>
                                </div>
                            </div>
                           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <Button asChild variant="outline">
                                    <Link href="/">
                                        <Home className="mr-2 h-4 w-4"/>
                                        Retour au site
                                    </Link>
                               </Button>
                               {authorPublicProfileUrl && (
                                   <Button asChild>
                                       <Link href={authorPublicProfileUrl}>
                                           <User className="mr-2 h-4 w-4"/>
                                           Voir le profil du conseiller
                                       </Link>
                                   </Button>
                               )}
                           </div>
                        </div>
                    </footer>
                </article>
            </div>
        </div>
    );
}
