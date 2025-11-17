
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
            title?: string;
            text?: string;
            imageUrl?: string;
            links?: ContactLink[];
        };
    };
};

export function CounselorContactSection({ counselor }: { counselor: CounselorProfile }) {
    const contactConfig = counselor.miniSite?.contactSection || {};
    const { title, text, imageUrl, links } = contactConfig;

    return (
        <section id="contact" className="py-16 sm:py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                    {/* Colonne 1: Infos & Liens */}
                    <div className="text-center md:text-left">
                        {imageUrl && (
                            <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden">
                                <Image
                                    src={imageUrl}
                                    alt={title || "Image de contact"}
                                    layout="fill"
                                    objectFit="cover"
                                />
                            </div>
                        )}
                        <h2 className="text-3xl font-bold mb-4">{title || "Contactez-moi"}</h2>
                        <p className="text-muted-foreground mb-6 whitespace-pre-wrap">
                            {text || "N'hésitez pas à me contacter pour toute question ou pour démarrer votre accompagnement."}
                        </p>
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
                    
                    {/* Colonne 2: Événements */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Mes événements
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Cette section affichera la liste de vos prochains événements.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Colonne 3: Formulaire */}
                    <Card className="h-full">
                         <CardHeader>
                            <CardTitle>Envoyer un message</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <form className="space-y-4">
                                <Input placeholder="Nom & Prénom" />
                                <Input type="tel" placeholder="Téléphone" />
                                <Input type="email" placeholder="Email" />
                                <Textarea placeholder="Votre message..." rows={5} />
                                <Button className="w-full">
                                    <Send className="mr-2 h-4 w-4" />
                                    Envoyer
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}
