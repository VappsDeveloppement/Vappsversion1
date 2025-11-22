
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.86-.95-6.69-2.81-1.77-1.8-2.94-4.06-3.27-6.5-.05-1.55.29-3.08 1.02-4.48 1.35-2.51 3.73-4.17 6.42-4.81 1.03-.24 2.12-.31 3.2-.31h.01v4.24c-1.11.02-2.22.02-3.33.05-.62.01-1.24.08-1.86.15-.58.07-1.15.25-1.7.48-1.04.44-1.92 1.2-2.49 2.19-.47.81-.69 1.74-.78 2.68-.04.46-.06.92-.06 1.38 0 .23.01.46.02.69.02.44.1.88.23 1.3.17.58.45 1.12.82 1.62.87 1.17 2.22 1.93 3.64 2.16.6.1 1.21.16 1.82.16.96 0 1.91-.18 2.81-.52.9-.33 1.71-.85 2.39-1.5.59-.57.99-1.29 1.2-2.09.18-.69.24-1.4.24-2.1v-8.86c.01-.25.02-.5.02-.75 0-.23-.01-.46-.02-.69-.02-.44-.1-.88-.23-1.3-.17-.58-.45-1.12-.82-1.62-.87-1.17-2.22-1.93-3.64-2.16-.6-.1-1.21.16-1.82.16-.96 0-1.91-.18-2.81-.52-.9-.33-1.71-.85-2.39-1.5-.59-.57-.99-1.29-1.2-2.09-.18-.69-.24-1.4-.24-2.1.02-.85.13-1.69.34-2.51.53-2.01 2-3.66 3.96-4.54.75-.35 1.56-.56 2.39-.65.2-.02.4-.03.6-.03Z" />
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
