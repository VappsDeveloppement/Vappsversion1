
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { CounselorHero } from '@/components/shared/counselor-hero';
import { AboutMeSection } from '@/components/shared/about-me-section';
import { AttentionSection } from '@/components/shared/attention-section';
import { InterestsSection } from '@/components/shared/interests-section';
import { CounselorServicesSection } from '@/components/shared/counselor-services-section';
import { CounselorCtaSection } from '@/components/shared/counselor-cta-section';
import { CounselorPricingSection } from '@/components/shared/counselor-pricing-section';
import { CounselorContactSection } from '@/components/shared/counselor-contact-section';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { useAgency } from '@/context/agency-provider';

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

function CounselorPageContent({ counselor, isLoading, agency }: { counselor: CounselorProfile | null, isLoading: boolean, agency: any }) {

  if (isLoading) {
    return (
        <div className="space-y-8 p-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    );
  }

  if (!counselor) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-muted">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Profil non disponible</h1>
            <p className="text-muted-foreground mt-2">
                Le profil que vous cherchez n'existe pas ou n'est plus disponible.
            </p>
            <Link href="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                Retour à l'accueil
            </Link>
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

  const copyrightText = agency?.personalization.copyrightText || "Vapps.";
  const copyrightUrl = agency?.personalization.copyrightUrl || "/";
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

export default function CounselorPublicProfilePage() {
  const params = useParams();
  const firestore = useFirestore();
  const { agency, isLoading: isAgencyLoading } = useAgency();
  const publicProfileName = params.publicProfileName as string;
  const [counselorId, setCounselorId] = useState<string | null>(null);
  const [isLoadingId, setIsLoadingId] = useState(true);

  useEffect(() => {
    if (!publicProfileName || !firestore) return;
    
    const findCounselorId = async () => {
        const routesRef = collection(firestore, 'minisite_routes');
        const q = query(routesRef, where("publicProfileName", "==", publicProfileName), limit(1));
        
        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const routeDoc = querySnapshot.docs[0];
                setCounselorId(routeDoc.data().counselorId);
            } else {
                console.log(`No route found for publicProfileName: ${publicProfileName}`);
                setCounselorId(null);
            }
        } catch (error) {
            console.error("Error fetching counselor by public name:", error);
            setCounselorId(null);
        } finally {
            setIsLoadingId(false);
        }
    };

    findCounselorId();
  }, [publicProfileName, firestore]);
  

  const counselorDocRef = useMemoFirebase(() => {
    if (!counselorId) return null;
    return doc(firestore, 'minisites', counselorId);
  }, [firestore, counselorId]);

  const { data: counselor, isLoading: isCounselorLoading } = useDoc<CounselorProfile>(counselorDocRef);

  const isLoading = isLoadingId || isCounselorLoading || isAgencyLoading;

  return <CounselorPageContent counselor={counselor} isLoading={isLoading} agency={agency} />
}
