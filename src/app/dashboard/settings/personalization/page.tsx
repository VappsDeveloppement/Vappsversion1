

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
import { GitBranch, Briefcase, PlusCircle, Trash2, Upload, Facebook, Twitter, Linkedin, Instagram, Settings, LayoutTemplate, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import Image from "next/image";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/context/agency-provider";
import { updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Helper function to convert hex to HSL
const hexToHsl = (hex: string): string => {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
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
  isLocked?: boolean; // To prevent moving certain sections like hero/footer
};


const defaultHomePageSections: Section[] = [
  { id: 'hero', label: 'Hero (Titre & Connexion)', enabled: true, isLocked: true },
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
  { id: 'footer', label: 'Pied de page', enabled: true, isLocked: true },
];

const defaultPersonalization = {
    appTitle: "VApps",
    appSubtitle: "Développement",
    logoWidth: 40,
    logoHeight: 40,
    logoDisplay: "app-and-logo",
    primaryColor: "#2ff40a",
    secondaryColor: "#25d408",
    bgColor: "#ffffff",
    logoDataUrl: null as string | null,
    heroStyle: "application",
    heroTitle: "Révélez votre potentiel et construisez une carrière qui vous ressemble.",
    heroSubtitle: "Un accompagnement sur-mesure pour votre épanouissement professionnel et personnel.",
    heroCta1Text: "Découvrir mes services",
    heroCta1Link: "/services",
    heroCta2Text: "Prendre rendez-vous",
    heroCta2Link: "/contact",
    footerAboutTitle: "À propos",
    footerAboutText: "HOLICA LOC est une plateforme de test qui met en relation des développeurs d'applications avec une communauté de bêta-testeurs qualifiés.",
    footerAboutLinks: [
      { id: 1, text: "Notre mission", url: "#", icon: "GitBranch" },
      { id: 2, text: "Carrières", url: "#", icon: "Briefcase" },
    ],
    footerSocialLinks: [
      { id: 1, name: 'Facebook', url: '', icon: 'Facebook' },
      { id: 2, name: 'Twitter', url: '', icon: 'Twitter' },
      { id: 3, name: 'LinkedIn', url: '', icon: 'Linkedin' },
      { id: 4, name: 'Instagram', url: '', icon: 'Instagram' },
    ],
    copyrightText: "Vapps.",
    copyrightUrl: "/",
    homePageVersion: 'tunnel',
    homePageSections: defaultHomePageSections,
    legalInfo: {
        companyName: "", structureType: "", capital: "", siret: "", addressStreet: "", addressZip: "", addressCity: "",
        email: "", phone: "", apeNaf: "", rm: "", rcs: "", nda: "", insurance: "", isVatSubject: false, vatRate: "", vatNumber: "",
        legalMentions: "", cgv: "", privacyPolicy: ""
    }
};

export default function PersonalizationPage() {
  const { toast } = useToast();
  const { agency, personalization, isLoading: isAgencyLoading } = useAgency();
  const firestore = useFirestore();

  const [settings, setSettings] = useState(personalization || defaultPersonalization);
  const [logoPreview, setLogoPreview] = React.useState(personalization?.logoDataUrl || "/vapps.png");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (personalization) {
      setSettings(prev => ({
        ...defaultPersonalization,
        ...prev,
        ...personalization,
        homePageSections: personalization.homePageSections || defaultHomePageSections,
      }));
      if (personalization.logoDataUrl) {
          setLogoPreview(personalization.logoDataUrl);
      }
    }
  }, [personalization]);

  const handleFieldChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleLegalInfoChange = (field: string, value: any) => {
    setSettings(prev => ({
        ...prev,
        legalInfo: {
            ...prev.legalInfo,
            [field]: value
        }
    }))
  }

  const handleSave = () => {
    if (!agency) {
      toast({ title: "Erreur", description: "Agence non trouvée.", variant: "destructive" });
      return;
    }
    const agencyRef = doc(firestore, 'agencies', agency.id);
    updateDocumentNonBlocking(agencyRef, { personalization: settings });
    toast({ title: "Paramètres enregistrés", description: "Vos paramètres ont été sauvegardés." });
  };
  
  const handleResetAppearance = () => {
      const resetSettings = {
        ...settings,
        ...defaultPersonalization
      };
      setSettings(resetSettings);
      setLogoPreview(defaultPersonalization.logoDataUrl || "/vapps.png");

      if (!agency) return;
      const agencyRef = doc(firestore, 'agencies', agency.id);
      updateDocumentNonBlocking(agencyRef, { personalization: resetSettings });
      toast({ title: "Réinitialisation", description: "Les paramètres d'apparence ont été réinitialisés." });
  };


  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
      const base64 = await toBase64(file);
      handleFieldChange('logoDataUrl', base64);
    }
  };

  const handleLinkChange = (index: number, field: keyof AboutLink, value: string) => {
    const newLinks = [...(settings.footerAboutLinks || [])];
    (newLinks[index] as any)[field] = value;
    handleFieldChange('footerAboutLinks', newLinks);
  };

  const addLink = () => {
    const newLinks = [
      ...(settings.footerAboutLinks || []),
      { id: Date.now(), text: 'Nouveau lien', url: '#', icon: 'GitBranch' },
    ];
    handleFieldChange('footerAboutLinks', newLinks);
  };

  const removeLink = (index: number) => {
    const newLinks = (settings.footerAboutLinks || []).filter((_, i) => i !== index);
    handleFieldChange('footerAboutLinks', newLinks);
  };

  const handleSocialLinkChange = (index: number, url: string) => {
    const newLinks = [...(settings.footerSocialLinks || [])];
    newLinks[index].url = url;
    handleFieldChange('footerSocialLinks', newLinks);
  };
  
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...(settings.homePageSections || [])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < newSections.length) {
      [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
      handleFieldChange('homePageSections', newSections);
    }
  };

  const handleSectionToggle = (id: string, enabled: boolean) => {
    const newSections = (settings.homePageSections || []).map(section => 
      section.id === id ? { ...section, enabled } : section
    );
    handleFieldChange('homePageSections', newSections);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && settings) {
        document.documentElement.style.setProperty('--primary', hexToHsl(settings.primaryColor));
        document.documentElement.style.setProperty('--secondary', hexToHsl(settings.secondaryColor));
        document.documentElement.style.setProperty('--background', hexToHsl(settings.bgColor));
    }
  }, [settings?.primaryColor, settings?.secondaryColor, settings?.bgColor]);
  
  if (isAgencyLoading) {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Personnalisation</h1>
            <Skeleton className="h-10 w-full" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Personnalisation</h1>
        <p className="text-muted-foreground">
          Gérez la personnalisation de la plateforme pour votre agence : **{agency?.name || '...'}**
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
                        <Input id="company-name" placeholder="Votre Nom Commercial" value={settings.legalInfo?.companyName} onChange={e => handleLegalInfoChange('companyName', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="structure-type">Type de structure</Label>
                        <Input id="structure-type" placeholder="SARL, SAS, Auto-entrepreneur..." value={settings.legalInfo?.structureType} onChange={e => handleLegalInfoChange('structureType', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="capital">Capital</Label>
                        <Input id="capital" type="number" placeholder="1000" value={settings.legalInfo?.capital} onChange={e => handleLegalInfoChange('capital', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="siret">SIRET</Label>
                        <Input id="siret" placeholder="12345678901234" value={settings.legalInfo?.siret} onChange={e => handleLegalInfoChange('siret', e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <Label>Adresse</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input placeholder="Numéro et nom de rue" className="sm:col-span-3" value={settings.legalInfo?.addressStreet} onChange={e => handleLegalInfoChange('addressStreet', e.target.value)} />
                        <Input placeholder="Code Postal" value={settings.legalInfo?.addressZip} onChange={e => handleLegalInfoChange('addressZip', e.target.value)} />
                        <Input placeholder="Ville" className="sm:col-span-2" value={settings.legalInfo?.addressCity} onChange={e => handleLegalInfoChange('addressCity', e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" type="email" placeholder="contact@exemple.com" value={settings.legalInfo?.email} onChange={e => handleLegalInfoChange('email', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input id="phone" type="tel" placeholder="0123456789" value={settings.legalInfo?.phone} onChange={e => handleLegalInfoChange('phone', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="ape-naf">APE/NAF</Label>
                        <Input id="ape-naf" placeholder="6201Z" value={settings.legalInfo?.apeNaf} onChange={e => handleLegalInfoChange('apeNaf', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="rm">RM (optionnel)</Label>
                        <Input id="rm" placeholder="Numéro RM" value={settings.legalInfo?.rm} onChange={e => handleLegalInfoChange('rm', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-medium mb-4">Paramètres de TVA</h4>
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3">
                            <Switch id="vat-subject" checked={settings.legalInfo?.isVatSubject} onCheckedChange={checked => handleLegalInfoChange('isVatSubject', checked)} />
                            <Label htmlFor="vat-subject">Assujetti à la TVA (non applicable pour le régime micro-entreprise)</Label>
                            </div>

                            {settings.legalInfo?.isVatSubject && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-8 border-l ml-2">
                                <div className="space-y-2">
                                <Label htmlFor="vat-rate">Taux de TVA (%)</Label>
                                <Input id="vat-rate" type="number" placeholder="20" value={settings.legalInfo.vatRate} onChange={e => handleLegalInfoChange('vatRate', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="vat-number">Numéro de TVA Intracommunautaire</Label>
                                <Input id="vat-number" placeholder="FR12345678901" value={settings.legalInfo.vatNumber} onChange={e => handleLegalInfoChange('vatNumber', e.target.value)} />
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
                                <Input id="rcs" placeholder="Paris B 123 456 789" value={settings.legalInfo?.rcs} onChange={e => handleLegalInfoChange('rcs', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nda">Numéro NDA (Formation)</Label>
                                <Input id="nda" placeholder="Numéro de déclaration d'activité" value={settings.legalInfo?.nda} onChange={e => handleLegalInfoChange('nda', e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="insurance">Police d'assurance</Label>
                                <Input id="insurance" placeholder="Nom de l'assurance et numéro de contrat" value={settings.legalInfo?.insurance} onChange={e => handleLegalInfoChange('insurance', e.target.value)} />
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
                            content={settings.legalInfo?.legalMentions || ''}
                            onChange={content => handleLegalInfoChange('legalMentions', content)}
                            placeholder="Rédigez vos mentions légales ici..."
                          />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="cgv" className="text-lg font-medium">Conditions Générales de Vente (CGV)</Label>
                        <div className="mt-2">
                           <RichTextEditor
                            content={settings.legalInfo?.cgv || ''}
                            onChange={content => handleLegalInfoChange('cgv', content)}
                            placeholder="Rédigez vos conditions générales de vente ici..."
                          />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="privacy-policy" className="text-lg font-medium">Politique de confidentialité</Label>
                        <div className="mt-2">
                          <RichTextEditor
                            content={settings.legalInfo?.privacyPolicy || ''}
                            onChange={content => handleLegalInfoChange('privacyPolicy', content)}
                            placeholder="Rédigez votre politique de confidentialité ici..."
                          />
                        </div>
                    </div>
                 </div>
              </section>
              
              <div className="flex justify-end pt-6 border-t">
                <Button onClick={handleSave}>Enregistrer les modifications</Button>
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
                      <Input id="app-title" value={settings.appTitle} onChange={(e) => handleFieldChange('appTitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="app-subtitle">Sous-titre de l'application</Label>
                      <Input id="app-subtitle" value={settings.appSubtitle} onChange={(e) => handleFieldChange('appSubtitle', e.target.value)} />
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
                            <Label>Largeur du logo (en pixels)</Label>
                            <div className="space-y-2">
                                <Label htmlFor="logo-width" className="flex items-center justify-between">
                                    <span>Largeur</span>
                                    <span className="text-sm text-muted-foreground">{settings.logoWidth}px</span>
                                </Label>
                                <Slider
                                    id="logo-width"
                                    min={10}
                                    max={200}
                                    step={1}
                                    value={[settings.logoWidth || 40]}
                                    onValueChange={(value) => handleFieldChange('logoWidth', value[0])}
                                />
                            </div>
                        </div>
                    </div>
                     <div>
                        <Label className="mb-3 block">Affichage</Label>
                        <RadioGroup value={settings.logoDisplay} onValueChange={(value) => handleFieldChange('logoDisplay', value)} className="space-y-2">
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
                                <Input type="color" value={settings.primaryColor} onChange={(e) => handleFieldChange('primaryColor', e.target.value)} className="w-10 h-10 p-1"/>
                                <Input id="primary-color" value={settings.primaryColor} onChange={(e) => handleFieldChange('primaryColor', e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="secondary-color">Couleur Secondaire</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" value={settings.secondaryColor} onChange={(e) => handleFieldChange('secondaryColor', e.target.value)} className="w-10 h-10 p-1"/>
                                <Input id="secondary-color" value={settings.secondaryColor} onChange={(e) => handleFieldChange('secondaryColor', e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="bg-color">Couleur de Fond</Label>
                            <div className="flex items-center gap-2">
                                <Input type="color" value={settings.bgColor} onChange={(e) => handleFieldChange('bgColor', e.target.value)} className="w-10 h-10 p-1"/>
                                <Input id="bg-color" value={settings.bgColor} onChange={(e) => handleFieldChange('bgColor', e.target.value)} />
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
                            <Input id="footer-about-title" value={settings.footerAboutTitle} onChange={(e) => handleFieldChange('footerAboutTitle', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="footer-about-text">Texte de description</Label>
                            <Textarea id="footer-about-text" value={settings.footerAboutText} onChange={(e) => handleFieldChange('footerAboutText', e.target.value)} />
                        </div>
                        <div>
                            <Label>Liens personnalisés</Label>
                            <div className="space-y-4 mt-2">
                                {settings.footerAboutLinks.map((link, index) => (
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
                        {settings.footerSocialLinks.map((link, index) => {
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
                            <Input id="copyright-text" value={settings.copyrightText} onChange={(e) => handleFieldChange('copyrightText', e.target.value)} placeholder="Votre Nom d'Entreprise" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="copyright-url">URL du lien Copyright</Label>
                            <Input id="copyright-url" value={settings.copyrightUrl} onChange={(e) => handleFieldChange('copyrightUrl', e.target.value)} placeholder="/"/>
                        </div>
                    </div>
                </div>


                 <div className="flex justify-start pt-6 border-t gap-2">
                    <Button onClick={handleSave} style={{backgroundColor: settings.primaryColor}}>Sauvegarder les changements</Button>
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
                 <RadioGroup value={settings.homePageVersion} onValueChange={(value) => handleFieldChange('homePageVersion', value)} className="space-y-2">
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
                 <p className="text-sm text-muted-foreground mb-6">Réorganisez les sections de la page d'accueil version tunnel. Activez ou désactivez les sections selon vos besoins.</p>
                 
                 <Accordion type="single" collapsible className="w-full space-y-2">
                    {(settings.homePageSections || []).map((section, index) => (
                        <AccordionItem value={section.id} key={section.id} className="border rounded-lg bg-background overflow-hidden">
                            <AccordionTrigger className="flex items-center gap-4 p-3 hover:no-underline [&[data-state=open]>svg:last-child]:rotate-180">
                                <div className="flex-1 text-left font-medium">{section.label}</div>
                                
                                {!section.isLocked && (
                                    <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); moveSection(index, 'up')}}
                                        disabled={index === 0 || settings.homePageSections[index - 1].isLocked}
                                        className="h-8 w-8"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); moveSection(index, 'down')}}
                                        disabled={index === settings.homePageSections.length - 1 || settings.homePageSections[index + 1].isLocked}
                                        className="h-8 w-8"
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    </div>
                                )}

                                <Switch
                                    checked={section.enabled}
                                    onCheckedChange={(checked) => handleSectionToggle(section.id, checked)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="p-6 border-t bg-muted/50">
                                {section.id === 'hero' ? (
                                    <div className="space-y-4">
                                        <Label>Style de la section Héro</Label>
                                        <RadioGroup value={settings.heroStyle} onValueChange={(value) => handleFieldChange('heroStyle', value)} className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="application" id="hero-app" />
                                                <Label htmlFor="hero-app">Modèle Application (avec connexion)</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="sales_funnel" id="hero-tunnel" />
                                                <Label htmlFor="hero-tunnel">Modèle Tunnel de Vente</Label>
                                            </div>
                                        </RadioGroup>

                                        {settings.heroStyle === 'sales_funnel' && (
                                        <div className="mt-6 space-y-4 pt-4 border-t">
                                            <div className="space-y-2">
                                                <Label htmlFor="hero-title">Titre du Héro</Label>
                                                <Textarea id="hero-title" value={settings.heroTitle} onChange={(e) => handleFieldChange('heroTitle', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="hero-subtitle">Sous-titre du Héro</Label>
                                                <Textarea id="hero-subtitle" value={settings.heroSubtitle} onChange={(e) => handleFieldChange('heroSubtitle', e.target.value)} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="hero-cta1-text">Texte CTA 1</Label>
                                                    <Input id="hero-cta1-text" value={settings.heroCta1Text} onChange={(e) => handleFieldChange('heroCta1Text', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="hero-cta1-link">Lien CTA 1</Label>
                                                    <Input id="hero-cta1-link" value={settings.heroCta1Link} onChange={(e) => handleFieldChange('heroCta1Link', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="hero-cta2-text">Texte CTA 2</Label>
                                                    <Input id="hero-cta2-text" value={settings.heroCta2Text} onChange={(e) => handleFieldChange('heroCta2Text', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="hero-cta2-link">Lien CTA 2</Label>
                                                    <Input id="hero-cta2-link" value={settings.heroCta2Link} onChange={(e) => handleFieldChange('heroCta2Link', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Aucun paramètre de personnalisation pour cette section.</p>
                                )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
              </section>
                <div className="flex justify-end pt-6 border-t">
                    <Button onClick={handleSave}>Enregistrer les modifications</Button>
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
