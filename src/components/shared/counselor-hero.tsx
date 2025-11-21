
'use client';

import React from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type CounselorProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    publicTitle?: string;
    publicBio?: string;
    photoUrl?: string;
    miniSite?: {
        hero?: {
            title?: string;
            subtitle?: string;
            text?: string;
            ctaText?: string;
            ctaLink?: string;
            showPhoto?: boolean;
            bgColor?: string;
            bgImageUrl?: string;
            primaryColor?: string;
        }
    };
};

export function CounselorHero({ counselor }: { counselor: CounselorProfile }) {
    const heroConfig = counselor.miniSite?.hero || {};

    const title = heroConfig.title || `Donnez un nouvel élan à votre carrière`;
    const subtitle = heroConfig.subtitle || "Un accompagnement personnalisé pour atteindre vos objectifs.";
    const text = heroConfig.text || "Avec plus de 10 ans d'expérience, je vous guide vers une carrière alignée avec vos valeurs et ambitions. Ensemble, nous révélerons votre plein potentiel.";
    const ctaText = heroConfig.ctaText || "Prendre rendez-vous";
    const ctaLink = heroConfig.ctaLink || "#contact";
    const showPhoto = heroConfig.showPhoto !== false; // Default to true if not set
    const bgColor = heroConfig.bgColor || '#111827'; // default to a dark gray
    const bgImageUrl = heroConfig.bgImageUrl;
    const primaryColor = heroConfig.primaryColor || '#00AFFF'; // A bright blue for the button

    return (
        <header className="relative py-24 md:py-32 text-white overflow-hidden" style={{ backgroundColor: bgImageUrl ? 'transparent' : bgColor }}>
             {bgImageUrl && (
                <Image
                    src={bgImageUrl}
                    alt="Image de fond"
                    fill
                    className="object-cover object-center z-0"
                    data-ai-hint="city dusk"
                />
            )}
            <div className="absolute inset-0 bg-black/50 z-10"></div>
            
            <div className="container mx-auto px-4 relative z-20 flex flex-col items-center text-center">
                {showPhoto && (
                    <Avatar className="w-32 h-32 border-4 border-background shadow-lg mb-[-4rem] z-10">
                        <AvatarImage src={counselor.photoUrl || undefined} alt={`${counselor.firstName} ${counselor.lastName}`} />
                        <AvatarFallback className="text-4xl">
                            {counselor.firstName?.charAt(0)}{counselor.lastName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                )}
                
                <div className="max-w-3xl pt-16">
                    <h1 className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-md">{title}</h1>
                    <p className="text-xl text-white/90 mt-4">{subtitle}</p>
                    <p className="mt-4 text-base text-white/80">
                       {text}
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <Button size="lg" className="font-bold text-lg" asChild style={{ backgroundColor: primaryColor, color: 'white' }}>
                            <Link href={ctaLink}>{ctaText}</Link>
                        </Button>
                         <Button size="lg" variant="outline" className="bg-white/90 text-gray-800 hover:bg-white font-bold text-lg border-transparent">
                            <Link href="/application">Mon Espace</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
