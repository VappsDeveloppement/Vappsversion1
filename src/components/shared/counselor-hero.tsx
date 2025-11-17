
'use client';

import React from 'react';
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

    return (
        <header className="py-20 md:py-32 bg-muted">
            <div className="container mx-auto px-4">
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
                    <div className={showPhoto ? "md:col-span-2 text-center md:text-left" : "md:col-span-3 text-center"}>
                        <h1 className="text-4xl md:text-5xl font-bold">{title}</h1>
                        <p className="text-xl text-muted-foreground mt-4">{subtitle}</p>
                        <p className="mt-6 text-base text-muted-foreground max-w-2xl mx-auto md:mx-0">
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
