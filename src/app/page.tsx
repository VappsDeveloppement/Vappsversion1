
'use client';

import React from 'react';
import { useAgency } from '@/context/agency-provider';
import { HomePageSelector } from "@/components/shared/home-page-selector";
import { useRouter } from 'next/navigation';

export default function Home() {
  const { agency, isLoading, isDefaultAgency } = useAgency();
  const router = useRouter();

  React.useEffect(() => {
    // Si la base est vide (isDefaultAgency est true) et qu'on n'est pas déjà sur la page d'install,
    // on redirige pour forcer la création de l'agence.
    if (!isLoading && isDefaultAgency) {
      // On ne redirige plus, on laisse l'app fonctionner avec les données par défaut.
      // router.push('/admin/onboarding'); 
    }
  }, [isLoading, isDefaultAgency, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-dashed border-primary"></div>
      </div>
    );
  }

  // Si on est sur l'agence par défaut, on affiche la page d'installation
  if (isDefaultAgency) {
    // A la place de rediriger, on pourrait afficher directement le composant d'onboarding
    // pour que l'URL reste "/". Pour l'instant on laisse le HomePageSelector fonctionner.
    // return <OnboardingPage />;
  }

  return <HomePageSelector />;
}
