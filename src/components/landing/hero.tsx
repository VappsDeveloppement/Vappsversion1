import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowRight } from "lucide-react";
import { LoginForm } from "./login-form";

interface HeroProps {
  title: string;
  subtitle: string;
}

export function Hero({ title, subtitle }: HeroProps) {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <section className="relative w-full">
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
      <div className="relative container z-10 grid md:grid-cols-2 gap-8 items-center min-h-[70vh] py-16">
        <div className="space-y-6 text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white drop-shadow-md">
            {title}
          </h1>
          <p className="text-lg text-white/90 drop-shadow-sm">
            {subtitle}
          </p>
        </div>
        <div className="flex justify-center md:justify-end">
            <LoginForm />
        </div>
      </div>
    </section>
  );
}
