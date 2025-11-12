
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import React, { useEffect, useRef, useState } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GitBranch, Briefcase, PlusCircle, Trash2, Upload, Facebook, Twitter, Linkedin, Instagram, Settings, LayoutTemplate, GripVertical } from "lucide-react";
import Image from "next/image";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';


const defaultAppearanceSettings = {
    appTitle: "VApps",
    appSubtitle: "Développement",
    logoWidth: 40,
    logoHeight: 40,
    logoDisplay: "app-and-logo",
    primaryColor: "#2ff40a",
    secondaryColor: "#25d408",
    bgColor: "#ffffff",
    logoPreview: "/vapps.png",
    logoDataUrl: null as string | null,
};

const defaultFooterAboutSettings = {
  title: "À propos",
  text: "HOLICA LOC est une plateforme de test qui met en relation des développeurs d'applications avec une communauté de bêta-testeurs qualifiés.",
  links: [
    { id: 1, text: "Notre mission", url: "#", icon: "GitBranch" },
    { id: 2, text: "Carrières", url: "#", icon: "Briefcase" },
  ]
};

const defaultSocialLinks = [
    { id: 1, name: 'Facebook', url: '', icon: 'Facebook' },
    { id: 2, name: 'Twitter', url: '', icon: 'Twitter' },
    { id: 3, name: 'LinkedIn', url: '', icon: 'Linkedin' },
    { id: 4, name: 'Instagram', url: '', icon: 'Instagram' },
];

const defaultCopyrightSettings = {
    text: "Vapps.",
    url: "/",
};

// Helper function to convert hex to HSL
const hexToHsl = (hex: string): string => {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return '0 0% 0%'; // fallback for invalid hex
  }

  let c = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const num = parseInt(c.join(''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  
  const r_ = r / 255, g_ = g / 255, b_ = b / 255;
  const max = Math.max(r_, g_, b_), min = Math.min(r_, g_, b_);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r_: h = (g_ - b_) / d + (g_ < b_ ? 6 : 0); break;
      case g_: h = (b_ - r_) / d + 2; break;
      case b_: h = (r_ - g_) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
};

// Helper to convert file to Base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
});

export type AboutLink = {
  id: number;
  text: string;
  url: string;
  icon: string;
};

export type SocialLink = {
  id: number;
  name: string;
  url: string;
  icon: string;
};

const socialIconMap: { [key: string]: React.ComponentType<any> } = {
    Facebook,
    Twitter,
    Linkedin,
    Instagram,
};

export type Section = {
  id: string;
  label: string;
  enabled: boolean;
};

const defaultHomePageSections: Section[] = [
  { id: 'about', label: 'À propos (Trouver votre voie)', enabled: true },
  { id: 'parcours', label: 'Parcours de transformation', enabled: true },
  { id: 'cta', label: 'Appel à l\'action (CTA)', enabled: true },
  { id: 'video', label: 'Vidéo', enabled: true },
  { id: 'shop', label: 'Boutique', enabled: true },
  { id: 'services', label: 'Accompagnements', enabled: true },
  { id: 'otherActivities', label: 'Autres activités & Contact', enabled: true },
  { id: 'blog', label: 'Blog', enabled: true },
  { id: 'whiteLabel', label: 'Marque Blanche', enabled: true },
  { id: 'pricing', label: 'Formules (Tarifs)', enabled: true },
];


export default function PersonalizationPage() {
  const { toast } = useToast();

  // State for "Infos Légales"
  const [companyName, setCompanyName] = useState("");
  const [structureType, setStructureType] = useState("");
  const [capital, setCapital] = useState("");
  const [siret, setSiret] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [apeNaf, setApeNaf] = useState("");
  const [rm, setRm] = useState("");
  const [rcs, setRcs] = useState("");
  const [nda, setNda] = useState("");
  const [insurance, setInsurance] = useState("");
  const [isVatSubject, setIsVatSubject] = React.useState(false);
  const [vatRate, setVatRate] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [legalMentions, setLegalMentions] = React.useState("");
  const [cgv, setCgv] = React.useState("");
  const [privacyPolicy, setPrivacyPolicy] = React.useState("");
  
  // State for "Apparence" tab
  const [appTitle, setAppTitle] = React.useState(defaultAppearanceSettings.appTitle);
  const [appSubtitle, setAppSubtitle] = React.useState(defaultAppearanceSettings.appSubtitle);
  const [logoWidth, setLogoWidth] = React.useState(defaultAppearanceSettings.logoWidth);
  const [logoHeight, setLogoHeight] = React.useState(defaultAppearanceSettings.logoHeight);
  const [logoDisplay, setLogoDisplay] = React.useState(defaultAppearanceSettings.logoDisplay);
  const [primaryColor, setPrimaryColor] = React.useState(defaultAppearanceSettings.primaryColor);
  const [secondaryColor, setSecondaryColor] = React.useState(defaultAppearanceSettings.secondaryColor);
  const [bgColor, setBgColor] = React.useState(defaultAppearanceSettings.bgColor);

  const [logoPreview, setLogoPreview] = React.useState(defaultAppearanceSettings.logoPreview);
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(defaultAppearanceSettings.logoDataUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Footer "À Propos" section
  const [footerAboutTitle, setFooterAboutTitle] = useState(defaultFooterAboutSettings.title);
  const [footerAboutText, setFooterAboutText] = useState(defaultFooterAboutSettings.text);
  const [footerAboutLinks, setFooterAboutLinks] = useState<AboutLink[]>(defaultFooterAboutSettings.links);

  // State for Social Links
  const [footerSocialLinks, setFooterSocialLinks] = useState<SocialLink[]>(defaultSocialLinks);

  // State for Copyright
  const [copyrightText, setCopyrightText] = useState(defaultCopyrightSettings.text);
  const [copyrightUrl, setCopyrightUrl] = useState(defaultCopyrightSettings.url);
  
  // State for Home Page
  const [homePageVersion, setHomePageVersion] = React.useState('tunnel');
  const [homePageSections, setHomePageSections] = useState<Section[]>(defaultHomePageSections);

  const handleSaveLegalInfo = () => {
    if (typeof window !== 'undefined') {
        const legalInfo = {
            companyName, structureType, capital, siret, addressStreet, addressZip, addressCity,
            email, phone, apeNaf, rm, rcs, nda, insurance, isVatSubject, vatRate, vatNumber,
            legalMentions, cgv, privacyPolicy
        };
        localStorage.setItem('legalInfo', JSON.stringify(legalInfo));
        toast({ title: "Informations légales enregistrées", description: "Vos informations légales ont été sauvegardées." });
        window.dispatchEvent(new Event('storage'));
    }
  };

  const handleAppearanceSave = () => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('appTitle', appTitle);
        localStorage.setItem('appSubtitle', appSubtitle);
        localStorage.setItem('logoDisplay', logoDisplay);
        localStorage.setItem('logoWidth', String(logoWidth));
        localStorage.setItem('logoHeight', String(logoHeight));
        if (logoDataUrl) {
            localStorage.setItem('logoDataUrl', logoDataUrl);
        } else {
            localStorage.removeItem('logoDataUrl');
        }
        
        localStorage.setItem('footerAboutTitle', footerAboutTitle);
        localStorage.setItem('footerAboutText', footerAboutText);
        localStorage.setItem('footerAboutLinks', JSON.stringify(footerAboutLinks));
        localStorage.setItem('footerSocialLinks', JSON.stringify(footerSocialLinks));
        localStorage.setItem('copyrightText', copyrightText);
        localStorage.setItem('copyrightUrl', copyrightUrl);

        localStorage.setItem('homePageVersion', homePageVersion);

        window.dispatchEvent(new Event('storage')); 
        toast({ title: "Paramètres enregistrés", description: "Vos paramètres d'apparence et de page d'accueil ont été sauvegardés." });
    }
  };

  const handleResetAppearance = () => {
      setAppTitle(defaultAppearanceSettings.appTitle);
      setAppSubtitle(defaultAppearanceSettings.appSubtitle);
      setLogoWidth(defaultAppearanceSettings.logoWidth);
      setLogoHeight(defaultAppearanceSettings.logoHeight);
      setLogoDisplay(defaultAppearanceSettings.logoDisplay);
      setPrimaryColor(defaultAppearanceSettings.primaryColor);
      setSecondaryColor(defaultAppearanceSettings.secondaryColor);
      setBgColor(defaultAppearanceSettings.bgColor);
      setLogoPreview(defaultAppearanceSettings.logoPreview);
      setLogoDataUrl(defaultAppearanceSettings.logoDataUrl);

      setFooterAboutTitle(defaultFooterAboutSettings.title);
      setFooterAboutText(defaultFooterAboutSettings.text);
      setFooterAboutLinks(defaultFooterAboutSettings.links);
      setFooterSocialLinks(defaultSocialLinks);
      setCopyrightText(defaultCopyrightSettings.text);
      setCopyrightUrl(defaultCopyrightSettings.url);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('appTitle', defaultAppearanceSettings.appTitle);
        localStorage.setItem('appSubtitle', defaultAppearanceSettings.appSubtitle);
        localStorage.setItem('logoDisplay', defaultAppearanceSettings.logoDisplay);
        localStorage.setItem('logoWidth', String(defaultAppearanceSettings.logoWidth));
        localStorage.setItem('logoHeight', String(defaultAppearanceSettings.logoHeight));
        localStorage.removeItem('logoDataUrl');

        localStorage.setItem('footerAboutTitle', defaultFooterAboutSettings.title);
        localStorage.setItem('footerAboutText', defaultFooterAboutSettings.text);
        localStorage.setItem('footerAboutLinks', JSON.stringify(defaultFooterAboutSettings.links));
        localStorage.setItem('footerSocialLinks', JSON.stringify(defaultSocialLinks));
        localStorage.setItem('copyrightText', defaultCopyrightSettings.text);
        localStorage.setItem('copyrightUrl', defaultCopyrightSettings.url);
        
        localStorage.setItem('homePageVersion', 'tunnel');

        window.dispatchEvent(new Event('storage'));
        toast({ title: "Réinitialisation", description: "Les paramètres d'apparence ont été réinitialisés." });
      }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedLegalInfo = localStorage.getItem('legalInfo');
        if (savedLegalInfo) {
            const info = JSON.parse(savedLegalInfo);
            setCompanyName(info.companyName || "");
            setStructureType(info.structureType || "");
            setCapital(info.capital || "");
            setSiret(info.siret || "");
            setAddressStreet(info.addressStreet || "");
            setAddressZip(info.addressZip || "");
            setAddressCity(info.addressCity || "");
            setEmail(info.email || "");
            setPhone(info.phone || "");
            setApeNaf(info.apeNaf || "");
            setRm(info.rm || "");
            setRcs(info.rcs || "");
            setNda(info.nda || "");
            setInsurance(info.insurance || "");
            setIsVatSubject(info.isVatSubject || false);
            setVatRate(info.vatRate || "");
            setVatNumber(info.vatNumber || "");
            setLegalMentions(info.legalMentions || "");
            setCgv(info.cgv || "");
            setPrivacyPolicy(info.privacyPolicy || "");
        }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSections = localStorage.getItem('homePageSections');
      if (storedSections) {
        try {
          setHomePageSections(JSON.parse(storedSections));
        } catch (e) {
          setHomePageSections(defaultHomePageSections);
        }
      }
    }
  }, []);


  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
      const base64 = await toBase64(file);
      setLogoDataUrl(base64);
    }
  };

  const handleLinkChange = (index: number, field: keyof AboutLink, value: string) => {
    const newLinks = [...footerAboutLinks];
    (newLinks[index] as any)[field] = value;
    setFooterAboutLinks(newLinks);
  };

  const addLink = () => {
    setFooterAboutLinks([
      ...footerAboutLinks,
      { id: Date.now(), text: 'Nouveau lien', url: '#', icon: 'GitBranch' },
    ]);
  };

  const removeLink = (index: number) => {
    const newLinks = footerAboutLinks.filter((_, i) => i !== index);
    setFooterAboutLinks(newLinks);
  };

  const handleSocialLinkChange = (index: number, url: string) => {
    const newLinks = [...footerSocialLinks];
    newLinks[index].url = url;
    setFooterSocialLinks(newLinks);
  };
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    const items = Array.from(homePageSections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setHomePageSections(items);
    localStorage.setItem('homePageSections', JSON.stringify(items));
    window.dispatchEvent(new Event('storage'));
  };

  const handleSectionToggle = (id: string, enabled: boolean) => {
    const newSections = homePageSections.map(section => 
      section.id === id ? { ...section, enabled } : section
    );
    setHomePageSections(newSections);
    localStorage.setItem('homePageSections', JSON.stringify(newSections));
    window.dispatchEvent(new Event('storage'));
  };

  useEffect(() => {
    // This effect runs on the client to apply color changes dynamically
    if (typeof window !== 'undefined') {
        // Apply colors
        document.documentElement.style.setProperty('--primary', hexToHsl(primaryColor));
        document.documentElement.style.setProperty('--secondary', hexToHsl(secondaryColor));
        document.documentElement.style.setProperty('--background', hexToHsl(bgColor));
    }
  }, [primaryColor, secondaryColor, bgColor]);
  

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Personnalisation</h1>
        <p className="text-muted-foreground">
          Gérez la personnalisation de la plateforme.
        </p>
      </div>

      <Tabs defaultValue="info-legales">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="info-legales">Infos Légales</TabsTrigger>
          <TabsTrigger value="apparence">Apparence</TabsTrigger>
          <TabsTrigger value="accueil">Page d'accueil</TabsTrigger>
          <TabsTrigger value="paiement">Paiement</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="rgpd">Paramètres RGPD</TabsTrigger>
        </TabsList>

        <TabsContent value="info-legales">
          <Card>
            <CardHeader>
              <CardTitle>Informations et Documents Légaux</CardTitle>
              <CardDescription>Gérez les informations légales de votre entreprise et le contenu de vos documents. Ces informations seront affichées sur votre site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-10">
              
              <section>
                <h3 className="text-xl font-semibold mb-6 border-b pb-2">Informations sur l'entreprise</h3>
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="company-name">Nom de l'entreprise / agence</Label>
                        <Input id="company-name" placeholder="Votre Nom Commercial" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="structure-type">Type de structure</Label>
                        <Input id="structure-type" placeholder="SARL, SAS, Auto-entrepreneur..." value={structureType} onChange={e => setStructureType(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="capital">Capital</Label>
                        <Input id="capital" type="number" placeholder="1000" value={capital} onChange={e => setCapital(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="siret">SIRET</Label>
                        <Input id="siret" placeholder="12345678901234" value={siret} onChange={e => setSiret(e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <Label>Adresse</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input placeholder="Numéro et nom de rue" className="sm:col-span-3" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} />
                        <Input placeholder="Code Postal" value={addressZip} onChange={e => setAddressZip(e.target.value)} />
                        <Input placeholder="Ville" className="sm:col-span-2" value={addressCity} onChange={e => setAddressCity(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" type="email" placeholder="contact@exemple.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input id="phone" type="tel" placeholder="0123456789" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="ape-naf">APE/NAF</Label>
                        <Input id="ape-naf" placeholder="6201Z" value={apeNaf} onChange={e => setApeNaf(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="rm">RM (optionnel)</Label>
                        <Input id="rm" placeholder="Numéro RM" value={rm} onChange={e => setRm(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-medium mb-4">Paramètres de TVA</h4>
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3">
                            <Switch id="vat-subject" checked={isVatSubject} onCheckedChange={setIsVatSubject} />
                            <Label htmlFor="vat-subject">Assujetti à la TVA (non applicable pour le régime micro-entreprise)</Label>
                            </div>

                            {isVatSubject && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-8 border-l ml-2">
                                <div className="space-y-2">
                                <Label htmlFor="vat-rate">Taux de TVA (%)</Label>
                                <Input id="vat-rate" type="number" placeholder="20" value={vatRate} onChange={e => setVatRate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="vat-number">Numéro de TVA Intracommunautaire</Label>
                                <Input id="vat-number" placeholder="FR12345678901" value={vatNumber} onChange={e => setVatNumber(e.target.value)} />
                                </div>
                            </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-medium mb-4">Informations optionnelles</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="rcs">RCS (Numéro et Ville)</Label>
                                <Input id="rcs" placeholder="Paris B 123 456 789" value={rcs} onChange={e => setRcs(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nda">Numéro NDA (Formation)</Label>
                                <Input id="nda" placeholder="Numéro de déclaration d'activité" value={nda} onChange={e => setNda(e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="insurance">Police d'assurance</Label>
                                <Input id="insurance" placeholder="Nom de l'assurance et numéro de contrat" value={insurance} onChange={e => setInsurance(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
              </section>

              <div className="border-t"></div>

              <section>
                 <h3 className="text-xl font-semibold mb-6 border-b pb-2">Contenu des documents</h3>
                 <div className="space-y-8">
                    <div>
                        <Label htmlFor="legal-mentions" className="text-lg font-medium">Mentions Légales</Label>
                        <div className="mt-2">
                          <RichTextEditor
                            content={legalMentions}
                            onChange={setLegalMentions}
                            placeholder="Rédigez vos mentions légales ici..."
                          />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="cgv" className="text-lg font-medium">Conditions Générales de Vente (CGV)</Label>
                        <div className="mt-2">
                           <RichTextEditor
                            content={cgv}
                            onChange={setCgv}
                            placeholder="Rédigez vos conditions générales de vente ici..."
                          />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="privacy-policy" className="text-lg font-medium">Politique de confidentialité</Label>
                        <div className="mt-2">
                          <RichTextEditor
                            content={privacyPolicy}
                            onChange={setPrivacyPolicy}
                            placeholder="Rédigez votre politique de confidentialité ici..."
                          />
                        </div>
                    </div>
                 </div>
              </section>
              
              <div className="flex justify-end pt-6 border-t">
                <Button onClick={handleSaveLegalInfo}>Enregistrer les modifications</Button>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apparence">
          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>Modifiez les couleurs, le logo et l'apparence générale de votre espace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="app-title">Titre de l'application</Label>
                      <Input id="app-title" value={appTitle} onChange={(e) => setAppTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="app-subtitle">Sous-titre de l'application</Label>
                      <Input id="app-subtitle" value={appSubtitle} onChange={(e) => setAppSubtitle(e.target.value)} />
                  </div>
                </div>

                <div className="border-t -mx-6"></div>

                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Logo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Label>Fichier du logo</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 flex items-center justify-center rounded-md border bg-muted relative">
                                    {logoPreview && <Image src={logoPreview} alt="Aperçu du logo" layout="fill" objectFit="contain" />}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/svg+xml"
                                />
                                <Button variant="outline" onClick={handleLogoUploadClick}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Uploader
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Formats recommandés : SVG, PNG, JPG.</p>
                        </div>
                         <div className="space-y-4">
                            <Label>Dimensions du logo (en pixels)</Label>
                            <div className="space-y-2">
                                <Label htmlFor="logo-width" className="flex items-center justify-between">
                                    <span>Largeur</span>
                                    <span className="text-sm text-muted-foreground">{logoWidth}px</span>
                                </Label>
                                <Slider
                                    id="logo-width"
                                    min={10}
                                    max={200}
                                    step={1}
                                    value={[logoWidth]}
                                    onValueChange={(value) => setLogoWidth(value[0])}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="logo-height" className="flex items-center justify-between">
                                    <span>Hauteur</span>
                                    <span className="text-sm text-muted-foreground">{logoHeight}px</span>
                                </Label>
                                <Slider
                                    id="logo-height"
                                    min={10}
                                    max={200}
                                    step={1}
                                    value={[logoHeight]}
                                    onValueChange={(value) => setLogoHeight(value[0])}
                                />
                            </div>
                        </div>
                    </div>
                     <div>
                        <Label className="mb-3 block">Affichage</Label>
                        <RadioGroup value={logoDisplay} onValueChange={setLogoDisplay} className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="app-and-logo" id="app-and-logo" />
                                <Label htmlFor="app-and-logo">Nom de l'application et logo</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="logo-only" id="logo-only" />
                                <Label htmlFor="logo-only">Logo uniquement</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <div className="border-t -mx-6"></div>

                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Couleurs du thème</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="primary-color">Couleur Primaire</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 p-1"/>
                                <Input id="primary-color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="secondary-color">Couleur Secondaire</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 p-1"/>
                                <Input id="secondary-color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="bg-color">Couleur de Fond</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 p-1"/>
                                <Input id="bg-color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                 <div className="border-t -mx-6"></div>

                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Pied de page - Section "À propos"</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="footer-about-title">Titre de la section</Label>
                            <Input id="footer-about-title" value={footerAboutTitle} onChange={(e) => setFooterAboutTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="footer-about-text">Texte de description</Label>
                            <Textarea id="footer-about-text" value={footerAboutText} onChange={(e) => setFooterAboutText(e.target.value)} />
                        </div>
                        <div>
                            <Label>Liens personnalisés</Label>
                            <div className="space-y-4 mt-2">
                                {footerAboutLinks.map((link, index) => (
                                    <div key={link.id} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-4">
                                            <Input 
                                                placeholder="Texte du lien"
                                                value={link.text}
                                                onChange={(e) => handleLinkChange(index, 'text', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <Input 
                                                placeholder="URL (ex: /contact)"
                                                value={link.url}
                                                onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <Select value={link.icon} onValueChange={(value) => handleLinkChange(index, 'icon', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Icône" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GitBranch">Branche</SelectItem>
                                                    <SelectItem value="Briefcase">Mallette</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1">
                                            <Button variant="ghost" size="icon" onClick={() => removeLink(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addLink}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Ajouter un lien
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t -mx-6"></div>

                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Pied de page - Réseaux Sociaux</h3>
                    <div className="space-y-4">
                        {footerSocialLinks.map((link, index) => {
                            const Icon = socialIconMap[link.icon];
                            return (
                                <div key={link.id} className="flex items-center gap-4">
                                    <Icon className="h-6 w-6 text-muted-foreground" />
                                    <div className="flex-1">
                                        <Label htmlFor={`social-link-${link.name}`}>{link.name}</Label>
                                        <Input
                                            id={`social-link-${link.name}`}
                                            placeholder={`URL de votre page ${link.name}`}
                                            value={link.url}
                                            onChange={(e) => handleSocialLinkChange(index, e.target.value)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="border-t -mx-6"></div>
                
                <div className="space-y-6">
                    <h3 className="text-lg font-medium">Pied de page - Copyright</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="copyright-text">Texte du Copyright</Label>
                            <Input id="copyright-text" value={copyrightText} onChange={(e) => setCopyrightText(e.target.value)} placeholder="Votre Nom d'Entreprise" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="copyright-url">URL du lien Copyright</Label>
                            <Input id="copyright-url" value={copyrightUrl} onChange={(e) => setCopyrightUrl(e.target.value)} placeholder="/"/>
                        </div>
                    </div>
                </div>


                 <div className="flex justify-start pt-6 border-t gap-2">
                    <Button onClick={handleAppearanceSave} style={{backgroundColor: primaryColor}}>Sauvegarder les changements</Button>
                    <Button variant="outline" onClick={handleResetAppearance}>Réinitialiser</Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accueil">
          <Card>
            <CardHeader>
              <CardTitle>Page d'accueil</CardTitle>
              <CardDescription>Configurez le contenu de votre page d'accueil.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <section>
                <h3 className="text-lg font-medium mb-4">Version de la page d'accueil</h3>
                 <RadioGroup value={homePageVersion} onValueChange={setHomePageVersion} className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="tunnel" id="tunnel" />
                        <Label htmlFor="tunnel">Version Tunnel de vente</Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">Une page complète avec plusieurs sections, conçue pour présenter l'offre et convertir les visiteurs.</p>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="application" id="application" />
                        <Label htmlFor="application">Version Application</Label>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">Une page simple avec un formulaire de connexion, pour un accès direct à l'application.</p>
                </RadioGroup>
              </section>
              <div className="border-t -mx-6"></div>
              <section>
                 <h3 className="text-lg font-medium mb-4">Organisation des sections</h3>
                 <p className="text-sm text-muted-foreground mb-6">Faites glisser les sections pour les réorganiser sur la page d'accueil version tunnel. Activez ou désactivez les sections selon vos besoins.</p>
                 
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="sections">
                    {(provided) => (
                        <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                        >
                        {homePageSections.map((section, index) => (
                            <Draggable key={section.id} draggableId={section.id} index={index}>
                            {(provided) => (
                                <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="flex items-center gap-4 p-3 border rounded-lg bg-background"
                                >
                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="font-medium">{section.label}</p>
                                    </div>
                                    <Switch
                                        checked={section.enabled}
                                        onCheckedChange={(checked) => handleSectionToggle(section.id, checked)}
                                    />
                                </div>
                            )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                        </div>
                    )}
                    </Droppable>
                </DragDropContext>

              </section>
                <div className="flex justify-end pt-6 border-t">
                    <Button onClick={handleAppearanceSave}>Enregistrer les modifications</Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paiement">
          <Card>
            <CardHeader>
              <CardTitle>Paiement</CardTitle>
              <CardDescription>Gérez les options de paiement.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu des paiements est vide.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email</CardTitle>
              <CardDescription>Configurez les paramètres d'envoi d'emails.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu des emails est vide.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rgpd">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres RGPD</CardTitle>
              <CardDescription>Gérez les paramètres de conformité RGPD.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu des paramètres RGPD est vide.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

    
