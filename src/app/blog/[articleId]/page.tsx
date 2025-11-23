
'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Calendar, Edit, Facebook, Home, Linkedin, Loader2, Twitter, User } from 'lucide-react';
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

// We need the author's public profile name to link back to their page
type AuthorProfile = {
    miniSite?: {
        publicProfileName?: string;
    }
}

export default function ArticleDisplayPage() {
    const params = useParams();
    const articleId = params.articleId as string;
    const firestore = useFirestore();
    const router = useRouter();

    const articleRef = useMemoFirebase(
        () => (articleId ? doc(firestore, 'articles', articleId) : null),
        [firestore, articleId]
    );
    const { data: article, isLoading, error } = useDoc<Article>(articleRef);
    
    // Fetch category name separately
    const categoryRef = useMemoFirebase(
        () => (article?.categoryId ? doc(firestore, 'blog_categories', article.categoryId) : null),
        [firestore, article]
    );
    const { data: category } = useDoc(categoryRef);
    
    // NEW: Fetch author's public profile to get the link
    const authorProfileRef = useMemoFirebase(
        () => (article?.authorId ? doc(firestore, 'minisites', article.authorId) : null),
        [firestore, article]
    );
    const { data: authorProfile } = useDoc<AuthorProfile>(authorProfileRef);


    const fullArticle = useMemo(() => {
        if (!article) return null;
        return {
            ...article,
            categoryName: category?.name || 'Non classé',
        };
    }, [article, category]);
    
    const shareOnSocial = (platform: 'twitter' | 'facebook' | 'linkedin') => {
        const url = window.location.href;
        const text = `Découvrez cet article intéressant : ${fullArticle?.title}`;
        let shareUrl = '';

        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(fullArticle?.title || '')}&summary=${encodeURIComponent(text)}`;
                break;
        }
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    };
    
    const authorPublicProfileUrl = authorProfile?.miniSite?.publicProfileName 
        ? `/c/${authorProfile.miniSite.publicProfileName}` 
        : null;

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-4xl py-12 px-4">
                <Skeleton className="h-10 w-3/4 mb-4" />
                <Skeleton className="h-6 w-1/2 mb-8" />
                <Skeleton className="w-full aspect-video rounded-lg mb-8" />
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
        );
    }

    if (error || !fullArticle || fullArticle.status !== 'published') {
        return (
            <div className="container mx-auto max-w-4xl py-12 px-4 text-center">
                <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Article non trouvé</h1>
                <p className="text-muted-foreground mt-2">
                    L'article que vous cherchez n'existe pas, n'est plus disponible ou n'a pas encore été publié.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/">Retour à l'accueil</Link>
                </Button>
            </div>
        );
    }
    
    const publishedDate = fullArticle.publishedAt 
        ? new Date(fullArticle.publishedAt.seconds * 1000).toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric'
          })
        : 'Date non disponible';
        
    const AuthorNameDisplay = () => {
        const content = (
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={fullArticle.authorPhotoUrl || undefined} alt={fullArticle.authorName} />
                    <AvatarFallback>{fullArticle.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>Par {fullArticle.authorName}</span>
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
                        <Badge variant="secondary" className="mb-4">{fullArticle.categoryName}</Badge>
                        <h1 className="text-4xl lg:text-5xl font-bold font-headline leading-tight mb-4">{fullArticle.title}</h1>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground">
                           <AuthorNameDisplay />
                            <span className="hidden sm:inline">|</span>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Publié le {publishedDate}</span>
                            </div>
                        </div>
                    </header>

                    {fullArticle.imageUrl && (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
                            <Image
                                src={fullArticle.imageUrl}
                                alt={fullArticle.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}

                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: fullArticle.content }} />
                    
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
