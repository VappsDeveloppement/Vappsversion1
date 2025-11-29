
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
import { LiveFollowUpForm } from './live-follow-up-form';
import { useAgency } from '@/context/agency-provider';


type Event = {
    id: string;
    title: string;
    date: string;
    isPublic: boolean;
    counselorId: string;
};

type OtherActivityItem = {
    id: string;
    title: string;
    description: string;
    imageUrl: string | null;
};


export function OtherActivitiesSection() {
    const { personalization, agency, isLoading: isAgencyLoading } = useAgency();
    const firestore = useFirestore();

    const otherActivitiesSettings = personalization?.otherActivitiesSection;
    
    const eventsQuery = useMemoFirebase(() => {
        return query(
            collection(firestore, 'events'),
            where('isPublic', '==', true)
        );
    }, [firestore]);

    const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsQuery);

    const { title, description, activities } = otherActivitiesSettings || {};
    const eventsButtonText = otherActivitiesSettings?.eventsButtonText || "J'ai participé à un live";
    const primaryColor = personalization?.primaryColor || '#10B981';

    const isLoading = isAgencyLoading || areEventsLoading;

    if (isLoading) {
        return (
            <section className="bg-background text-foreground py-16 sm:py-24">
                <div className="container mx-auto px-4">
                    <Skeleton className="h-10 w-1/3 mx-auto mb-4" />
                    <Skeleton className="h-6 w-1/2 mx-auto mb-12" />
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                        <div className="lg:col-span-3 space-y-8">
                            <Skeleton className="h-48 w-full" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                        <div className="lg:col-span-2 space-y-8">
                             <Skeleton className="h-48 w-full" />
                             <Skeleton className="h-64 w-full" />
                        </div>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className="bg-background text-foreground py-16 sm:py-24">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                    <div className="lg:col-span-3">
                        <div className="mb-8">
                            <h2 className="text-3xl lg:text-4xl font-bold">{title || "Nos autres activités"}</h2>
                            <p className="text-muted-foreground mt-2">
                                {description || "Nous accompagnons également les entreprises dans leur transformation."}
                            </p>
                        </div>
                        <div className="space-y-8">
                            {(activities || []).map((activity: OtherActivityItem) => (
                                <Card key={activity.id} className="overflow-hidden group">
                                    <div className="flex flex-col sm:flex-row">
                                        {activity.imageUrl && (
                                            <div className="sm:w-1/3 relative h-48 sm:h-auto overflow-hidden">
                                                <Image
                                                    src={activity.imageUrl}
                                                    alt={activity.title}
                                                    fill
                                                    sizes="(max-width: 640px) 100vw, 33vw"
                                                    className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                                />
                                            </div>
                                        )}
                                        <CardContent className="p-6 sm:w-2/3 flex flex-col justify-center">
                                            <h3 className="font-bold text-xl mb-2">{activity.title}</h3>
                                            <p className="text-muted-foreground whitespace-pre-wrap">{activity.description}</p>
                                        </CardContent>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-8">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Calendar className="h-6 w-6 text-primary" />
                                    <h3 className="font-bold text-xl">Prochains Événements</h3>
                                </div>
                                <div className="space-y-3">
                                    {events && events.length > 0 ? (
                                        events.map((event) => (
                                            <Link key={event.id} href={`/events/${event.id}`} className="block hover:bg-muted/50 p-2 rounded-md transition-colors">
                                                <div className="flex justify-between items-center text-sm">
                                                    <p className="font-medium">{event.title}</p>
                                                    <p className="text-primary font-semibold">{new Date(event.date).toLocaleDateString()}</p>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">Aucun événement public à venir.</p>
                                    )}
                                </div>
                                
                                <LiveFollowUpForm counselorId={agency?.id || 'vapps-agency'}>
                                  <Button className="w-full mt-6" style={{ backgroundColor: primaryColor }}>
                                    {eventsButtonText}
                                  </Button>
                                </LiveFollowUpForm>
                               
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    );
}
