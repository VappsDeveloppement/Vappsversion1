
'use client';

import React, { useState, useEffect } from 'react';
import { LoginForm } from '@/components/shared/login-form';
import Image from 'next/image';
import { Logo } from '@/components/shared/logo';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { AboutSection } from '@/components/shared/about-section';
import { ParcoursSection } from '@/components/shared/parcours-section';
import { VideoSection } from '@/components/shared/video-section';
import { ShopSection } from '@/components/shared/shop-section';
import { ServicesSection } from '@/components/shared/services-section';
import { OtherActivitiesSection } from '@/components/shared/other-activities-section';
import { CtaSection } from '@/components/shared/cta-section';
import { PricingSection } from '@/components/shared/pricing-section';
import { WhiteLabelSection } from '@/components/shared/white-label-section';
import { BlogSection } from '@/components/shared/blog-section';
import { Footer } from '@/components/shared/footer';
import type { Section } from '@/app/dashboard/settings/personalization/page';

const sectionComponents: { [key: string]: React.ComponentType } = {
  about: AboutSection,
  parcours: ParcoursSection,
  cta: CtaSection,
  video: VideoSection,
  shop: ShopSection,
  services: ServicesSection,
  otherActivities: OtherActivitiesSection,
  blog: BlogSection,
  whiteLabel: WhiteLabelSection,
  pricing: PricingSection,
};

const defaultSections: Section[] = [
  { id: 'about', label: 'À propos (Trouver votre voie)', enabled: true },
  { id: 'parcours', label: 'Parcours de transformation', enabled: true },
  { id: 'cta', label: 'Appel à l\'action (CTA)', enabled: true },
  { id: 'video', label: 'Vidéo', enabled: true },
  { id: 'shop', label: 'Boutique', enabled: true },
  { id: 'services', label: 'Accompagnements', enabled: true },
  { id: 'otherActivities', label: 'Autres activités & Contact', enabled: true },
  { id: 'blog', label: 'Blog', enabled: true },
  { id: 'whiteLabel', label: 'Marque Blanche', enabled: true },
  { id: 'pricing', label: 'Formules (Tarifs)', enabled: true },
];


function TunnelHomePage() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');
  const [sections, setSections] = useState<Section[]>(defaultSections);

  useEffect(() => {
    const storedSections = localStorage.getItem('homePageSections');
    if (storedSections) {
      try {
        setSections(JSON.parse(storedSections));
      } catch (e) {
        console.error("Failed to parse sections from localStorage", e);
        setSections(defaultSections);
      }
    }

    const handleStorageChange = () => {
      const newStoredSections = localStorage.getItem('homePageSections');
       if (newStoredSections) {
        try {
          setSections(JSON.parse(newStoredSections));
        } catch (e) {
          console.error("Failed to parse sections from localStorage on update", e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);

  }, []);

  return (
    <div className="min-h-dvh flex flex-col overflow-hidden bg-white text-gray-800">
      <div className="relative bg-background text-foreground">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover object-center z-0"
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        
        <main className="relative z-20 container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col gap-8 text-center text-white">
              <div className="flex justify-center">
                <Logo className="text-white" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                Un accompagnement holistique pour une évolution professionnelle alignée avec vos valeurs.
              </h1>
              <div>
                <h2 className="text-xl font-bold text-primary">Vapps Accompagnement</h2>
                <p className="text-lg text-white/80 mt-2">
                  Accédez à vos ressources, suivez vos progrès et communiquez avec votre coach.
                </p>
              </div>
            </div>
            
            <div>
              <LoginForm />
            </div>
          </div>
        </main>
      </div>
      {sections.map(section => {
        if (!section.enabled) return null;
        const SectionComponent = sectionComponents[section.id];
        return SectionComponent ? <SectionComponent key={section.id} /> : null;
      })}
      <Footer />
    </div>
  );
}

function ApplicationHomePage() {
    const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <div className="min-h-dvh flex flex-col overflow-hidden bg-white text-gray-800">
      <div className="relative bg-background text-foreground">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover object-center z-0"
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        
        <main className="relative z-20 container mx-auto px-4 py-16">
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <LoginForm />
            </div>
          </div>
        </main>
      </div>
      <CtaSection />
      <WhiteLabelSection />
      <Footer />
    </div>
  );
}


export function HomePageSelector() {
  const [homePageVersion, setHomePageVersion] = useState('tunnel');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedVersion = localStorage.getItem('homePageVersion') || 'tunnel';
    setHomePageVersion(storedVersion);

    const handleStorageChange = () => {
      const newVersion = localStorage.getItem('homePageVersion') || 'tunnel';
      setHomePageVersion(newVersion);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (!isMounted) {
    return null; // ou un spinner de chargement
  }

  if (homePageVersion === 'application') {
    return <ApplicationHomePage />;
  }

  return <TunnelHomePage />;
}
