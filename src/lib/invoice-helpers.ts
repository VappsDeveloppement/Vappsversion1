'use client';
import { doc, collection, getDocs, query, setDoc, WriteBatch } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { sendInvoice } from '@/app/actions/invoice';
import type { Quote } from '@/components/shared/quote-management';
import type { Firestore } from 'firebase/firestore';

interface GenerateInvoiceArgs {
    quote: Quote;
    counselorId: string;
    firestore: Firestore;
    emailSettings: any;
    legalInfo: any;
    paymentSettings: any;
}

export async function generateAndSendInvoice({
    quote,
    counselorId,
    firestore,
    emailSettings,
    legalInfo,
    paymentSettings,
}: GenerateInvoiceArgs) {

    if (quote.status !== 'accepted') {
        toast({ title: "Action impossible", description: "Une facture ne peut être générée que pour un devis accepté.", variant: "destructive" });
        return;
    }

    try {
        const invoicesCollectionRef = collection(firestore, `users/${counselorId}/invoices`);
        const q = query(invoicesCollectionRef);
        const querySnapshot = await getDocs(q);
        
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `FACT-${year}-${month}-`;
        const monthInvoices = querySnapshot.docs.filter(doc => doc.data().invoiceNumber.startsWith(prefix));
        const nextId = (monthInvoices.length + 1).toString().padStart(4, '0');
        const invoiceNumber = `${prefix}${nextId}`;

        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(issueDate.getDate() + 30); // Due in 30 days

        const invoiceData: any = {
            invoiceNumber,
            quoteNumber: quote.quoteNumber,
            counselorId: quote.counselorId,
            clientId: quote.clientInfo.id,
            clientInfo: quote.clientInfo,
            issueDate: issueDate.toISOString(),
            dueDate: dueDate.toISOString(),
            items: quote.items,
            subtotal: quote.subtotal,
            tax: quote.tax,
            total: quote.total,
            status: 'pending_payment',
        };
        
        const newInvoiceRef = doc(invoicesCollectionRef);
        invoiceData.id = newInvoiceRef.id;
        
        await setDoc(newInvoiceRef, invoiceData);
        
        const sendResult = await sendInvoice({
            invoice: invoiceData,
            emailSettings: emailSettings,
            legalInfo: legalInfo,
            paymentSettings: paymentSettings,
        });

        if (sendResult.success) {
            toast({ title: "Facture envoyée", description: `La facture ${invoiceNumber} a été envoyée au client.` });
        } else {
            toast({ title: "Erreur d'envoi de la facture", description: sendResult.error, variant: "destructive" });
            // Rollback invoice creation? Optional.
        }
    } catch (error) {
        console.error("Failed to generate or send invoice:", error);
        toast({ title: "Erreur critique", description: "La création ou l'envoi de la facture a échoué.", variant: "destructive" });
    }
}
