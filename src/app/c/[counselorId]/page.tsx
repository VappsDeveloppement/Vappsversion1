

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { CounselorHero } from '@/components/shared/counselor-hero';

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

// Placeholder for About Me section
const AboutMeSection = ({ counselor }: { counselor: CounselorProfile }) => (
    <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
             <Card>
                <CardContent className="p-6 md:p-10">
                    <h2 className="text-3xl font-bold mb-6 text-center">À propos de moi</h2>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg">
                        {counselor.publicBio || 'Ce conseiller n\'a pas encore rédigé de biographie.'}
                    </p>
                </CardContent>
            </Card>
        </div>
    </section>
);


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

  // TODO: Dynamically render sections based on counselor.miniSite.sections
  return (
    <div className="bg-muted/30 min-h-screen">
      <CounselorHero counselor={counselor} />
      <main>
        {/* About me section removed as it's now integrated in the hero */}
      </main>
    </div>
  );
}
