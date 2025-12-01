

import React from 'react';
import { notFound } from 'next/navigation';
import { initializeFirebase } from '@/firebase/server';
import { collection, query, where, limit, getDocs, doc } from 'firebase/firestore';
import { CounselorPublicPageClient } from '@/components/shared/counselor-public-page';
import type { Product } from '@/app/dashboard/aura/page';

type CounselorProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    publicTitle?: string;
    publicBio?: string;
    photoUrl?: string;
    phone?: string;
    city?: string;
    address?: string;
    zipCode?: string;
    commercialName?: string;
    siret?: string;
    miniSite?: any;
    dashboardTheme?: {
        primaryColor?: string;
    }
};


async function getCounselorData(publicProfileName: string) {
    if (!publicProfileName) return null;
    const { firestore } = initializeFirebase();

    const counselorQuery = query(
        collection(firestore, 'minisites'),
        where("miniSite.publicProfileName", "==", publicProfileName),
        limit(1)
    );
    
    const counselorSnapshot = await getDocs(counselorQuery);

    if (counselorSnapshot.empty) {
        return null;
    }

    const counselorDoc = counselorSnapshot.docs[0];
    const counselor = { id: counselorDoc.id, ...counselorDoc.data() } as CounselorProfile;
    
    // Fetch products separately
    const productsQuery = query(collection(firestore, 'products'), where('counselorId', '==', counselor.id));
    const productsSnapshot = await getDocs(productsQuery);
    const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

    return { counselor, products };
}

export default async function CounselorPublicProfilePage({ params }: { params: { publicProfileName: string } }) {
  const data = await getCounselorData(params.publicProfileName);

  if (!data) {
    notFound();
  }

  return <CounselorPublicPageClient counselor={data.counselor} products={data.products} />;
}
