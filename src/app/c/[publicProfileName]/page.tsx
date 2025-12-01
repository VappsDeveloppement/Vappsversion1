
'use client';

import React from 'react';
import { notFound, useParams } from 'next/navigation';
import { useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, getDocs, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import type { Product, JobOffer } from '@/lib/types';
import { CounselorHero } from '@/components/shared/counselor-hero';
import { AttentionSection } from '@/components/shared/attention-section';
import { AboutMeSection } from '@/components/shared/about-me-section';
import { ParcoursSection } from '@/components/shared/parcours-section';
import Link from 'next/link';
import { CounselorServicesSection } from '@/components/shared/counselor-services-section';
import { CounselorCtaSection } from '@/components/shared/counselor-cta-section';
import { CounselorActivitiesSection } from '@/components/shared/counselor-activities-section';
import { CounselorPricingSection } from '@/components/shared/counselor-pricing-section';
import { CounselorJobOffersSection } from '@/components/shared/counselor-job-offers-section';
import { CounselorContactSection } from '@/components/shared/counselor-contact-section';
import { CounselorTestimonialsSection } from '@/components/shared/counselor-testimonials-section';
import { TrainingCatalogSection } from '@/components/shared/training-catalog-section';
import { ProductsSection } from '@/components/shared/products-section';
import { CounselorBlogSection } from '@/components/shared/counselor-blog-section';
import { Skeleton } from '@/components/ui/skeleton';

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

function CounselorPublicPageLoader() {
    return (
        <div className="space-y-8 p-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
    );
}

export default function CounselorPublicProfilePage() {
    const params = useParams();
    const firestore = useFirestore();
    const { publicProfileName } = params;

    const counselorQuery = useMemoFirebase(() => {
        if (!publicProfileName) return null;
        return query(
            collection(firestore, 'minisites'),
            where("miniSite.publicProfileName", "==", publicProfileName),
            limit(1)
        );
    }, [publicProfileName, firestore]);

    const { data: counselors, isLoading: isCounselorLoading } = useCollection<CounselorProfile>(counselorQuery);
    const counselor = counselors?.[0];

    const productsQuery = useMemoFirebase(() => {
        if (!counselor?.id) return null;
        return query(collection(firestore, 'products'), where('counselorId', '==', counselor.id));
    }, [counselor?.id, firestore]);
    const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

    const jobOffersQuery = useMemoFirebase(() => {
        if (!counselor?.id) return null;
        return query(collection(firestore, `users/${counselor.id}/job_offers`));
    }, [counselor?.id, firestore]);
    const { data: jobOffers, isLoading: areJobOffersLoading } = useCollection<JobOffer>(jobOffersQuery);

    const isLoading = isCounselorLoading || areProductsLoading || areJobOffersLoading;

    if (isLoading) {
        return <CounselorPublicPageLoader />;
    }

    if (!counselor) {
        notFound();
    }

    const copyrightText = "VApps";
    const copyrightUrl = "/";
    const footerBgColor = '#f1f5f9';
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    return (
        <div className="bg-muted/30 min-h-screen">
          <main>
            <CounselorHero counselor={counselor} />
            <AttentionSection counselor={counselor} />
            <AboutMeSection counselor={counselor} />
            <CounselorServicesSection counselor={counselor} />
            <ParcoursSection counselor={counselor} />
            <CounselorPricingSection counselor={counselor} />
            <CounselorJobOffersSection counselor={counselor} jobOffers={jobOffers || []} />
            <CounselorCtaSection counselor={counselor} />
            <CounselorActivitiesSection counselor={counselor} />
            {counselor.miniSite?.trainingCatalogSection?.enabled && (
              <TrainingCatalogSection 
                sectionData={counselor.miniSite.trainingCatalogSection} 
                primaryColor={primaryColor} 
                counselorId={counselor.id} 
              />
            )}
            <ProductsSection counselor={counselor} products={products || []} />
            <CounselorBlogSection counselor={counselor} />
            <CounselorTestimonialsSection counselor={counselor} />
            <CounselorContactSection counselor={counselor} />
          </main>
          <footer className="py-6 text-center text-sm" style={{ backgroundColor: footerBgColor }}>
            <p className="text-muted-foreground">© {new Date().getFullYear()} - <Link href={copyrightUrl} className="hover:underline" style={{color: primaryColor}}>{copyrightText}</Link></p>
          </footer>
        </div>
    );
}
