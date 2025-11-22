

'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Loader2, Building, Briefcase, Linkedin, Facebook, Instagram, Youtube, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import Link from 'next/link';

type CounselorProfile = {
    id: string;
    firstName: string;
    lastName: string;
    publicTitle?: string;
    email: string;
    phone?: string;
    city?: string;
    address?: string;
    zipCode?: string;
    commercialName?: string;
    siret?: string;
    miniSite?: {
        contactSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
            commercialName?: string;
            siret?: string;
            address?: string;
            zipCode?: string;
            city?: string;
            email?: string;
            phone?: string;
            socialLinks?: {
                facebook?: string;
                instagram?: string;
                x?: string;
                linkedin?: string;
                tiktok?: string;
                youtube?: string;
            }
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    }
};

const socialIconMap = {
    linkedin: Linkedin,
    facebook: Facebook,
    instagram: Instagram,
    x: Twitter,
    youtube: Youtube,
    tiktok: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary">
        <path d="M12.52.02C13.84 0 15.14.32 16.2 1.02a8.03 8.03 0 0 1 4.78 4.78c.7 1.06 1.02 2.36 1.02 3.68s-.32 2.62-1.02 3.68a8.03 8.03 0 0 1-4.78 4.78c-1.06.7-2.36 1.02-3.68 1.02s-2.62-.32-3.68-1.02a8.03 8.03 0 0 1-4.78-4.78c-.7-1.06-1.02-2.36-1.02-3.68s.32-2.62 1.02-3.68a8.03 8.03 0 0 1 4.78-4.78C9.9 0.32 11.2 0 12.52 0.02Z"/>
        <path d="M12.52 0.02C13.84 0 15.14.32 16.2 1.02a8.03 8.03 0 0 1 4.78 4.78c.7 1.06 1.02 2.36 1.02 3.68s-.32 2.62-1.02 3.68a8.03 8.03 0 0 1-4.78 4.78c-1.06.7-2.36 1.02-3.68 1.02s-2.62-.32-3.68-1.02a8.03 8.03 0 0 1-4.78-4.78c-.7-1.06-1.02-2.36-1.02-3.68s.32-2.62 1.02-3.68a8.03 8.03 0 0 1 4.78-4.78C9.9 0.32 11.2 0 12.52 0.02Z"/>
        <path d="m8.5 7.5.9-2.5 3.3 2.8 2-2.6"/>
      </svg>
    )
};

export function CounselorContactSection({ counselor }: { counselor: CounselorProfile }) {
    const contactConfig = counselor.miniSite?.contactSection || {};
    const { toast } = useToast();
    const firestore = useFirestore();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!contactConfig.enabled) {
        return null;
    }

    const info = {
        commercialName: contactConfig.commercialName,
        siret: contactConfig.siret,
        address: contactConfig.address,
        zipCode: contactConfig.zipCode,
        city: contactConfig.city,
        email: contactConfig.email,
        phone: contactConfig.phone,
        socialLinks: contactConfig.socialLinks,
    };

    const fullAddress = [info.address, info.zipCode, info.city].filter(Boolean).join(', ');
    const socialLinksEntries = Object.entries(info.socialLinks || {}).filter(([_, url]) => url);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await addDocumentNonBlocking(collection(firestore, 'gdpr_requests'), {
                counselorId: counselor.id,
                name,
                email,
                phone,
                subject,
                message,
                status: 'new',
                createdAt: new Date().toISOString(),
            });
            toast({ title: "Message envoyé", description: "Votre message a été envoyé avec succès au conseiller." });
            // Reset form
            setName('');
            setEmail('');
            setPhone('');
            setSubject('');
            setMessage('');
        } catch (error) {
            console.error("Error sending contact form:", error);
            toast({ title: "Erreur", description: "Impossible d'envoyer votre message.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="py-16 sm:py-24 bg-white" id="contact">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold">{contactConfig.title || "Contactez-moi"}</h2>
                    {contactConfig.subtitle && <p className="text-lg text-muted-foreground mt-2">{contactConfig.subtitle}</p>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: Counselor Info */}
                    <div className="bg-muted p-8 rounded-lg">
                        <h3 className="text-2xl font-bold mb-2">{counselor.firstName} {counselor.lastName}</h3>
                        {counselor.publicTitle && <p className="font-semibold mb-6" style={{color: counselor.dashboardTheme?.primaryColor}}>{counselor.publicTitle}</p>}
                        
                        <div className="space-y-4 text-muted-foreground">
                            {info.commercialName && (
                                <div className="flex items-center gap-3">
                                    <Building className="h-5 w-5 text-primary" />
                                    <span>{info.commercialName}</span>
                                </div>
                            )}
                             {info.siret && (
                                <div className="flex items-center gap-3">
                                    <Briefcase className="h-5 w-5 text-primary" />
                                    <span>SIRET: {info.siret}</span>
                                </div>
                            )}
                            {fullAddress && (
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <span>{fullAddress}</span>
                                </div>
                            )}
                            {info.email && (
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-primary" />
                                    <a href={`mailto:${info.email}`} className="hover:underline">{info.email}</a>
                                </div>
                            )}
                             {info.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-primary" />
                                    <a href={`tel:${info.phone}`} className="hover:underline">{info.phone}</a>
                                </div>
                            )}
                        </div>

                        {socialLinksEntries.length > 0 && (
                            <div className="mt-8 pt-6 border-t">
                                <h4 className="font-semibold mb-4">Suivez-moi</h4>
                                <div className="flex flex-wrap gap-4">
                                    {socialLinksEntries.map(([network, url]) => {
                                        const Icon = socialIconMap[network as keyof typeof socialIconMap];
                                        return Icon ? (
                                            <a key={network} href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                                <Icon className="h-6 w-6" />
                                            </a>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Contact Form */}
                    <div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="contact-name">Nom complet</Label>
                                    <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-email">Email</Label>
                                    <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="contact-phone">Téléphone</Label>
                                    <Input id="contact-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-subject">Sujet</Label>
                                    <Input id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-message">Message</Label>
                                <Textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required />
                            </div>
                            <Button type="submit" disabled={isLoading} className="w-full" style={{ backgroundColor: counselor.dashboardTheme?.primaryColor }}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Envoyer le message
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
