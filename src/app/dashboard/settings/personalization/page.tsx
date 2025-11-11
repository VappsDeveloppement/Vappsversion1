
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, Underline, AlignCenter, AlignLeft, AlignRight, AlignJustify } from "lucide-react";
import React from "react";

const RichTextToolbar = ({ textareaId }: { textareaId: string }) => {
  const applyStyle = (style: 'bold' | 'italic' | 'underline') => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      let tag;
      switch (style) {
        case 'bold': tag = 'b'; break;
        case 'italic': tag = 'i'; break;
        case 'underline': tag = 'u'; break;
      }
      const newText = `${textarea.value.substring(0, start)}<${tag}>${selectedText}</${tag}>${textarea.value.substring(end)}`;
      // This is a simplified example. A real implementation would need to handle state and more complex logic.
      console.log(`Applying ${style} to ${selectedText}`);
    }
  };

  return (
    <div className="flex items-center gap-1 border rounded-t-md p-2 bg-muted">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => applyStyle('bold')}><Bold className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => applyStyle('italic')}><Italic className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => applyStyle('underline')}><Underline className="h-4 w-4" /></Button>
      <div className="h-6 w-px bg-border mx-1"></div>
      <Button variant="outline" size="icon" className="h-8 w-8"><AlignLeft className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" className="h-8 w-8"><AlignCenter className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" className="h-8 w-8"><AlignRight className="h-4 w-4" /></Button>
      <Button variant="outline" size="icon" className="h-8 w-8"><AlignJustify className="h-4 w-4" /></Button>
    </div>
  )
}

export default function PersonalizationPage() {

  const [isVatSubject, setIsVatSubject] = React.useState(false);

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
                        <RichTextToolbar textareaId="legal-mentions" />
                        <Textarea id="legal-mentions" placeholder="Rédigez vos mentions légales ici..." className="min-h-[250px] rounded-t-none"/>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="cgv" className="text-lg font-medium">Conditions Générales de Vente (CGV)</Label>
                        <div className="mt-2">
                        <RichTextToolbar textareaId="cgv" />
                        <Textarea id="cgv" placeholder="Rédigez vos conditions générales de vente ici..." className="min-h-[250px] rounded-t-none"/>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="privacy-policy" className="text-lg font-medium">Politique de confidentialité</Label>
                        <div className="mt-2">
                        <RichTextToolbar textareaId="privacy-policy" />
                        <Textarea id="privacy-policy" placeholder="Rédigez votre politique de confidentialité ici..." className="min-h-[250px] rounded-t-none"/>
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
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Le contenu de l'apparence est vide.</p>
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
