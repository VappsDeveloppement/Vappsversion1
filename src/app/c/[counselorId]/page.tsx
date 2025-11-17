

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

  const counselorDocRef = useMemoFirebase(() => {
    if (!counselorId) return null;
    return doc(firestore, 'users', counselorId);
  }, [firestore, counselorId]);

  const { data: counselor, isLoading, error } = useDoc<CounselorProfile>(counselorDocRef);

  if (isLoading) {
    return (
        <div className="container mx-auto p-8">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-40 w-full mt-8" />
        </div>
    );
  }

  if (error || !counselor) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Conseiller introuvable</h1>
        <p className="text-muted-foreground">Le profil de ce conseiller n'existe pas ou n'est plus disponible.</p>
      </div>
    );
  }

  const showAttentionSection = counselor.miniSite?.attentionSection?.enabled !== false;
  const showAboutSection = counselor.miniSite?.aboutSection?.enabled !== false;
  const showInterestsSection = counselor.miniSite?.interestsSection?.enabled !== false;
  const showServicesSection = counselor.miniSite?.servicesSection?.enabled !== false;

  return (
    <div className="bg-muted/30 min-h-screen">
      <CounselorHero counselor={counselor} />
      <main>
        {showAttentionSection && <AttentionSection counselor={counselor} />}
        {showAboutSection && <AboutMeSection counselor={counselor} />}
        {showInterestsSection && <InterestsSection counselor={counselor} />}
        {showServicesSection && <CounselorServicesSection counselor={counselor} />}
      </main>
    </div>
  );
}
