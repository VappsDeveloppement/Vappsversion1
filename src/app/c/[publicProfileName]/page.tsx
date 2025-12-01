
import React from 'react';
import { notFound } from 'next/navigation';
import { initializeFirebase } from '@/firebase/server';
import { collection, query, where, getDocs, limit, doc } from 'firebase/firestore';
import type { Product, JobOffer } from '@/lib/types';
import { CounselorPublicPageClient } from '@/components/shared/counselor-public-page';

async function getCounselorData(publicProfileName: string) {
    const { firestore } = initializeFirebase();

    // 1. Find counselor in 'minisites'
    const minisiteQuery = query(
        collection(firestore, 'minisites'),
        where("miniSite.publicProfileName", "==", publicProfileName),
        limit(1)
    );

    const counselorSnapshot = await getDocs(minisiteQuery);

    if (counselorSnapshot.empty) {
        return null;
    }

    const counselorDoc = counselorSnapshot.docs[0];
    const counselor = { id: counselorDoc.id, ...counselorDoc.data() };

    // 2. Fetch job offers
    const jobOffersQuery = query(collection(firestore, `users/${counselor.id}/job_offers`));
    const jobOffersSnapshot = await getDocs(jobOffersQuery);
    const jobOffers = jobOffersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JobOffer[];

    // 3. Fetch products
    const productsQuery = query(collection(firestore, 'products'), where('counselorId', '==', counselor.id));
    const productsSnapshot = await getDocs(productsQuery);
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];

    return { counselor, jobOffers, products };
}


export default async function CounselorPublicProfilePage({ params }: { params: { publicProfileName: string } }) {
    const { publicProfileName } = params;
    const data = await getCounselorData(publicProfileName);

    if (!data) {
        notFound();
    }

    const { counselor, jobOffers, products } = data;

    return (
        <CounselorPublicPageClient
            counselor={counselor}
            jobOffers={jobOffers}
            products={products}
        />
    );
}
