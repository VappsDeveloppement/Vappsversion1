

'use client';

import { Logo } from "./logo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ExternalLink, GitBranch, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import type { AboutLink, SocialLink } from "@/app/dashboard/settings/personalization/page";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LegalInfoProps {
  companyName?: string;
  addressStreet?: string;
  addressZip?: string;
  addressCity?: string;
  siret?: string;
  rcs?: string;
  apeNaf?: string;
  email?: string;
  phone?: string;
  capital?: string;
}

const defaultLegalInfo: LegalInfoProps = {
    companyName: "SARL au capital de 1000 €",
    addressStreet: "123 Rue de la République",
    addressZip: "75001",
    addressCity: "Paris",
    siret: "12345678901234",
    rcs: "Paris B 123 456 789",
    apeNaf: "6201Z",
    email: "contact@vapps.test",
    phone: "01 23 45 67 89",
};

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

export function Footer() {
    
    const [legalInfo, setLegalInfo] = useState<LegalInfoProps>(defaultLegalInfo);
    const [aboutTitle, setAboutTitle] = useState("À propos");
    const [aboutText, setAboutText] = useState("HOLICA LOC est une plateforme de test qui met en relation des développeurs d'applications avec une communauté de bêta-testeurs qualifiés.");
    const [aboutLinks, setAboutLinks] = useState<AboutLink[]>([
        { id: 1, text: "Notre mission", url: "#", icon: "GitBranch" },
        { id: 2, text: "Carrières", url: "#", icon: "Briefcase" },
    ]);
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [copyrightText, setCopyrightText] = useState("Vapps.");
    const [copyrightUrl, setCopyrightUrl] = useState("/");
    
    const [legalMentions, setLegalMentions] = useState("");
    const [cgv, setCgv] = useState("");
    const [privacyPolicy, setPrivacyPolicy] = useState("");


    useEffect(() => {
        const updateContent = () => {
            if (typeof window !== 'undefined') {
                const storedLegalInfo = localStorage.getItem('legalInfo');
                if (storedLegalInfo) {
                    try {
                        const parsedInfo = JSON.parse(storedLegalInfo);
                        setLegalInfo(parsedInfo);
                        setLegalMentions(parsedInfo.legalMentions || "");
                        setCgv(parsedInfo.cgv || "");
                        setPrivacyPolicy(parsedInfo.privacyPolicy || "");
                    } catch (e) {
                        console.error("Failed to parse legal info from localStorage", e);
                    }
                }

                const storedTitle = localStorage.getItem('footerAboutTitle');
                const storedText = localStorage.getItem('footerAboutText');
                const storedLinks = localStorage.getItem('footerAboutLinks');
                const storedSocialLinks = localStorage.getItem('footerSocialLinks');
                const storedCopyrightText = localStorage.getItem('copyrightText');
                const storedCopyrightUrl = localStorage.getItem('copyrightUrl');

                if (storedTitle) setAboutTitle(storedTitle);
                if (storedText) setAboutText(storedText);
                if (storedLinks) {
                    try {
                        setAboutLinks(JSON.parse(storedLinks));
                    } catch (e) {
                        console.error("Failed to parse footer links from localStorage", e);
                    }
                }
                if (storedSocialLinks) {
                    try {
                        setSocialLinks(JSON.parse(storedSocialLinks));
                    } catch (e) {
                        console.error("Failed to parse social links from localStorage", e);
                    }
                }
                if (storedCopyrightText) setCopyrightText(storedCopyrightText);
                if (storedCopyrightUrl) setCopyrightUrl(storedCopyrightUrl);
            }
        };

        updateContent();
        window.addEventListener('storage', updateContent);
        return () => window.removeEventListener('storage', updateContent);
    }, []);

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
        <footer className="bg-gray-900 text-gray-300 py-12">
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
                        <form className="space-y-4">
                            <Input 
                                type="email" 
                                placeholder="email@example.com" 
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" 
                            />
                            <Select>
                                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                                    <SelectValue placeholder="Demande d'information" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    <SelectItem value="info">Demande d'information</SelectItem>
                                    <SelectItem value="partnership">Partenariat</SelectItem>
                                    <SelectItem value="support">Support</SelectItem>
                                </SelectContent>
                            </Select>
                            <Textarea 
                                placeholder="Votre message..." 
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]" 
                            />
                            <Button>
                                Envoyer
                            </Button>
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
