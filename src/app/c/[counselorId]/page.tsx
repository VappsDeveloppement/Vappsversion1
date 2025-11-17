
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

type CounselorProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    publicTitle?: string;
    publicBio?: string;
    photoUrl?: string;
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
            <Skeleton className="h-32 w-32 rounded-full mx-auto" />
            <Skeleton className="h-8 w-1/4 mx-auto mt-4" />
            <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
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

  return (
    <div className="bg-background min-h-screen">
      <header className="py-12 bg-muted">
        <div className="container mx-auto px-4 text-center">
          <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-background shadow-lg">
            <AvatarImage src={counselor.photoUrl} alt={`${counselor.firstName} ${counselor.lastName}`} />
            <AvatarFallback className="text-4xl">
              {counselor.firstName?.charAt(0)}{counselor.lastName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-4xl font-bold">{counselor.firstName} {counselor.lastName}</h1>
          <p className="text-xl text-muted-foreground">{counselor.publicTitle || 'Conseiller en développement personnel et professionnel'}</p>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-8">
        <Card>
            <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4">À propos de moi</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                    {counselor.publicBio || 'Ce conseiller n\'a pas encore rédigé de biographie.'}
                </p>
            </CardContent>
        </Card>

        {/* This is where you could add more sections like services, contact form, etc. */}
        <div className="mt-8 text-center text-muted-foreground">
            <p>Contenu additionnel à venir.</p>
        </div>
      </main>
    </div>
  );
}
