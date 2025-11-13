
'use client';

import React from 'react';
import { LoginForm } from '@/components/shared/login-form';
import Image from 'next/image';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { useAgency } from '@/context/agency-provider';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';


function HeroWithLogin() {
    const { personalization, isLoading } = useAgency();

    if (isLoading) {
        return (
            <div className="relative text-white min-h-[100vh] flex items-center justify-center bg-gray-900">
                 <div className="relative z-20 container mx-auto px-4 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="flex flex-col gap-6 text-center md:text-left items-center md:items-start">
                            <Skeleton className="h-10 w-48" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-48" />
                        </div>
                        <div>
                            <Skeleton className="h-96 w-full max-w-md mx-auto" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const heroImageSrc = personalization.heroImageUrl;

    return (
        <div className="relative text-white min-h-[100vh] flex items-center" style={{ backgroundColor: personalization.heroBgColor }}>
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

export default function ApplicationPage() {
  return <HeroWithLogin />;
}
