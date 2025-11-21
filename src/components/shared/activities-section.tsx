
'use client';

import React from 'react';
import Image from 'next/image';

type CounselorProfile = {
    publicBio?: string;
    miniSite?: {
        activitiesSection?: {
            enabled?: boolean;
            imageUrl?: string;
            videoUrl?: string;
            title?: string;
            text?: string;
        }
    };
};

export function ActivitiesSection({ counselor }: { counselor: CounselorProfile }) {
    const activitiesConfig = counselor.miniSite?.activitiesSection || {};
    
    if (!activitiesConfig.enabled) {
        return null;
    }

    const title = activitiesConfig.title || "Mes Activités";
    const textToDisplay = activitiesConfig.text || "Présentation de mes activités à venir.";
    const imageUrl = activitiesConfig.imageUrl;
    const videoUrl = activitiesConfig.videoUrl;

    const renderMedia = () => {
        if (videoUrl) {
            return (
                 <div className="aspect-video w-full">
                    <iframe
                        className="w-full h-full rounded-lg shadow-lg"
                        src={videoUrl.replace("watch?v=", "embed/")}
                        title="Vidéo de présentation des activités"
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
                        data-ai-hint="presentation activities"
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
