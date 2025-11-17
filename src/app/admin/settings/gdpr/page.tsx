

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgency } from "@/context/agency-provider";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore } from "@/firebase/provider";
import { collection, doc, query, where, getDocs } from "firebase/firestore";
import { setDocumentNonBlocking, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase";
import React, { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, User, Users, Check, Edit, Trash2, Loader2, Info } from "lucide-react";
import { differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { sendGdprEmail } from "@/app/actions/gdpr";


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
  counselorId: string;
};

type UserData = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    lastSignInTime?: string;
    gdprReportedAt?: string;
    counselorId: string;
};

export default function GdprPage() {
  const { personalization, agency, isLoading: isAgencyLoading } = useAgency();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState(personalization?.gdprSettings || defaultGdprSettings);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [requestToProcess, setRequestToProcess] = useState<GdprRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);


  const gdprRequestsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'gdpr_requests'), where('counselorId', '==', user.uid));
  }, [user, firestore]);

  const { data: allGdprRequests, isLoading: areGdprRequestsLoading } = useCollection<GdprRequest>(gdprRequestsCollectionRef);

  const gdprRequests = useMemo(() => {
      if (!allGdprRequests) return [];
      return allGdprRequests.filter(req => req.status !== 'closed');
  }, [allGdprRequests])
  
  const agencyUsersQuery = useMemoFirebase(() => {
    if (!user) return null;
    const usersCollectionRef = collection(firestore, 'users');
    return query(usersCollectionRef, where('counselorId', '==', user.uid));
  }, [user, firestore]);
  
  const { data: agencyUsers, isLoading: areUsersLoading } = useCollection<UserData>(agencyUsersQuery);
  
  const userForRequest = useMemo(() => {
    if (!requestToProcess || !agencyUsers) return null;
    return agencyUsers.find(u => u.email === requestToProcess.email) || null;
  }, [requestToProcess, agencyUsers]);


  const inactiveUsers = useMemo(() => {
    if (!agencyUsers || !settings.inactivityAlertDays) return [];

    const now = new Date();
    return agencyUsers.filter(user => {
      const lastActiveDate = user.gdprReportedAt ? new Date(user.gdprReportedAt) : (user.lastSignInTime ? new Date(user.lastSignInTime) : null);
      if (!lastActiveDate) return false; 

      return differenceInDays(now, lastActiveDate) > settings.inactivityAlertDays;
    });
  }, [agencyUsers, settings.inactivityAlertDays]);


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
    setDocumentNonBlocking(agencyRef, { personalization: { gdprSettings: settings } }, { merge: true });
    toast({ title: "Paramètres enregistrés", description: "Vos paramètres RGPD ont été sauvegardés." });
  };
  
  const handleReportUser = (user: UserData) => {
    const userRef = doc(firestore, 'users', user.id);
    setDocumentNonBlocking(userRef, { gdprReportedAt: new Date().toISOString() }, { merge: true });
    toast({ title: "Alerte reportée", description: `L'alerte pour ${user.firstName} ${user.lastName} a été reportée.`});
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    const userRef = doc(firestore, 'users', userToDelete.id);
    await deleteDocumentNonBlocking(userRef);
    toast({ title: "Utilisateur supprimé", description: `Les données de ${userToDelete.firstName} ${userToDelete.lastName} ont été supprimées de Firestore.`});
    setUserToDelete(null);
  }

  const handleMarkRequestAsClosed = async () => {
    if (!requestToProcess) return;
    setIsProcessing(true);
    try {
        await sendGdprEmail({
            emailSettings: personalization.emailSettings,
            recipientEmail: requestToProcess.email,
            recipientName: requestToProcess.name,
            subject: 'Votre demande a été traitée',
            textBody: `Bonjour ${requestToProcess.name},\n\nVotre demande concernant vos données personnelles a été traitée par nos services.\n\nCordialement,\n${personalization.emailSettings.fromName}`,
            htmlBody: `<p>Bonjour ${requestToProcess.name},</p><p>Votre demande concernant vos données personnelles a été traitée par nos services.</p><p>Cordialement,<br/>L'équipe ${personalization.emailSettings.fromName}</p>`
        });
        
        const requestRef = doc(firestore, 'gdpr_requests', requestToProcess.id);
        await setDocumentNonBlocking(requestRef, { status: 'closed' }, { merge: true });
        
        toast({ title: "Demande traitée", description: "La demande a été marquée comme fermée et un e-mail a été envoyé."});
        setRequestToProcess(null);
    } catch (e) {
        toast({ title: "Erreur", description: "Impossible de traiter la demande.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleGoToUserEdit = () => {
    if (!userForRequest) return;
    router.push('/admin/settings/users');
    setRequestToProcess(null);
    toast({ title: "Redirection", description: `Veuillez rechercher ${userForRequest.email} dans la liste pour le modifier.`})
  };

  const handleDeleteUserAccount = async () => {
      if (!userForRequest) return;
      setIsProcessing(true);
      try {
          await sendGdprEmail({
              emailSettings: personalization.emailSettings,
              recipientEmail: userForRequest.email,
              recipientName: `${userForRequest.firstName} ${userForRequest.lastName}`,
              subject: 'Confirmation de suppression de votre compte',
              textBody: `Bonjour ${userForRequest.firstName},\n\nConformément à votre demande, nous vous confirmons que votre compte et vos données personnelles associées vont être supprimés de notre plateforme.\n\nCordialement,\nL'équipe ${personalization.emailSettings.fromName}`,
              htmlBody: `<p>Bonjour ${userForRequest.firstName},</p><p>Conformément à votre demande, nous vous confirmons que votre compte et vos données personnelles associées vont être supprimés de notre plateforme.</p><p>Cordialement,<br/>L'équipe ${personalization.emailSettings.fromName}</p>`
          });

          // Delete user document
          const userRef = doc(firestore, 'users', userForRequest.id);
          await deleteDocumentNonBlocking(userRef);
          
          // Close the GDPR request
          const requestRef = doc(firestore, 'gdpr_requests', requestToProcess!.id);
          await setDocumentNonBlocking(requestRef, { status: 'closed' }, { merge: true });

          toast({ title: "Compte supprimé", description: `L'utilisateur ${userForRequest.email} a été supprimé.` });
          setRequestToProcess(null);

      } catch (e) {
          toast({ title: "Erreur", description: "Impossible de supprimer le compte.", variant: "destructive" });
      } finally {
          setIsProcessing(false);
      }
  }


  const isLoading = isAgencyLoading || areUsersLoading;

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
          Gérez les données, la conformité RGPD et les demandes des utilisateurs.
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
                       <Button variant="outline" size="sm" onClick={() => setRequestToProcess(request)}>Traiter</Button>
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
      
       <Card>
        <CardHeader>
          <CardTitle>Alertes d'inactivité</CardTitle>
          <CardDescription>
            Liste des utilisateurs considérés comme inactifs selon le délai de {settings.inactivityAlertDays} jours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Dernière activité</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ) : inactiveUsers.length > 0 ? (
                inactiveUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      {user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString('fr-FR') : (user.gdprReportedAt ? `Reporté le ${new Date(user.gdprReportedAt).toLocaleDateString('fr-FR')}` : 'Inconnue')}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleReportUser(user)}>Reporter</Button>
                      <Button variant="destructive" size="sm" onClick={() => setUserToDelete(user)}>Supprimer</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Aucun utilisateur inactif.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                   Cette action supprimera l'utilisateur <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong> de la base de données Firestore. La suppression du compte d'authentification doit être effectuée manuellement depuis la console Firebase pour des raisons de sécurité.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUserConfirm} className="bg-destructive hover:bg-destructive/90">Confirmer la suppression</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={!!requestToProcess} onOpenChange={open => !open && setRequestToProcess(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Traiter la demande RGPD</DialogTitle>
            <DialogDescription>
              Demande de {requestToProcess?.name} concernant "{requestToProcess?.subject}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium">Informations du demandeur</p>
              <p className="text-muted-foreground">
                {requestToProcess?.name}<br />
                {requestToProcess?.email}<br />
                {requestToProcess?.phone}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Message</p>
              <p className="text-muted-foreground p-3 border rounded-md bg-muted whitespace-pre-wrap">{requestToProcess?.message}</p>
            </div>
             {userForRequest && (
                <div className="space-y-1 pt-4 border-t">
                    <p className="font-medium flex items-center gap-2"><Info className="h-4 w-4 text-blue-500" /> Un compte utilisateur est associé à cet e-mail.</p>
                </div>
             )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {userForRequest && (
                <>
                <Button variant="destructive" onClick={handleDeleteUserAccount} disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer le Compte
                </Button>
                <Button variant="secondary" onClick={handleGoToUserEdit} disabled={isProcessing}>
                    <Edit className="mr-2 h-4 w-4" /> Modifier l'Utilisateur
                </Button>
                </>
            )}
             <Button onClick={handleMarkRequestAsClosed} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Check className="mr-2 h-4 w-4" /> Marquer comme traité
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
