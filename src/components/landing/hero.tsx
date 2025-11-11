import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";

interface HeroProps {
  title: string;
  subtitle: string;
  cta: string;
}

export function Hero({ title, subtitle, cta }: HeroProps) {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <section className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center text-center">
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
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-background/20"></div>
      <div className="relative container z-10 flex flex-col items-center gap-6 px-4 md:px-6">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl font-headline text-primary-foreground drop-shadow-md">
            {title}
          </h1>
          <p className="text-lg text-primary-foreground/90 md:text-xl drop-shadow-sm">
            {subtitle}
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/dashboard">{cta}</Link>
        </Button>
      </div>
    </section>
  );
}