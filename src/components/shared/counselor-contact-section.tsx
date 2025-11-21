
'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type ContactLink = {
    text: string;
    url: string;
};

type EventItem = {
    id: string;
    title: string;
    date: string;
}

type CounselorProfile = {
    miniSite?: {
        contactSection?: {
            enabled?: boolean;
            title?: string;
            text?: string;
            imageUrl?: string;
            videoUrl?: string;
            links?: ContactLink[];
            events?: EventItem[];
            eventsButtonText?: string;
            eventsButtonLink?: string;
        }
    };
};

export function CounselorContactSection({ counselor }: { counselor: CounselorProfile }) {
    const contactConfig = counselor.miniSite?.contactSection || {};
    const { enabled, title, text, imageUrl, videoUrl, links, events, eventsButtonText, eventsButtonLink } = contactConfig;

    if (!enabled) {
        return null;
    }

    const renderMedia = () => {
        if (videoUrl) {
            return (
                 <div className="aspect-video w-full mb-6">
                    <iframe
                        className="w-full h-full rounded-lg shadow-lg"
                        src={videoUrl.replace("watch?v=", "embed/")}
                        title={title || "Vidéo de présentation"}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            )
        }
        if (imageUrl) {
            return (
                <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden">
                    <Image
                        src={imageUrl}
                        alt={title || "Image de présentation"}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="presentation activities"
                    />
                </div>
            )
        }
        return null;
    }

    return (
        <section id="activities" className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold">{title || "Autres Activités"}</h2>
                    {text && <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{text}</p>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    {/* Left Column: Media */}
                    <div>
                        {renderMedia()}
                    </div>
                    
                    {/* Right Column: Events */}
                    <div>
                         <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Prochains Événements
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {events && events.length > 0 ? (
                                    <ul className="space-y-4">
                                        {events.map((event) => (
                                            <li key={event.id} className="flex justify-between items-center">
                                                <span className="font-medium">{event.title}</span>
                                                <span className="text-sm text-primary font-semibold">{event.date}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Aucun événement à venir pour le moment.
                                    </p>
                                )}
                            </CardContent>
                            {(eventsButtonText && eventsButtonLink) && (
                                <CardFooter>
                                    <Button asChild className="w-full">
                                        <Link href={eventsButtonLink}>
                                            {eventsButtonText} <ArrowRight className="ml-2 h-4 w-4"/>
                                        </Link>
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    );
}

