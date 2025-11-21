
'use client';

import React from 'react';
import Image from 'next/image';

type CounselorProfile = {
    publicBio?: string;
    dashboardTheme?: {
        primaryColor?: string;
    };
    miniSite?: {
        aboutSection?: {
            enabled?: boolean;
            imageUrl?: string;
            title?: string;
            subtitle?: string;
            text?: string;
        }
    };
};

export function AboutMeSection({ counselor }: { counselor: CounselorProfile }) {
    const aboutConfig = counselor.miniSite?.aboutSection || {};
    
    if (!aboutConfig.enabled) {
        return null;
    }

    const title = aboutConfig.title || "À propos de moi";
    const subtitle = aboutConfig.subtitle || "Une approche sur-mesure";
    const textToDisplay = aboutConfig.text || counselor.publicBio || "Contenu de la biographie à venir.";
    const imageUrl = aboutConfig.imageUrl;
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    const mediaContent = imageUrl ? (
        <div className="w-full h-64 md:h-80 relative rounded-lg overflow-hidden shadow-lg">
            <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-cover"
                data-ai-hint="portrait professional"
            />
        </div>
    ) : null;

    return (
        <section className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    {subtitle && <p className="text-lg mt-2" style={{ color: primaryColor }}>{subtitle}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {mediaContent}
                    <div className={!mediaContent ? "md:col-span-2 text-center" : ""}>
                        <p className="text-muted-foreground text-lg whitespace-pre-wrap">
                            {textToDisplay}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
