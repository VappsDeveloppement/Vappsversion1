import React from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/server';
import { ArticleDisplay } from '@/components/shared/article-display';
import { notFound } from 'next/navigation';

type Article = {
    id: string;
    title: string;
    content: string;
    imageUrl?: string | null;
    authorId: string;
    authorName: string;
    authorPhotoUrl?: string | null;
    categoryId: string;
    status: 'draft' | 'pending' | 'published' | 'rejected';
    publishedAt?: string;
    createdAt: string;
    categoryName?: string;
};

type FirebaseArticle = Omit<Article, 'publishedAt' | 'createdAt'> & {
    publishedAt?: Timestamp;
    createdAt: Timestamp;
}

type Category = {
    name: string;
}

type AuthorProfile = {
    miniSite?: {
        publicProfileName?: string;
    }
} | null;

async function getArticleData(articleId: string) {
    const { firestore } = initializeFirebase();

    const articleRef = doc(firestore, 'articles', articleId);
    const articleSnap = await getDoc(articleRef);

    if (!articleSnap.exists() || articleSnap.data().status !== 'published') {
        return null;
    }

    const firebaseArticle = { id: articleSnap.id, ...articleSnap.data() } as FirebaseArticle;

    const article: Article = {
        ...firebaseArticle,
        createdAt: firebaseArticle.createdAt.toDate().toISOString(),
        publishedAt: firebaseArticle.publishedAt?.toDate().toISOString(),
    };

    let categoryName = 'Non classé';
    if (article.categoryId) {
        const categoryRef = doc(firestore, 'blog_categories', article.categoryId);
        const categorySnap = await getDoc(categoryRef);
        if (categorySnap.exists()) {
            categoryName = (categorySnap.data() as Category).name;
        }
    }

    let authorProfile: AuthorProfile = null;
    if (article.authorId) {
        const authorProfileRef = doc(firestore, 'minisites', article.authorId);
        const authorProfileSnap = await getDoc(authorProfileRef);
        if (authorProfileSnap.exists()) {
            authorProfile = authorProfileSnap.data() as AuthorProfile;
        }
    }
    
    return {
        article: {
            ...article,
            categoryName,
        },
        authorProfile
    };
}


// Explicitly named the function to help Next.js HMR.
export default async function ArticlePage({ params }: { params: { articleId: string } }) {
    const data = await getArticleData(params.articleId);

    if (!data) {
        notFound();
    }

    return <ArticleDisplay article={data.article} authorProfile={data.authorProfile} />;
}
