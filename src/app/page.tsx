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

export default function Home() {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col gap-8 text-center text-white">
              <div className="flex justify-center">
                <Logo className="text-white" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                Un accompagnement holistique pour une évolution professionnelle alignée avec vos valeurs.
              </h1>
              <div>
                <h2 className="text-xl font-bold">Vapps Accompagnement</h2>
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
      <AboutSection />
      <ParcoursSection />
      <CtaSection />
      <VideoSection />
      <ShopSection />
      <ServicesSection />
      <OtherActivitiesSection />
      <WhiteLabelSection />
      <PricingSection />
      <CtaSection />
    </div>
  );
}
