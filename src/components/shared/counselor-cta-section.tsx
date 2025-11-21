
'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type CounselorProfile = {
    miniSite?: {
        ctaSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            text?: string;
            buttonText?: string;
            buttonLink?: string;
            bgColor?: string;
            bgImageUrl?: string;
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    }
};

export function CounselorCtaSection({ counselor }: { counselor: CounselorProfile }) {
    const ctaConfig = counselor.miniSite?.ctaSection || {};
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    const { 
        enabled,
        title, 
        subtitle, 
        text, 
        buttonText, 
        buttonLink, 
        bgColor, 
        bgImageUrl 
    } = ctaConfig;

    if (!enabled) {
        return null;
    }

    const sectionStyle = {
        backgroundColor: bgImageUrl ? 'transparent' : (bgColor || 'transparent'),
    };
    
    return (
        <section className="relative py-16 sm:py-24 text-center" style={sectionStyle}>
            {bgImageUrl && (
                <Image
                    src={bgImageUrl}
                    alt="Image de fond de l'appel à l'action"
                    layout="fill"
                    objectFit="cover"
                    className="z-0"
                    data-ai-hint="background call to action"
                />
            )}
            <div className={cn("relative z-10 container mx-auto px-4", bgImageUrl && 'text-white bg-black/50 py-10 rounded-lg')}>
                {subtitle && <p className="text-lg font-semibold mb-2" style={{ color: bgImageUrl ? 'white' : primaryColor }}>{subtitle}</p>}
                {title && <h2 className="text-3xl lg:text-4xl font-bold mb-4">{title}</h2>}
                {text && <p className="max-w-2xl mx-auto mb-8">{text}</p>}
                {buttonText && buttonLink && (
                    <Button size="lg" className="font-bold" asChild style={{ backgroundColor: primaryColor, color: 'white' }}>
                        <Link href={buttonLink}>{buttonText}</Link>
                    </Button>
                )}
            </div>
        </section>
    );
}
