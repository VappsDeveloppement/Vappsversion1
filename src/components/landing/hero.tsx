import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { LoginForm } from "./login-form";
import { Logo } from "../shared/logo";

interface HeroProps {
  title: string;
  subtitle: string;
}

export function Hero({ title, subtitle }: HeroProps) {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <section className="relative w-full min-h-[80vh] flex items-center justify-center text-center">
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
      <div className="relative container z-10 grid md:grid-cols-2 gap-12 items-center px-4 md:px-6 text-left">
        <div className="space-y-6">
          <Logo text="Vapps" className="text-white" />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-white drop-shadow-md">
            {title}
          </h1>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Vapps Accompagnement</h2>
            <p className="text-lg text-white/90 drop-shadow-sm max-w-md">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex justify-center">
            <LoginForm />
        </div>
      </div>
    </section>
  );
}
