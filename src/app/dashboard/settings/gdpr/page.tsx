
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgency } from "@/context/agency-provider";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase/provider";
import { collection, doc } from "firebase/firestore";
import { setDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const defaultGdprSettings = {
  inactivityAlertDays: 365,
  dpoName: "",
  dpoEmail: "",
  dpoPhone: "",
  dpoAddress: "",
};

type GdprRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'closed';
  createdAt: string;
};

export default function GdprPage() {
  const { personalization, agency, isLoading: isAgencyLoading } = useAgency();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [settings, setSettings] = useState(personalization?.gdprSettings || defaultGdprSettings);

  const gdprRequestsCollectionRef = useMemoFirebase(() => {
    if (!agency) return null;
    return collection(firestore, 'gdpr_requests');
  }, [agency, firestore]);

  const { data: gdprRequests, isLoading: areGdprRequestsLoading } = useCollection<GdprRequest>(gdprRequestsCollectionRef);


  useEffect(() => {
    if (personalization?.gdprSettings) {
      setSettings(prev => ({ ...defaultGdprSettings, ...prev, ...personalization.gdprSettings }));
    }
  }, [personalization]);
  
  const handleFieldChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!agency) {
      toast({ title: "Erreur", description: "Agence non trouvée.", variant: "destructive" });
      return;
    }
    const agencyRef = doc(firestore, 'agencies', agency.id);
    // We save the entire gdprSettings object under the personalization document
    setDocumentNonBlocking(agencyRef, { personalization: { gdprSettings: settings } }, { merge: true });
    toast({ title: "Paramètres enregistrés", description: "Vos paramètres RGPD ont été sauvegardés." });
  };

  if (isAgencyLoading) {
    return (
       <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Gestion RGPD</h1>
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
        <h1 className="text-3xl font-bold font-headline">Gestion RGPD</h1>
        <p className="text-muted-foreground">
          Gérez les données, la conformité RGPD et les demandes des utilisateurs de l'agence.
        </p>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Demandes "Données Personnelles"</CardTitle>
          <CardDescription>Liste des demandes soumises via le formulaire de contact.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Demandeur</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areGdprRequestsLoading ? (
                <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ) : gdprRequests && gdprRequests.length > 0 ? (
                gdprRequests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.name}</div>
                      <div className="text-sm text-muted-foreground">{request.email}</div>
                      <div className="text-sm text-muted-foreground">{request.phone}</div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{request.message}</TableCell>
                    <TableCell>{new Date(request.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell><Badge variant={request.status === 'new' ? 'destructive' : 'secondary'}>{request.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">Traiter</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Aucune demande relative aux données personnelles.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres de conformité RGPD</CardTitle>
          <CardDescription>Configurez les alertes et les informations du Délégué à la Protection des Données (DPO).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Rétention des données</h3>
            <div className="space-y-2 max-w-sm">
              <Label htmlFor="inactivity-alert">Délai d'alerte pour inactivité (en jours)</Label>
              <Input 
                id="inactivity-alert" 
                type="number" 
                value={settings.inactivityAlertDays}
                onChange={e => handleFieldChange('inactivityAlertDays', parseInt(e.target.value, 10))}
                placeholder="Ex: 365"
              />
              <p className="text-xs text-muted-foreground">
                Définit le nombre de jours d'inactivité d'un compte avant qu'une alerte de nettoyage des données ne soit générée.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Coordonnées du DPO</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="dpo-name">Nom du DPO</Label>
                  <Input 
                    id="dpo-name" 
                    value={settings.dpoName}
                    onChange={e => handleFieldChange('dpoName', e.target.value)}
                    placeholder="Jean Dupont" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dpo-email">Email du DPO</Label>
                  <Input 
                    id="dpo-email" 
                    type="email" 
                    value={settings.dpoEmail}
                    onChange={e => handleFieldChange('dpoEmail', e.target.value)}
                    placeholder="dpo@agence.com" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                  <Label htmlFor="dpo-phone">Téléphone du DPO</Label>
                  <Input 
                    id="dpo-phone" 
                    type="tel"
                    value={settings.dpoPhone}
                    onChange={e => handleFieldChange('dpoPhone', e.target.value)}
                    placeholder="01 23 45 67 89" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dpo-address">Adresse du DPO</Label>
                  <Input 
                    id="dpo-address" 
                    value={settings.dpoAddress}
                    onChange={e => handleFieldChange('dpoAddress', e.target.value)}
                    placeholder="123 Rue de la Conformité, 75001 Paris" 
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
    </div>
  );
}
