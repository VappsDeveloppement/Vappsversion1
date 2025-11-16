
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/shared/logo';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAgency } from '@/context/agency-provider';
import { sendInvoice } from '@/app/actions/invoice';
import Link from 'next/link';

type Quote = {
    id: string;
    quoteNumber: string;
    clientInfo: { name: string; id: string; email: string; address?: string; zipCode?: string; city?: string; };
    agencyId: string;
    agencyInfo: any;
    issueDate: string;
    expiryDate?: string;
    total: number;
    subtotal: number;
    tax: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected';
    items: any[];
    notes?: string;
    signature?: string;
    signedDate?: string;
    contractContent?: string;
    contractTitle?: string;
}

const statusVariant: Record<Quote['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    sent: 'default',
    accepted: 'default',
    rejected: 'destructive',
};
const statusText: Record<Quote['status'], string> = {
    draft: 'Brouillon',
    sent: 'Envoyé',
    accepted: 'Accepté',
    rejected: 'Refusé',
};


export default function PublicQuotePage() {
    const params = useParams();
    const router = useRouter();
    const { agencyId, quoteId } = params;
    
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [signatureName, setSignatureName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState<'accept' | 'reject' | false>(false);

    const quoteRef = useMemoFirebase(() => {
        if (!agencyId || !quoteId) return null;
        return doc(firestore, `agencies/${agencyId}/quotes/${quoteId}`);
    }, [firestore, agencyId, quoteId]);
    
    const { data: quote, isLoading, error } = useDoc<Quote>(quoteRef);

    const agencyDocRef = useMemoFirebase(() => {
        if (!agencyId) return null;
        return doc(firestore, `agencies/${agencyId}`);
    }, [firestore, agencyId]);
    const { data: agencyData } = useDoc(agencyDocRef);

    const personalization = agencyData?.personalization;

    const handleStatusUpdate = async (status: 'accepted' | 'rejected') => {
        if (!quote || !quoteRef) return;
        
        setIsSubmitting(status);
        
        const updateData: any = { status };
        if (status === 'accepted') {
            updateData.signature = signatureName;
            updateData.signedDate = new Date().toISOString();
        }

        try {
            await setDocumentNonBlocking(quoteRef, updateData, { merge: true });
            toast({
                title: `Devis ${status === 'accepted' ? 'accepté' : 'refusé'}`,
                description: "Le statut du devis a été mis à jour.",
            });
            if (status === 'accepted') {
                await generateAndSendInvoice();
            }
        } catch (e) {
            toast({
                title: "Erreur",
                description: "Impossible de mettre à jour le statut du devis.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

     const generateAndSendInvoice = async () => {
        if (!quote || !agencyId || !personalization) {
            toast({ title: "Erreur", description: "Données de devis ou d'agence manquantes.", variant: "destructive" });
            return;
        }

        const invoicesCollectionRef = collection(firestore, 'agencies', agencyId as string, 'invoices');
        const q = query(invoicesCollectionRef);
        const querySnapshot = await getDocs(q);
        const year = new Date().getFullYear();
        const yearInvoices = querySnapshot.docs.filter(doc => doc.data().invoiceNumber.startsWith(`FACT-${year}-`));
        const nextId = (yearInvoices.length + 1).toString().padStart(3, '0');
        const invoiceNumber = `FACT-${year}-${nextId}`;

        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(issueDate.getDate() + 30); // Due in 30 days

        const invoiceData: any = {
            invoiceNumber,
            quoteNumber: quote.quoteNumber,
            agencyId: agencyId,
            clientId: quote.clientInfo.id,
            clientInfo: quote.clientInfo,
            issueDate: issueDate.toISOString(),
            dueDate: dueDate.toISOString(),
            items: quote.items,
            subtotal: quote.subtotal,
            tax: quote.tax,
            total: quote.total,
            status: 'pending',
        };
        
        const newInvoiceRef = doc(invoicesCollectionRef);
        invoiceData.id = newInvoiceRef.id;
        
        await setDocumentNonBlocking(newInvoiceRef, invoiceData, {});
        
        const sendResult = await sendInvoice({
            invoice: invoiceData,
            emailSettings: personalization.emailSettings,
            legalInfo: personalization.legalInfo,
            paymentSettings: personalization.paymentSettings,
        });

        if (sendResult.success) {
            toast({ title: "Facture envoyée", description: `La facture ${invoiceNumber} a été envoyée au client.` });
        } else {
            toast({ title: "Erreur d'envoi de la facture", description: sendResult.error, variant: "destructive" });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30 p-4 sm:p-8 flex items-center justify-center">
                <Card className="w-full max-w-4xl p-8">
                    <Skeleton className="h-8 w-1/3 mb-4" />
                    <Skeleton className="h-4 w-1/4 mb-8" />
                    <Skeleton className="h-40 w-full" />
                </Card>
            </div>
        )
    }

    if (error || !quote) {
        return (
            <div className="min-h-screen bg-muted/30 p-4 sm:p-8 flex items-center justify-center">
                 <Card className="w-full max-w-md text-center p-8">
                    <CardHeader>
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                        <CardTitle className="mt-4">Devis introuvable</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Le lien de ce devis est peut-être invalide ou le devis a été supprimé.</p>
                         <Button onClick={() => router.push('/')} className="mt-4">Retour à l'accueil</Button>
                    </CardContent>
                 </Card>
            </div>
        )
    }
    
    const isVatSubject = quote.agencyInfo?.isVatSubject ?? false;
    const canBeSigned = quote.status === 'sent';
    const isFinalized = quote.status === 'accepted' || quote.status === 'rejected';
    
    return (
        <div className="min-h-screen bg-muted/30 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 flex justify-between items-center">
                    <Logo />
                    <Badge variant={statusVariant[quote.status]} className="text-base px-4 py-1">
                        {statusText[quote.status]}
                    </Badge>
                </header>

                <Card className="shadow-lg">
                    <CardHeader className="p-8 bg-muted/50 border-b">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-lg">{quote.agencyInfo?.companyName || 'Votre Agence'}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {quote.agencyInfo?.addressStreet}<br/>
                                    {quote.agencyInfo?.addressZip} {quote.agencyInfo?.addressCity}
                                </p>
                            </div>
                            <div className="text-left sm:text-right">
                                <h2 className="text-3xl font-bold text-foreground">DEVIS</h2>
                                <p className="text-muted-foreground">N° {quote.quoteNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                    Date: {new Date(quote.issueDate).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        </div>
                        <div className="pt-6">
                            <p className="text-sm font-semibold text-muted-foreground">CLIENT</p>
                            <p className="font-medium">{quote.clientInfo.name}</p>
                            <p className="text-muted-foreground">{quote.clientInfo.email}</p>
                            {quote.clientInfo.address && <p className="text-sm text-muted-foreground">{quote.clientInfo.address}, {quote.clientInfo.zipCode} {quote.clientInfo.city}</p>}
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60%]">Description</TableHead>
                                    <TableHead className="text-center">Qté</TableHead>
                                    <TableHead className="text-right">P.U. HT</TableHead>
                                    <TableHead className="text-right">Total HT</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quote.items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{item.description}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{item.unitPrice.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right">{(item.quantity * item.unitPrice).toFixed(2)} €</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <div className="mt-8 flex justify-end">
                            <div className="w-full max-w-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sous-total HT</span>
                                    <span>{quote.subtotal.toFixed(2)} €</span>
                                </div>
                                 {isVatSubject && (
                                     <div className="flex justify-between">
                                        <span className="text-muted-foreground">TVA ({quote.tax}%)</span>
                                        <span>{(quote.subtotal * quote.tax / 100).toFixed(2)} €</span>
                                    </div>
                                 )}
                                 <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Total {isVatSubject ? 'TTC' : ''}</span>
                                    <span>{quote.total.toFixed(2)} €</span>
                                 </div>
                            </div>
                        </div>
                         {quote.notes && (
                            <div className="mt-8 pt-6 border-t">
                                <h4 className="font-semibold mb-2">Notes</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
                            </div>
                        )}
                        {quote.contractContent && (
                            <div className="mt-8 pt-6 border-t">
                                <h4 className="font-semibold mb-2">{quote.contractTitle || "Contrat"}</h4>
                                <div
                                    className="prose prose-sm max-w-none border rounded-lg p-4 bg-muted/30"
                                    dangerouslySetInnerHTML={{ __html: quote.contractContent }}
                                />
                            </div>
                        )}
                    </CardContent>
                    
                    {isFinalized ? (
                         <CardFooter className="p-8 bg-muted/50 border-t flex-col items-start gap-4">
                            <h3 className="font-semibold text-lg">Devis finalisé</h3>
                           {quote.status === 'accepted' && (
                             <div className="text-sm">
                                 <p className="text-green-600 font-medium">Accepté et signé par : <strong>{quote.signature}</strong></p>
                                 <p className="text-muted-foreground">Le {new Date(quote.signedDate!).toLocaleDateString('fr-FR')}</p>
                             </div>
                           )}
                            {quote.status === 'rejected' && (
                                <p className="text-destructive font-medium">Ce devis a été refusé.</p>
                           )}
                           <Button asChild className="mt-4">
                               <Link href="/">Retour au site</Link>
                           </Button>
                         </CardFooter>
                    ) : (
                         <CardFooter className="p-8 bg-muted/50 border-t flex-col sm:flex-row items-center justify-between gap-6">
                            <h3 className="font-semibold text-lg flex-shrink-0">Action requise</h3>
                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="w-full sm:w-auto" disabled={!canBeSigned}>
                                            <XCircle className="mr-2 h-4 w-4"/>
                                            Refuser
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Refuser le devis ?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Cette action est irréversible. Êtes-vous sûr de vouloir refuser ce devis ?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="bg-destructive hover:bg-destructive/90"
                                                onClick={() => handleStatusUpdate('rejected')}
                                                disabled={isSubmitting === 'reject'}
                                            >
                                                {isSubmitting === 'reject' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Confirmer le refus
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full sm:w-auto" disabled={!canBeSigned}>
                                            <CheckCircle className="mr-2 h-4 w-4"/>
                                            Accepter et Signer
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Accepter le devis</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Veuillez saisir votre nom complet pour signer électroniquement ce devis. Cette action confirme votre accord avec les termes et le montant indiqués.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="py-4 space-y-2">
                                            <Label htmlFor="signature">Votre nom complet (pour signature)</Label>
                                            <Input 
                                                id="signature" 
                                                value={signatureName}
                                                onChange={(e) => setSignatureName(e.target.value)}
                                                placeholder="Ex: Jean Dupont"
                                            />
                                        </div>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={() => handleStatusUpdate('accepted')}
                                                disabled={!signatureName || isSubmitting === 'accept'}
                                            >
                                                {isSubmitting === 'accept' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Signer et Accepter
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
}
