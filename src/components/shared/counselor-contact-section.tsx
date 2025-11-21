
'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';

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
    miniSite?: {
        contactSection?: {
            enabled?: boolean;
            title?: string;
            subtitle?: string;
        }
    };
    dashboardTheme?: {
        primaryColor?: string;
    }
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

    const fullAddress = [counselor.address, counselor.zipCode, counselor.city].filter(Boolean).join(', ');

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
                        <h3 className="text-2xl font-bold mb-6">{counselor.firstName} {counselor.lastName}</h3>
                        {counselor.publicTitle && <p className="text-primary font-semibold mb-6">{counselor.publicTitle}</p>}
                        
                        <div className="space-y-4 text-muted-foreground">
                            {fullAddress && (
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <span>{fullAddress}</span>
                                </div>
                            )}
                            {counselor.email && (
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-primary" />
                                    <a href={`mailto:${counselor.email}`} className="hover:underline">{counselor.email}</a>
                                </div>
                            )}
                             {counselor.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-primary" />
                                    <a href={`tel:${counselor.phone}`} className="hover:underline">{counselor.phone}</a>
                                </div>
                            )}
                        </div>
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
