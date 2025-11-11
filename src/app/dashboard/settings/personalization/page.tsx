

'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import React, { useEffect, useRef } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload } from "lucide-react";
import Image from "next/image";
import { Slider } from "@/components/ui/slider";

const defaultAppearanceSettings = {
    appTitle: "VApps",
    appSubtitle: "Développement",
    logoWidth: 40,
    logoDisplay: "app-and-logo",
    primaryColor: "#2ff40a",
    secondaryColor: "#25d408",
    bgColor: "#ffffff",
    logoPreview: "/vapps.png",
    logoDataUrl: null as string | null,
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


export default function PersonalizationPage() {

  const [isVatSubject, setIsVatSubject] = React.useState(false);
  const [legalMentions, setLegalMentions] = React.useState("");
  const [cgv, setCgv] = React.useState("");
  const [privacyPolicy, setPrivacyPolicy] = React.useState("");
  
  // State for "Apparence" tab
  const [appTitle, setAppTitle] = React.useState(defaultAppearanceSettings.appTitle);
  const [appSubtitle, setAppSubtitle] = React.useState(defaultAppearanceSettings.appSubtitle);
  const [logoWidth, setLogoWidth] = React.useState(defaultAppearanceSettings.logoWidth);
  const [logoDisplay, setLogoDisplay] = React.useState(defaultAppearanceSettings.logoDisplay);
  const [primaryColor, setPrimaryColor] = React.useState(defaultAppearanceSettings.primaryColor);
  const [secondaryColor, setSecondaryColor] = React.useState(defaultAppearanceSettings.secondaryColor);
  const [bgColor, setBgColor] = React.useState(defaultAppearanceSettings.bgColor);

  const [logoPreview, setLogoPreview] = React.useState(defaultAppearanceSettings.logoPreview);
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(defaultAppearanceSettings.logoDataUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleAppearanceSave = () => {
    // This function remains to potentially save all settings to a backend later.
    // For now, client-side updates are handled by useEffect.
    console.log("Appearance Settings Saved (or would be saved to backend).");
    if (typeof window !== 'undefined') {
        localStorage.setItem('appTitle', appTitle);
        localStorage.setItem('appSubtitle', appSubtitle);
        localStorage.setItem('logoDisplay', logoDisplay);
        localStorage.setItem('logoWidth', String(logoWidth));
        if (logoDataUrl) {
            localStorage.setItem('logoDataUrl', logoDataUrl);
        } else {
            localStorage.removeItem('logoDataUrl');
        }
        window.dispatchEvent(new Event('storage')); 
    }
  };

  const handleResetAppearance = () => {
      setAppTitle(defaultAppearanceSettings.appTitle);
      setAppSubtitle(defaultAppearanceSettings.appSubtitle);
      setLogoWidth(defaultAppearanceSettings.logoWidth);
      setLogoDisplay(defaultAppearanceSettings.logoDisplay);
      setPrimaryColor(defaultAppearanceSettings.primaryColor);
      setSecondaryColor(defaultAppearanceSettings.secondaryColor);
      setBgColor(defaultAppearanceSettings.bgColor);
      setLogoPreview(defaultAppearanceSettings.logoPreview);
      setLogoDataUrl(defaultAppearanceSettings.logoDataUrl);
      
      // Also reset localStorage to defaults
      if (typeof window !== 'undefined') {
        localStorage.setItem('appTitle', defaultAppearanceSettings.appTitle);
        localStorage.setItem('appSubtitle', defaultAppearanceSettings.appSubtitle);
        localStorage.setItem('logoDisplay', defaultAppearanceSettings.logoDisplay);
        localStorage.setItem('logoWidth', String(defaultAppearanceSettings.logoWidth));
        localStorage.removeItem('logoDataUrl'); // Remove custom logo
        window.dispatchEvent(new Event('storage'));
      }
  };


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
              
              {/* Legal Information Section */}
              <section>
                <h3 className="text-xl font-semibold mb-6 border-b pb-2">Informations sur l'entreprise</h3>
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="company-name">Nom de l'entreprise / agence</Label>
                        <Input id="company-name" placeholder="Votre Nom Commercial" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="structure-type">Type de structure</Label>
                        <Input id="structure-type" placeholder="SARL, SAS, Auto-entrepreneur..." />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="capital">Capital</Label>
                        <Input id="capital" type="number" placeholder="1000" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="siret">SIRET</Label>
                        <Input id="siret" placeholder="12345678901234" />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <Label>Adresse</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input placeholder="Numéro et nom de rue" className="sm:col-span-3"/>
                        <Input placeholder="Code Postal" />
                        <Input placeholder="Ville" className="sm:col-span-2"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" type="email" placeholder="contact@exemple.com" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone</Label>
                        <Input id="phone" type="tel" placeholder="0123456789" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="ape-naf">APE/NAF</Label>
                        <Input id="ape-naf" placeholder="6201Z" />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="rm">RM (optionnel)</Label>
                        <Input id="rm" placeholder="Numéro RM" />
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
                                <Input id="vat-rate" type="number" placeholder="20" />
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="vat-number">Numéro de TVA Intracommunautaire</Label>
                                <Input id="vat-number" placeholder="FR12345678901" />
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
                                <Input id="rcs" placeholder="Paris B 123 456 789" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nda">Numéro NDA (Formation)</Label>
                                <Input id="nda" placeholder="Numéro de déclaration d'activité" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="insurance">Police d'assurance</Label>
                                <Input id="insurance" placeholder="Nom de l'assurance et numéro de contrat" />
                            </div>
                        </div>
                    </div>
                </div>
              </section>

              <div className="border-t"></div>

              {/* Document Editor Section */}
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
                <Button>Enregistrer les modifications</Button>
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
                                    <Image src={logoPreview} alt="Aperçu du logo" layout="fill" objectFit="contain" />
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
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu de la page d'accueil est vide.</p>
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
