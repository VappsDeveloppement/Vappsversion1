

'use client';

import React from 'react';
import { LoginForm } from '@/components/shared/login-form';
import Image from 'next/image';
import Link from 'next/link';
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
import type { Section, HeroNavLink } from '@/app/dashboard/settings/personalization/page';
import { useAgency } from '@/context/agency-provider';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { ArrowRight } from 'lucide-react';

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

// Héro AVEC fenêtre de connexion
function HeroWithLogin() {
    const { personalization } = useAgency();
    const heroImageSrc = personalization.heroImageUrl;

    return (
        <div className="relative text-white min-h-[50vh] md:min-h-[75vh] flex items-center" style={{ backgroundColor: personalization.heroBgColor }}>
             {heroImageSrc && (
                <Image
                    src={heroImageSrc}
                    alt="Image de fond"
                    fill
                    className="object-cover object-center z-0"
                    data-ai-hint="hero background"
                />
            )}
            <div className="absolute inset-0 bg-black/60 z-10"></div>

            <div className="relative z-20 container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col gap-6 text-center items-center">
                         <Logo className="text-white" />
                        <h1 className="text-4xl lg:text-5xl font-bold leading-tight" style={{color: personalization.heroAppTitleColor}}>
                           {personalization.heroAppTitle || "Un accompagnement holistique pour une évolution professionnelle alignée avec vos valeurs."}
                        </h1>
                        <p className="text-lg text-white/80" style={{color: personalization.heroAppSubtitleColor}}>
                           {personalization.heroAppSubtitle || "Accédez à vos ressources, suivez vos progrès et communiquez avec votre coach."}
                        </p>
                        <Button size="lg" asChild variant="secondary">
                            <Link href={personalization.heroAppCtaLink || '#'}>
                                {personalization.heroAppCtaText || "Découvrir VApps"} <ArrowRight className="ml-2"/>
                            </Link>
                        </Button>
                    </div>
                    <div>
                        <LoginForm />
                    </div>
                </div>
            </div>
        </div>
    )
}

// Héro SANS fenêtre de connexion (style tunnel de vente)
function HeroWithoutLogin() {
    const { personalization } = useAgency();
    const heroImageSrc = personalization.heroImageUrl;
    const navLinks = personalization.heroNavLinks as HeroNavLink[] || [];


    return (
        <div className="relative text-white" style={{ backgroundColor: personalization.heroBgColor }}>
             {heroImageSrc && (
                <Image
                    src={heroImageSrc}
                    alt="Image de fond pour le Héro"
                    fill
                    className="object-cover object-center z-0"
                    data-ai-hint="hero background"
                />
            )}
            <div className="absolute inset-0 bg-black/60 z-10"></div>
            
            <header className="relative z-20 container mx-auto px-4 py-4 flex justify-between items-center">
                <Logo className="text-white" />
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    {navLinks.map(link => (
                      <Link key={link.id} href={link.url} className="hover:text-primary transition-colors">{link.text}</Link>
                    ))}
                </nav>
                <Button asChild>
                    <Link href="/application">Mon Espace</Link>
                </Button>
            </header>

            <div className="relative z-20 container mx-auto px-4 pt-24 pb-32 text-center flex flex-col items-center">
                <h1 className="text-4xl md:text-6xl font-bold leading-tight max-w-4xl" style={{color: personalization.heroTitleColor}}>{personalization.heroTitle || "Révélez votre potentiel et construisez une carrière qui vous ressemble."}</h1>
                <p className="mt-4 text-lg md:text-xl text-white/80 max-w-2xl" style={{color: personalization.heroSubtitleColor}}>{personalization.heroSubtitle || "Un accompagnement sur-mesure pour votre épanouissement professionnel et personnel."}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    <Button size="lg" asChild variant="secondary">
                        <Link href={personalization.heroCta1Link || "#"}>
                            {personalization.heroCta1Text || "Découvrir mes services"} <ArrowRight className="ml-2"/>
                        </Link>
                    </Button>
                    <Button size="lg" asChild>
                         <Link href={personalization.heroCta2Link || "#"}>{personalization.heroCta2Text || "Prendre rendez-vous"}</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Le composant Héro qui choisit lequel afficher en fonction des réglages
function HeroSection() {
    const { personalization } = useAgency();
    const heroStyle = personalization?.heroStyle || 'application'; // 'application' ou 'tunnel'

    if (heroStyle === 'application') {
        return <HeroWithLogin />;
    }
    return <HeroWithoutLogin />;
}

// Page d'accueil complète (tunnel)
function TunnelHomePage() {
  const { personalization } = useAgency();
  const sections = personalization?.homePageSections as Section[] || [];
  
  return (
    <div className="min-h-dvh flex flex-col overflow-hidden bg-white text-gray-800">
      <main>
          {sections.map(section => {
            if (!section.enabled) return null;
            if (section.id === 'hero') return <HeroSection key={section.id} />;
            if (section.id === 'footer') return null; // Pied de page géré à la fin

            const SectionComponent = sectionComponents[section.id];
            return SectionComponent ? <SectionComponent key={section.id} /> : null;
          })}
      </main>
      {sections.find(s => s.id === 'footer' && s.enabled) && <Footer />}
    </div>
  );
}

// Page d'accueil simplifiée (application)
function ApplicationHomePage() {
    const { personalization } = useAgency();
    const sections = personalization?.homePageSections as Section[] || [];
    const sectionsToRender = ['hero', 'whiteLabel', 'footer'];
    
    return (
        <div className="min-h-dvh flex flex-col overflow-hidden bg-white text-gray-800">
            <main>
                {sections
                    .filter(section => sectionsToRender.includes(section.id) && section.enabled)
                    .sort((a, b) => sectionsToRender.indexOf(a.id) - sectionsToRender.indexOf(b.id))
                    .map(section => {
                        if (section.id === 'hero') return <HeroSection key={section.id} />;
                        if (section.id === 'footer') return null;

                        const SectionComponent = sectionComponents[section.id];
                        return SectionComponent ? <SectionComponent key={section.id} /> : null;
                    })}
            </main>
            {sections.find(s => s.id === 'footer' && s.enabled) && <Footer />}
        </div>
    );
}

export function HomePageSelector() {
  const { personalization, isLoading } = useAgency();
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-muted/30">
            <div className="space-y-4 p-8 w-full max-w-4xl">
                <Skeleton className="h-[400px] w-full" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        </div>
    )
  }

  const homePageVersion = personalization?.homePageVersion || 'tunnel';

  if (homePageVersion === 'application') {
    return <ApplicationHomePage />;
  }

  return <TunnelHomePage />;
}
