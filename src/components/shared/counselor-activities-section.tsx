
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle } from 'lucide-react';
import type { InterestItem } from '@/app/dashboard/settings/mini-site/page';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from '../ui/skeleton';

type Event = {
    id: string;
    title: string;
    date: string;
    isPublic: boolean;
};

type CounselorProfile = {
    id: string;
    miniSite?: {
        activitiesSection?: {
            enabled?: boolean;
            title?: string;
            text?: string;
            mediaType?: 'image' | 'video';
            imageUrl?: string;
            videoUrl?: string;
            interestsTitle?: string;
            interests?: InterestItem[];
            eventsButtonText?: string;
            eventsButtonLink?: string;
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    }
};

export function CounselorActivitiesSection({ counselor }: { counselor: CounselorProfile }) {
    const firestore = useFirestore();
    const activitiesConfig = counselor.miniSite?.activitiesSection || {};
    const primaryColor = counselor.dashboardTheme?.primaryColor || '#10B981';

    const { 
        enabled,
        title,
        text,
        mediaType,
        imageUrl,
        videoUrl,
        interestsTitle,
        interests,
        eventsButtonText,
        eventsButtonLink
    } = activitiesConfig;

    const eventsQuery = useMemoFirebase(() => {
        if (!counselor.id) return null;
        return query(
            collection(firestore, 'events'),
            where('counselorId', '==', counselor.id),
            where('isPublic', '==', true)
        );
    }, [firestore, counselor.id]);

    const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);


    if (!enabled) {
        return null;
    }
    
    return (
        <section className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4">
                 <div className="text-center mb-12">
                    {title && <h2 className="text-3xl lg:text-4xl font-bold">{title}</h2>}
                    {text && <p className="text-lg text-muted-foreground mt-2">{text}</p>}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    <div className="space-y-8">
                        {mediaType === 'video' && videoUrl ? (
                            <div className="aspect-video w-full">
                                <iframe
                                    className="w-full h-full rounded-lg shadow-lg"
                                    src={videoUrl.includes('embed') ? videoUrl : `https://www.youtube.com/embed/${videoUrl.split('v=')[1]}`}
                                    title="Vidéo de présentation"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        ) : mediaType === 'image' && imageUrl ? (
                            <div className="w-full h-80 relative rounded-lg overflow-hidden shadow-lg">
                                <Image
                                    src={imageUrl}
                                    alt={title || "Image d'activité"}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ) : null}

                        {interests && interests.length > 0 && (
                             <div>
                                {interestsTitle && <h3 className="text-2xl font-bold mb-4">{interestsTitle}</h3>}
                                <div className="flex flex-wrap gap-3">
                                    {interests.map((interest) => {
                                        const Wrapper = interest.link ? Link : 'div';
                                        const props = interest.link ? { href: interest.link, target: '_blank', rel: 'noopener noreferrer' } : {};
                                        
                                        return (
                                            <Wrapper key={interest.id} {...props}>
                                                <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2 text-sm cursor-pointer hover:bg-muted/80">
                                                    <CheckCircle className="h-4 w-4" style={{ color: primaryColor }} />
                                                    <span>{interest.text}</span>
                                                </div>
                                            </Wrapper>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className='flex flex-col h-full'>
                        <Card className="flex-1 flex flex-col">
                            <CardContent className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center gap-3 mb-6">
                                    <Calendar className="h-6 w-6" style={{ color: primaryColor }} />
                                    <h3 className="font-bold text-xl">Prochains Événements</h3>
                                </div>
                                <div className="space-y-4 flex-1">
                                    {areEventsLoading ? (
                                        <div className="space-y-3">
                                            <Skeleton className="h-6 w-full" />
                                            <Skeleton className="h-6 w-3/4" />
                                        </div>
                                    ) : (events && events.length > 0) ? events.map((event) => (
                                        <div key={event.id} className="flex justify-between items-center text-sm">
                                            <p className="font-medium">{event.title}</p>
                                            <p style={{ color: primaryColor }} className="font-semibold shrink-0 ml-4">{new Date(event.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}</p>
                                        </div>
                                    )) : (
                                        <p className='text-muted-foreground text-sm'>Aucun événement à venir.</p>
                                    )}
                                </div>
                                {eventsButtonText && eventsButtonLink && (
                                    <Button asChild className="w-full mt-6" style={{ backgroundColor: primaryColor }}>
                                        <Link href={eventsButtonLink}>{eventsButtonText}</Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </section>
    );
}
