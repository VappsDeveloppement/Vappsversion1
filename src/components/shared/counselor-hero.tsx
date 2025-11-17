
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
            ctaText?: string;
            ctaLink?: string;
            showPhoto?: boolean;
            bgColor?: string;
            bgImageUrl?: string;
        }
    };
};

export function CounselorHero({ counselor }: { counselor: CounselorProfile }) {
    const heroConfig = counselor.miniSite?.hero || {};

    const title = heroConfig.title || `Bienvenue sur la page de ${counselor.firstName} ${counselor.lastName}`;
    const subtitle = heroConfig.subtitle || counselor.publicTitle || "Conseiller en développement personnel et professionnel";
    const ctaText = heroConfig.ctaText || "Prendre rendez-vous";
    const ctaLink = heroConfig.ctaLink || "#contact";
    const showPhoto = heroConfig.showPhoto !== false; // Default to true if not set
    const bgColor = heroConfig.bgColor || '#f1f5f9'; // default to muted
    const bgImageUrl = heroConfig.bgImageUrl;

    return (
        <header className="relative py-20 md:py-32" style={{ backgroundColor: bgImageUrl ? 'transparent' : bgColor }}>
             {bgImageUrl && (
                <Image
                    src={bgImageUrl}
                    alt="Image de fond"
                    fill
                    className="object-cover object-center z-0"
                    data-ai-hint="hero background"
                />
            )}
            <div className="absolute inset-0 bg-black/30 z-10"></div>
            <div className="container mx-auto px-4 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-center">
                    {showPhoto && (
                         <div className="md:col-span-1 flex justify-center">
                            <Avatar className="w-48 h-48 border-4 border-background shadow-lg">
                                <AvatarImage src={counselor.photoUrl || undefined} alt={`${counselor.firstName} ${counselor.lastName}`} />
                                <AvatarFallback className="text-6xl">
                                    {counselor.firstName?.charAt(0)}{counselor.lastName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                    <div className={cn(
                        "text-center",
                        showPhoto ? "md:col-span-2 md:text-left" : "md:col-span-3"
                    )}>
                        <h1 className="text-4xl md:text-5xl font-bold text-white">{title}</h1>
                        <p className="text-xl text-white/90 mt-4">{subtitle}</p>
                        <p className="mt-6 text-base text-white/80 max-w-2xl mx-auto md:mx-0">
                           {counselor.publicBio || 'Biographie non disponible.'}
                        </p>
                        <div className="mt-8">
                            <Button size="lg" asChild>
                                <Link href={ctaLink}>{ctaText}</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
