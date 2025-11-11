import { LoginForm } from '@/components/shared/login-form';
import Image from 'next/image';
import { Logo } from '@/components/shared/logo';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { CtaSection } from '@/components/shared/cta-section';
import { WhiteLabelSection } from '@/components/shared/white-label-section';
import { Footer } from '@/components/shared/footer';

export default function ApplicationPage() {
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
