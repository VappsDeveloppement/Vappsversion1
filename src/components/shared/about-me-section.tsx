
'use client';

import React from 'react';
import Image from 'next/image';

type CounselorProfile = {
    publicBio?: string;
    miniSite?: {
        aboutSection?: {
            imageUrl?: string;
            videoUrl?: string;
            mediaText?: string;
            title?: string;
            text?: string;
        }
    };
};

export function AboutMeSection({ counselor }: { counselor: CounselorProfile }) {
    const aboutConfig = counselor.miniSite?.aboutSection || {};

    const textToDisplay = aboutConfig.text || counselor.publicBio || "Contenu de la biographie à venir.";

    return (
        <section className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {/* Colonne de gauche : Média */}
                    <div className="space-y-4">
                        {aboutConfig.videoUrl ? (
                            <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
                                <iframe
                                    className="w-full h-full"
                                    src={aboutConfig.videoUrl}
                                    title="Vidéo de présentation"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        ) : aboutConfig.imageUrl ? (
                             <div className="aspect-video w-full relative rounded-lg overflow-hidden shadow-lg">
                                <Image
                                    src={aboutConfig.imageUrl}
                                    alt="Image de présentation"
                                    layout="fill"
                                    objectFit="cover"
                                />
                            </div>
                        ) : null}
                         {aboutConfig.mediaText && (
                            <p className="text-center text-muted-foreground text-sm italic">
                                {aboutConfig.mediaText}
                            </p>
                         )}
                    </div>
                    {/* Colonne de droite : Texte */}
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-bold mb-4">{aboutConfig.title || "À Propos de Moi"}</h2>
                        <p className="text-lg text-muted-foreground whitespace-pre-wrap">
                            {textToDisplay}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

