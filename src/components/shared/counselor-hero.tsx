

'use client';

import React from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

type CounselorProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    city?: string;
    publicTitle?: string;
    publicBio?: string;
    photoUrl?: string;
    dashboardTheme?: {
        primaryColor?: string;
    };
    miniSite?: {
        hero?: {
            title?: string;
            subtitle?: string;
            ctaText?: string;
            cta2Text?: string;
            ctaLink?: string;
            cta2Link?: string;
            showPhoto?: boolean;
            showPhone?: boolean;
            showLocation?: boolean;
            bgColor?: string;
            bgImageUrl?: string;
            titleColor?: string;
            subtitleColor?: string;
        }
    };
};

export function CounselorHero({ counselor }: { counselor: CounselorProfile }) {
    const heroConfig = counselor.miniSite?.hero || {};

    const title = heroConfig.title || `Donnez un nouvel élan à votre carrière`;
    const subtitle = heroConfig.subtitle || "Un accompagnement personnalisé pour atteindre vos objectifs.";
    const ctaText = heroConfig.ctaText || "Prendre rendez-vous";
    const cta2Text = heroConfig.cta2Text || "Mon Espace";
    const ctaLink = heroConfig.ctaLink || "#contact";
    const cta2Link = heroConfig.cta2Link || "/application";
    const showPhoto = heroConfig.showPhoto !== false;
    const showPhone = heroConfig.showPhone !== false;
    const showLocation = heroConfig.showLocation !== false;
    const bgColor = heroConfig.bgColor || '#111827';
    const bgImageUrl = heroConfig.bgImageUrl;
    const titleColor = heroConfig.titleColor || '#FFFFFF';
    const subtitleColor = heroConfig.subtitleColor || '#E5E7EB';
    
    // Use the theme color from the user's main profile for the button
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    return (
        <header className="relative text-white overflow-hidden" style={{ backgroundColor: bgImageUrl ? 'transparent' : bgColor }}>
             {bgImageUrl && (
                <Image
                    src={bgImageUrl}
                    alt="Image de fond"
                    fill
                    className="object-cover object-center z-0"
                    data-ai-hint="city dusk"
                />
            )}
            <div className="absolute inset-0 bg-black/60 z-10"></div>
            
            <div className="container mx-auto px-4 relative z-20 flex flex-col items-center text-center py-12 md:py-20">
                
                {showPhoto && (
                    <Avatar className="w-32 h-32 border-4 border-background shadow-lg mb-4">
                        <AvatarImage src={counselor.photoUrl || undefined} alt={`${counselor.firstName} ${counselor.lastName}`} />
                        <AvatarFallback className="text-4xl">
                            {counselor.firstName?.charAt(0)}{counselor.lastName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                )}
                
                <h2 className="text-2xl font-bold" style={{ color: subtitleColor }}>{counselor.firstName} {counselor.lastName}</h2>
                
                <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: subtitleColor }}>
                    {showPhone && counselor.phone && (
                        <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4"/>
                            <span>{counselor.phone}</span>
                        </div>
                    )}
                    {showLocation && counselor.city && (
                        <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4"/>
                            <span>{counselor.city}</span>
                        </div>
                    )}
                </div>

                <div className="max-w-3xl mt-6">
                    <h1 className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-md" style={{ color: titleColor }}>{title}</h1>
                    <p className="text-xl text-white/90 mt-4" style={{ color: subtitleColor }}>{subtitle}</p>
                    
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <Button size="lg" className="font-bold text-lg" asChild style={{ backgroundColor: primaryColor, color: 'white' }}>
                            <Link href={ctaLink}>{ctaText}</Link>
                        </Button>
                         <Button size="lg" variant="outline" className="bg-white/90 text-gray-800 hover:bg-white font-bold text-lg border-transparent">
                            <Link href={cta2Link}>{cta2Text}</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
