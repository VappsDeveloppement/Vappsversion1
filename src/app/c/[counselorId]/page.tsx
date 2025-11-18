

'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { CounselorHero } from '@/components/shared/counselor-hero';
import { AboutMeSection } from '@/components/shared/about-me-section';
import { AttentionSection } from '@/components/shared/attention-section';
import { InterestsSection } from '@/components/shared/interests-section';
import { CounselorServicesSection } from '@/components/shared/counselor-services-section';
import { CounselorCtaSection } from '@/components/shared/counselor-cta-section';
import { CounselorPricingSection } from '@/components/shared/counselor-pricing-section';
import { CounselorContactSection } from '@/components/shared/counselor-contact-section';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

type CounselorProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    publicTitle?: string;
    publicBio?: string;
    photoUrl?: string;
    miniSite?: any;
    agencyInfo?: {
        copyrightText?: string;
        copyrightUrl?: string;
    }
};


export default function CounselorPublicProfilePage() {
  const params = useParams();
  const counselorId = params.counselorId as string;
  const firestore = useFirestore();

  const counselorDocRef = useMemoFirebase(() => {
    if (!counselorId) return null;
    // Fetch from the new 'minisites' collection
    return doc(firestore, 'minisites', counselorId);
  }, [firestore, counselorId]);

  const { data: counselor, isLoading, error } = useDoc<CounselorProfile>(counselorDocRef);

  React.useEffect(() => {
    // No longer need to check for role. If the doc doesn't exist, useDoc will handle it.
    if (!isLoading && !counselor) {
      notFound();
    }
  }, [isLoading, counselor]);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Chargement du profil...</p>
        </div>
    );
  }

  if (!counselor) {
    return null; 
  }

  const showAttentionSection = counselor.miniSite?.attentionSection?.enabled !== false;
  const showAboutSection = counselor.miniSite?.aboutSection?.enabled !== false;
  const showInterestsSection = counselor.miniSite?.interestsSection?.enabled !== false;
  const showServicesSection = counselor.miniSite?.servicesSection?.enabled !== false;
  const showCtaSection = counselor.miniSite?.ctaSection?.enabled !== false;
  const showPricingSection = counselor.miniSite?.pricingSection?.enabled !== false;
  const showContactSection = counselor.miniSite?.contactSection?.enabled !== false;

  const copyrightText = counselor.agencyInfo?.copyrightText || "Vapps.";
  const copyrightUrl = counselor.agencyInfo?.copyrightUrl || "/";
  const footerBgColor = counselor.miniSite?.hero?.bgColor || '#f1f5f9';
  const primaryColor = counselor.miniSite?.hero?.primaryColor || '#10B981';

  return (
    <div className="bg-muted/30 min-h-screen">
      <CounselorHero counselor={counselor} />
      <main>
        {showAttentionSection && <AttentionSection counselor={counselor} />}
        {showAboutSection && <AboutMeSection counselor={counselor} />}
        {showInterestsSection && <InterestsSection counselor={counselor} />}
        {showServicesSection && <CounselorServicesSection counselor={counselor} />}
        {showCtaSection && <CounselorCtaSection counselor={counselor} />}
        {showPricingSection && <CounselorPricingSection counselor={counselor} />}
        {showContactSection && <CounselorContactSection counselor={counselor} />}
      </main>
      <footer className="py-6 text-center text-sm" style={{ backgroundColor: footerBgColor }}>
        <p className="text-muted-foreground">© {new Date().getFullYear()} - <Link href={copyrightUrl} className="hover:underline" style={{color: primaryColor}}>{copyrightText}</Link></p>
      </footer>
    </div>
  );
}

    