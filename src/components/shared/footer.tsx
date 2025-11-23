
'use client';

import { Logo } from "./logo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ExternalLink, GitBranch, Facebook, Twitter, Linkedin, Instagram, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgency } from "@/context/agency-provider";
import type { AboutLink, SocialLink } from "@/app/admin/settings/personalization/page";
import { Label } from "../ui/label";
import { useFirestore } from "@/firebase/provider";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking } from "@/firebase";


const iconMap: { [key: string]: React.ComponentType<any> } = {
    GitBranch,
    Briefcase,
};

const socialIconMap: { [key: string]: React.ComponentType<any> } = {
    Facebook,
    Twitter,
    Linkedin,
    Instagram,
};

function QuoteValidationForm() {
    const [quoteNumber, setQuoteNumber] = useState('');
    const [validationCode, setValidationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const handleVerification = async () => {
        if (!quoteNumber || !validationCode) {
            toast({ title: "Erreur", description: "Veuillez remplir tous les champs.", variant: "destructive" });
            return;
        }
        setIsLoading(true);

        try {
            const quotesRef = collection(firestore, `quotes`);
            const q = query(quotesRef, where("quoteNumber", "==", quoteNumber.trim()), where("validationCode", "==", validationCode.trim()));
            
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ title: "Introuvable", description: "Aucun devis ne correspond à ces informations.", variant: "destructive" });
            } else {
                const quoteDoc = querySnapshot.docs[0];
                router.push(`/quote/${quoteDoc.id}`);
            }
        } catch (error) {
            console.error("Error verifying quote:", error);
            toast({ title: "Erreur", description: "Une erreur est survenue lors de la vérification.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Valider un devis</DialogTitle>
                <DialogDescription>
                    Veuillez saisir le numéro du devis et le code de validation que vous avez reçus.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quote-number" className="text-right">
                        N° de devis
                    </Label>
                    <Input id="quote-number" placeholder="DEVIS-2024-..." className="col-span-3" value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="validation-code" className="text-right">
                        Code
                    </Label>
                    <Input id="validation-code" placeholder="Code secret" className="col-span-3" value={validationCode} onChange={(e) => setValidationCode(e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" onClick={handleVerification} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vérifier
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

export function Footer() {
    const { personalization, agency } = useAgency();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactSubject, setContactSubject] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    const [isContactLoading, setIsContactLoading] = useState(false);

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactName || !contactEmail || !contactPhone || !contactSubject || !contactMessage) {
            toast({ title: "Erreur", description: "Veuillez remplir tous les champs.", variant: "destructive" });
            return;
        }
        setIsContactLoading(true);

        try {
            let collectionName = '';
            let data: any = {};
            let successMessage = '';
            
            // Default to contact message
             collectionName = 'contact_messages';
             data = {
                name: contactName,
                email: contactEmail,
                phone: contactPhone,
                subject: contactSubject,
                message: contactMessage,
                status: 'new',
                createdAt: new Date().toISOString(),
                recipientId: 'agency' // General message for the agency
             };
             successMessage = "Votre message a bien été envoyé. Nous vous répondrons dans les plus brefs délais.";


            if (contactSubject === "Données Personnelles") {
                collectionName = 'gdpr_requests';
                 data = {
                    name: contactName,
                    email: contactEmail,
                    phone: contactPhone,
                    subject: contactSubject,
                    message: contactMessage,
                    status: 'new',
                    createdAt: new Date().toISOString(),
                };
                successMessage = "Votre demande concernant vos données personnelles a bien été prise en compte.";
            } else if (contactSubject === "Support") {
                 collectionName = 'support_requests';
                 data = {
                    name: contactName,
                    email: contactEmail,
                    phone: contactPhone,
                    subject: contactSubject,
                    message: contactMessage,
                    status: 'new',
                    createdAt: new Date().toISOString(),
                };
                successMessage = "Votre demande de support a été envoyée. Notre équipe vous répondra bientôt.";
            }
            
            if (collectionName) {
                const collectionRef = collection(firestore, collectionName);
                await addDocumentNonBlocking(collectionRef, data);
                toast({ title: "Demande envoyée", description: successMessage });

                // Reset form
                setContactName('');
                setContactEmail('');
                setContactPhone('');
                setContactSubject('');
                setContactMessage('');
            }

        } catch (error) {
            console.error("Error submitting contact form:", error);
            toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
        } finally {
            setIsContactLoading(false);
        }
    };

    const legalInfo = personalization?.legalInfo || {};
    const aboutTitle = personalization?.footerAboutTitle || "À propos";
    const aboutText = personalization?.footerAboutText || "HOLICA LOC est une plateforme de test qui met en relation des développeurs d'applications avec une communauté de bêta-testeurs qualifiés.";
    const aboutLinks = personalization?.footerAboutLinks as AboutLink[] || [];
    const socialLinks = personalization?.footerSocialLinks as SocialLink[] || [];
    const copyrightText = personalization?.copyrightText || "Vapps.";
    const copyrightUrl = personalization?.copyrightUrl || "/";
    const footerBgColor = personalization?.footerBgColor || '#111827';
    
    const legalMentions = legalInfo?.legalMentions || "";
    const cgv = legalInfo?.cgv || "";
    const privacyPolicy = legalInfo?.privacyPolicy || "";

    const fullAddress = [legalInfo.addressStreet, legalInfo.addressZip, legalInfo.addressCity].filter(Boolean).join(', ');

    const LegalDocumentDialog = ({ title, content }: { title: string, content: string }) => (
      <Dialog>
        <DialogTrigger asChild>
          <button className="block hover:text-white text-secondary text-left">{title}</button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh] w-full">
             <div
                className="prose dark:prose-invert prose-sm sm:prose-base max-w-none p-4"
                dangerouslySetInnerHTML={{ __html: content || "<p>Contenu non disponible.</p>" }}
              />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );

    return (
        <footer style={{ backgroundColor: footerBgColor }} className="text-gray-300 py-12">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left Column */}
                    <div className="md:col-span-4 text-sm">
                        <Logo className="text-white mb-4" />
                        {legalInfo.companyName && <p>{legalInfo.companyName}{legalInfo.capital && ` au capital de ${legalInfo.capital} €`}</p>}
                        {fullAddress && <p>{fullAddress}</p>}
                        <br />
                        {legalInfo.siret && <p>SIRET: {legalInfo.siret}</p>}
                        {legalInfo.rcs && <p>RCS: {legalInfo.rcs}</p>}
                        {legalInfo.apeNaf && <p>Code NAF: {legalInfo.apeNaf}</p>}
                        <br />
                        {legalInfo.email && <p>E-mail: {legalInfo.email}</p>}
                        {legalInfo.phone && <p>Téléphone: {legalInfo.phone}</p>}
                        <br />
                        <div className="space-y-1">
                            <LegalDocumentDialog title="Mentions légales" content={legalMentions} />
                            <LegalDocumentDialog title="Politique de confidentialité" content={privacyPolicy} />
                            <LegalDocumentDialog title="Conditions Générales de Vente" content={cgv} />
                        </div>
                    </div>

                    {/* Middle Column */}
                    <div className="md:col-span-4">
                        <h3 className="font-bold text-white text-lg mb-4">Contactez-nous</h3>
                        <form className="space-y-4" onSubmit={handleContactSubmit}>
                            <Input
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                placeholder="Nom & Prénom"
                                required
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" 
                            />
                            <Input 
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                placeholder="email@example.com"
                                required
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" 
                            />
                            <Input
                                type="tel"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                placeholder="Votre numéro de téléphone"
                                required
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" 
                            />
                            <Select value={contactSubject} onValueChange={setContactSubject} required>
                                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                                    <SelectValue placeholder="Objet de votre demande" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    <SelectItem value="Demande d'information">Demande d'information</SelectItem>
                                    <SelectItem value="Données Personnelles">Données Personnelles</SelectItem>
                                    <SelectItem value="Support">Support</SelectItem>
                                </SelectContent>
                            </Select>
                            <Textarea 
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                                placeholder="Votre message..."
                                required
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]" 
                            />
                             <div className="flex gap-2">
                                <Button type="submit" disabled={isContactLoading}>
                                    {isContactLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Envoyer
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-4">
                        <h3 className="font-bold text-white text-lg mb-4">{aboutTitle}</h3>
                        <p className="text-sm mb-6">{aboutText}</p>
                        <ul className="space-y-3">
                            {aboutLinks.map(link => {
                                const Icon = iconMap[link.icon] || ExternalLink;
                                return (
                                    <li key={link.id}>
                                        <Link href={link.url} className="flex items-center gap-2 hover:text-white text-secondary">
                                            <Icon className="h-4 w-4" />
                                            <span>{link.text}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="mt-8">
                            <h4 className="font-bold text-white text-lg mb-4">Suivez-nous</h4>
                            <div className="flex items-center gap-4">
                                {socialLinks.filter(link => link.url).map(link => {
                                    const Icon = socialIconMap[link.icon];
                                    return (
                                        <Link key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                                            <Icon className="h-6 w-6" />
                                            <span className="sr-only">{link.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-12 pt-6 text-center text-sm">
                    <p>© {new Date().getFullYear()} - <Link href={copyrightUrl} className="hover:text-white">{copyrightText}</Link></p>
                </div>
            </div>
        </footer>
    );
}
