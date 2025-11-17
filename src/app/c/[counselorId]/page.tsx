

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { CounselorHero } from '@/components/shared/counselor-hero';
import { AboutMeSection } from '@/components/shared/about-me-section';

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

// Placeholder for Attention section
const AttentionSection = ({ counselor }: { counselor: CounselorProfile }) => {
    const attentionConfig = counselor.miniSite?.attentionSection || {};

    if (!attentionConfig.enabled || (!attentionConfig.title && !attentionConfig.text)) {
        return null;
    }
    
    const title = attentionConfig.title || "Attention";
    const text = attentionConfig.text || counselor.publicBio || 'Ce conseiller n\'a pas encore rédigé de biographie.';

    return (
        <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
                 <Card>
                    <CardContent className="p-6 md:p-10 text-center">
                        <h2 className="text-3xl font-bold mb-6">{title}</h2>
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg max-w-3xl mx-auto">
                            {text}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
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

  return (
    <div className="bg-muted/30 min-h-screen">
      <CounselorHero counselor={counselor} />
      <main>
        {showAttentionSection && <AttentionSection counselor={counselor} />}
        {showAboutSection && <AboutMeSection counselor={counselor} />}
      </main>
    </div>
  );
}
