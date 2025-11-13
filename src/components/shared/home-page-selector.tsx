

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Section } from '@/app/dashboard/settings/personalization/page';
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

function HeroSectionApplication() {
    const { personalization } = useAgency();
    const fallbackImage = PlaceHolderImages.find(p => p.id === 'hero-background');
    const heroImageSrc = personalization.heroImageUrl || fallbackImage?.imageUrl;

    return (
        <div className="relative text-white min-h-[50vh] md:min-h-screen flex items-center" style={{ backgroundColor: personalization.heroBgColor }}>
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
                    <div className="flex flex-col gap-6 text-center md:text-left items-center md:items-start">
                         <Logo className="text-white" />
                        <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                           {personalization.heroAppTitle}
                        </h1>
                        <p className="text-lg text-white/80">
                           {personalization.heroAppSubtitle}
                        </p>
                        <Button size="lg" asChild variant="secondary">
                            <Link href={personalization.heroAppCtaLink}>
                                {personalization.heroAppCtaText} <ArrowRight className="ml-2"/>
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

function HeroSectionSalesFunnel() {
    const { personalization } = useAgency();
    const fallbackImage = PlaceHolderImages.find(p => p.id === 'hero-background');
    const heroImageSrc = personalization.heroImageUrl || fallbackImage?.imageUrl;

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
                    <Link href="#about" className="hover:text-primary transition-colors">Approche</Link>
                    <Link href="#parcours" className="hover:text-primary transition-colors">Parcours</Link>
                    <Link href="#pricing" className="hover:text-primary transition-colors">Formules</Link>
                    <Link href="#contact" className="hover:text-primary transition-colors">Contact</Link>
                </nav>
                <Button asChild>
                    <Link href="/application">Mon Espace</Link>
                </Button>
            </header>

            <div className="relative z-20 container mx-auto px-4 pt-24 pb-32 text-center flex flex-col items-center">
                <h1 className="text-4xl md:text-6xl font-bold leading-tight max-w-4xl">{personalization.heroTitle}</h1>
                <p className="mt-4 text-lg md:text-xl text-white/80 max-w-2xl">{personalization.heroSubtitle}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    <Button size="lg" asChild variant="secondary">
                        <Link href={personalization.heroCta1Link}>
                            {personalization.heroCta1Text} <ArrowRight className="ml-2"/>
                        </Link>
                    </Button>
                    <Button size="lg" asChild>
                         <Link href={personalization.heroCta2Link}>{personalization.heroCta2Text}</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

function HeroSection() {
    const { personalization } = useAgency();
    
    if (personalization?.heroStyle === 'sales_funnel') {
        return <HeroSectionSalesFunnel />;
    }
    
    return <HeroSectionApplication />;
}


function TunnelHomePage() {
  const { personalization } = useAgency();
  const sections = personalization?.homePageSections as Section[] || [];
  
  const heroSection = sections.find(s => s.id === 'hero');
  const footerSection = sections.find(s => s.id === 'footer');

  return (
    <div className="min-h-dvh flex flex-col overflow-hidden bg-white text-gray-800">
      <main>
          {heroSection?.enabled && <HeroSection />}
          {sections.map(section => {
            if (!section.enabled || section.id === 'hero' || section.id === 'footer') return null;
            const SectionComponent = sectionComponents[section.id];
            return SectionComponent ? <SectionComponent key={section.id} /> : null;
          })}
      </main>
      {footerSection?.enabled && <Footer />}
    </div>
  );
}

function ApplicationHomePage() {
  return (
    <div className="min-h-dvh flex flex-col overflow-hidden bg-white text-gray-800">
      <main>
        <HeroSectionApplication />
      </main>
      <CtaSection />
      <WhiteLabelSection />
      <Footer />
    </div>
  );
}


export function HomePageSelector() {
  const { agency, isLoading, isDefaultAgency } = useAgency();

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

  const homePageVersion = agency?.personalization?.homePageVersion || 'tunnel';

  if (homePageVersion === 'application') {
    return <ApplicationHomePage />;
  }

  return <TunnelHomePage />;
}
