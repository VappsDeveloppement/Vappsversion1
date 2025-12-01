
'use client';

import React from 'react';
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
    miniSite?: {
        publicProfileName?: string;
        hero?: any;
        attentionSection?: any;
        aboutSection?: any;
        servicesSection?: any;
        parcoursSection?: any;
        ctaSection?: any;
        pricingSection?: any;
        testimonialsSection?: any;
        activitiesSection?: any;
        jobOffersSection?: any;
        contactSection?: any;
        blogSection?: any;
        productsSection?: any;
        trainingCatalogSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
        };
    };
    dashboardTheme?: {
        primaryColor?: string;
    }
};

interface CounselorPublicPageClientProps {
    counselor: CounselorProfile;
    products: Product[];
}

export function CounselorPublicPageClient({ counselor, products }: CounselorPublicPageClientProps) {
  
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
        <CounselorJobOffersSection counselor={counselor} />
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
