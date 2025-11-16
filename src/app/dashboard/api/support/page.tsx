'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemoFirebase, useCollection } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, MessageSquare } from "lucide-react";

type SupportRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'closed';
  createdAt: string;
  agencyId: string;
};

const statusVariant: Record<SupportRequest['status'], 'default' | 'secondary' | 'destructive'> = {
  new: 'destructive',
  in_progress: 'default',
  closed: 'secondary',
};

const statusText: Record<SupportRequest['status'], string> = {
  new: 'Nouveau',
  in_progress: 'En cours',
  closed: 'Fermé',
};


export default function SupportPage() {
    const firestore = useFirestore();

    const supportRequestsCollectionRef = useMemoFirebase(() => {
        return query(collection(firestore, 'support_requests'));
    }, [firestore]);

    const { data: supportRequests, isLoading } = useCollection<SupportRequest>(supportRequestsCollectionRef);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Support Technique</h1>
                <p className="text-muted-foreground">
                    Gérez les demandes de support et la FAQ de la plateforme.
                </p>
            </div>
            <Tabs defaultValue="requests">
                <TabsList>
                    <TabsTrigger value="requests">Liste des demandes</TabsTrigger>
                    <TabsTrigger value="faq">Gestion de contenu (FAQ)</TabsTrigger>
                </TabsList>
                <TabsContent value="requests">
                    <Card>
                        <CardHeader>
                            <CardTitle>Demandes de support</CardTitle>
                            <CardDescription>Liste de toutes les demandes de support envoyées via le formulaire de contact.</CardDescription>
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
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                                    ) : supportRequests && supportRequests.length > 0 ? (
                                        supportRequests.map(request => (
                                        <TableRow key={request.id}>
                                            <TableCell>
                                            <div className="font-medium">{request.name}</div>
                                            <div className="text-sm text-muted-foreground">{request.email}</div>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">{request.message}</TableCell>
                                            <TableCell>{new Date(request.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                                            <TableCell><Badge variant={statusVariant[request.status]}>{statusText[request.status]}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                {/* Actions to be implemented */}
                                            </TableCell>
                                        </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Aucune demande de support.
                                        </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="faq">
                     <Card>
                        <CardHeader>
                            <CardTitle>Gestion de la FAQ</CardTitle>
                             <CardDescription>Créez et modifiez les questions-réponses pour la page d'aide.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-lg text-center">
                                <MessageSquare className="h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">Bientôt disponible</h3>
                                <p className="mt-2 text-sm text-muted-foreground">La gestion de la FAQ sera bientôt disponible ici.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}