

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { CounselorHero } from '@/components/shared/counselor-hero';
import { AboutMeSection } from '@/components/shared/about-me-section';
import { AttentionSection } from '@/components/shared/attention-section';
import { InterestsSection } from '@/components/shared/interests-section';
import { CounselorServicesSection } from '@/components/shared/counselor-services-section';
import { CounselorCtaSection } from '@/components/shared/counselor-cta-section';
import { CounselorPricingSection } from '@/components/shared/counselor-pricing-section';
import { CounselorContactSection } from '@/components/shared/counselor-contact-section';
import { useAgency } from '@/context/agency-provider';
import Link from 'next/link';
import { AlertTriangle, Loader2 } from 'lucide-react';


type CounselorProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    publicTitle?: string;
    publicBio?: string;
    photoUrl?: string;
    miniSite?: any;
};


export default function CounselorPublicPage() {
  const params = useParams();
  const counselorId = params.counselorId as string;
  const firestore = useFirestore();
  const { personalization } = useAgency();

  const counselorDocRef = useMemoFirebase(() => {
    if (!counselorId) return null;
    return doc(firestore, 'users', counselorId);
  }, [firestore, counselorId]);

  const { data: counselor, isLoading, error } = useDoc<CounselorProfile>(counselorDocRef);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Chargement du profil...</p>
        </div>
    );
  }

  if (error || !counselor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 text-center p-4">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive">Conseiller introuvable</h1>
        <p className="text-muted-foreground mt-2">Le profil de ce conseiller n'existe pas ou n'est plus disponible.</p>
         <Button asChild className="mt-6">
            <Link href="/">Retour à l'accueil</Link>
        </Button>
      </div>
    );
  }

  const showAttentionSection = counselor.miniSite?.attentionSection?.enabled !== false;
  const showAboutSection = counselor.miniSite?.aboutSection?.enabled !== false;
  const showInterestsSection = counselor.miniSite?.interestsSection?.enabled !== false;
  const showServicesSection = counselor.miniSite?.servicesSection?.enabled !== false;
  const showCtaSection = counselor.miniSite?.ctaSection?.enabled !== false;
  const showPricingSection = counselor.miniSite?.pricingSection?.enabled !== false;
  const showContactSection = counselor.miniSite?.contactSection?.enabled !== false;

  const copyrightText = personalization?.copyrightText || "Vapps.";
  const copyrightUrl = personalization?.copyrightUrl || "/";
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
