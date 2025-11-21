

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { CounselorHero } from '@/components/shared/counselor-hero';
import { AttentionSection } from '@/components/shared/attention-section';
import { AboutMeSection } from '@/components/shared/about-me-section';
import { ParcoursSection } from '@/components/shared/parcours-section';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CounselorServicesSection } from '@/components/shared/counselor-services-section';
import { CounselorCtaSection } from '@/components/shared/counselor-cta-section';
import { CounselorContactSection } from '@/components/shared/counselor-contact-section';

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
    miniSite?: {
        publicProfileName?: string;
        hero?: any;
        attentionSection?: any;
        aboutSection?: any;
        servicesSection?: any;
        parcoursSection?: any;
        ctaSection?: any;
        contactSection?: any;
    };
    dashboardTheme?: {
        primaryColor?: string;
    }
};

export default function CounselorPublicProfilePage() {
  const params = useParams();
  const firestore = useFirestore();
  const publicProfileName = params.publicProfileName as string;

  const counselorQuery = useMemoFirebase(() => {
    if (!publicProfileName || !firestore) return null;
    return query(
        collection(firestore, 'minisites'), 
        where("miniSite.publicProfileName", "==", publicProfileName), 
        limit(1)
    );
  }, [publicProfileName, firestore]);

  const { data: counselors, isLoading, error } = useCollection<CounselorProfile>(counselorQuery);

  const counselor = counselors?.[0];

  if (isLoading) {
    return (
        <div className="space-y-8 p-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  if (!counselor || error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-muted">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Profil non trouvé</h1>
            <p className="text-muted-foreground mt-2">
                Le profil que vous cherchez n'existe pas ou le lien est incorrect.
            </p>
            <Button asChild className="mt-6">
                <Link href="/">Retour à l'accueil</Link>
            </Button>
        </div>
    );
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
        <CounselorCtaSection counselor={counselor} />
        <CounselorContactSection counselor={counselor} />
      </main>
      <footer className="py-6 text-center text-sm" style={{ backgroundColor: footerBgColor }}>
        <p className="text-muted-foreground">© {new Date().getFullYear()} - <Link href={copyrightUrl} className="hover:underline" style={{color: primaryColor}}>{copyrightText}</Link></p>
      </footer>
    </div>
  );
}
