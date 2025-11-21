
'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Send, Link as LinkIcon, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

type ContactLink = {
    text: string;
    url: string;
};

type CounselorProfile = {
    miniSite?: {
        contactSection?: {
            enabled?: boolean;
            title?: string;
            text?: string;
            imageUrl?: string;
            videoUrl?: string;
            links?: ContactLink[];
        }
    };
};

export function CounselorContactSection({ counselor }: { counselor: CounselorProfile }) {
    const contactConfig = counselor.miniSite?.contactSection || {};
    const { enabled, title, text, imageUrl, videoUrl, links } = contactConfig;

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
                <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden">
                    <Image
                        src={imageUrl}
                        alt={title || "Image de contact"}
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
        <section id="contact" className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold">{title || "Contactez-moi"}</h2>
                    {text && <p className="text-muted-foreground mt-2">{text}</p>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    <div>
                        {renderMedia()}
                        {links && links.length > 0 && (
                            <div className="space-y-3">
                                {links.map((link, index) => (
                                    <Button key={index} asChild variant="link" className="text-lg p-0 h-auto justify-center md:justify-start">
                                        <Link href={link.url} target="_blank" rel="noopener noreferrer">
                                            <LinkIcon className="mr-2 h-4 w-4" />
                                            {link.text}
                                        </Link>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-8">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Prochains Événements
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Cette section affichera la liste de vos prochains événements.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="h-full">
                             <CardHeader>
                                <CardTitle>Envoyer un message</CardTitle>
                            </CardHeader>
                            <CardContent>
                                 <form className="space-y-4">
                                    <Input placeholder="Nom &amp; Prénom" />
                                    <Input type="tel" placeholder="Téléphone" />
                                    <Input type="email" placeholder="Email" />
                                    <Textarea placeholder="Votre message..." rows={3} />
                                    <Button className="w-full">
                                        <Send className="mr-2 h-4 w-4" />
                                        Envoyer
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    );
}
