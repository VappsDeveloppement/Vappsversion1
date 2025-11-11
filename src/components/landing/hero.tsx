import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  title: string;
  subtitle: string;
}

export function Hero({ title, subtitle }: HeroProps) {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <section className="relative w-full min-h-[70vh] flex items-center justify-center text-center">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/30"></div>
      <div className="relative container z-10 flex flex-col items-center text-center px-4 md:px-6">
        <div className="space-y-6 max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-md">
            {title}
          </h1>
          <p className="text-lg text-white/90 drop-shadow-sm">
            {subtitle}
          </p>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="outline" className="bg-primary/90 border-primary text-primary-foreground hover:bg-primary">
                Découvrir mes services
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg">
                Prendre rendez-vous
            </Button>
        </div>
      </div>
    </section>
  );
}
