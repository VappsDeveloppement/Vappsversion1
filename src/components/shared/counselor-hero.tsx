
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
            <div className="container mx-auto px-4 text-center">
                {showPhoto && counselor.photoUrl && (
                    <Avatar className="w-32 h-32 mx-auto mb-6 border-4 border-background shadow-lg">
                        <AvatarImage src={counselor.photoUrl} alt={`${counselor.firstName} ${counselor.lastName}`} />
                        <AvatarFallback className="text-4xl">
                            {counselor.firstName?.charAt(0)}{counselor.lastName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                )}
                <h1 className="text-4xl md:text-5xl font-bold max-w-3xl mx-auto">{title}</h1>
                <p className="text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">{subtitle}</p>
                <div className="mt-8">
                    <Button size="lg" asChild>
                        <Link href={ctaLink}>{ctaText}</Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}

    