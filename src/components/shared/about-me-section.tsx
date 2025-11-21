
'use client';

import React from 'react';
import Image from 'next/image';

type CounselorProfile = {
    publicBio?: string;
    miniSite?: {
        aboutSection?: {
            enabled?: boolean;
            imageUrl?: string;
            videoUrl?: string;
            mediaText?: string;
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

    const title = aboutConfig.title || "Trouver Votre Voie";
    const subtitle = aboutConfig.subtitle || "Une approche sur-mesure";
    const textToDisplay = aboutConfig.text || counselor.publicBio || "Contenu de la biographie à venir.";
    const imageUrl = aboutConfig.imageUrl;
    const videoUrl = aboutConfig.videoUrl;

    const renderMedia = () => {
        if (videoUrl) {
            return (
                 <div className="aspect-video w-full">
                    <iframe
                        className="w-full h-full rounded-lg shadow-lg"
                        src={videoUrl.replace("watch?v=", "embed/")}
                        title="Vidéo de présentation"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            )
        }
        if (imageUrl) {
            return (
                <div className="w-full h-64 md:h-80 relative rounded-lg overflow-hidden shadow-lg">
                    <Image
                        src={imageUrl}
                        alt={title}
                        fill
                        className="object-cover"
                        data-ai-hint="woman bike"
                    />
                </div>
            )
        }
        return null;
    }

    const mediaContent = renderMedia();

    return (
        <section className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4">
                 <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>
                    {subtitle && <p className="text-lg text-primary mt-2">{subtitle}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {mediaContent}
                    <div className={!mediaContent ? "md:col-span-2 text-center" : ""}>
                        <p className="text-muted-foreground text-lg">
                            {textToDisplay}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
