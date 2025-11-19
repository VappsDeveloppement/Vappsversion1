

'use server';

import { z } from 'zod';
import nodemailer from 'nodemailer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JSDOM } from 'jsdom';

// No longer using Firebase Admin SDK on the server for this action

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().min(1),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  smtpSecure: z.boolean(),
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
});

const legalInfoSchema = z.object({
    companyName: z.string().optional(),
    addressStreet: z.string().optional(),
    addressZip: z.string().optional(),
    addressCity: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    siret: z.string().optional(),
    isVatSubject: z.boolean().optional(),
    vatNumber: z.string().optional(),
}).passthrough();

const quoteItemSchema = z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    total: z.number(),
});

const clientInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    address: z.string().optional(),
    zipCode: z.string().optional(),
    city: z.string().optional(),
});

const quoteSchema = z.object({
    id: z.string(),
    quoteNumber: z.string(),
    validationCode: z.string(),
    clientInfo: clientInfoSchema,
    issueDate: z.string(),
    expiryDate: z.string().optional(),
    total: z.number(),
    subtotal: z.number(),
    tax: z.number(),
    status: z.string(),
    items: z.array(quoteItemSchema),
    notes: z.string().optional(),
    contractId: z.string().optional(),
    contractContent: z.string().optional(),
    contractTitle: z.string().optional(),
});

const sendQuoteSchema = z.object({
    quote: quoteSchema,
    emailSettings: emailSettingsSchema,
    legalInfo: legalInfoSchema,
});


type SendQuoteResponse = {
  success: boolean;
  error?: string;
};

export async function sendQuote(data: z.infer<typeof sendQuoteSchema>): Promise<SendQuoteResponse> {
    const validation = sendQuoteSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { quote, emailSettings, legalInfo } = validation.data;

    try {
        // 1. Generate PDF
        const doc = new jsPDF();
        const isVatSubject = legalInfo?.isVatSubject ?? false;

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text(legalInfo?.companyName || 'VApps', 15, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(legalInfo?.addressStreet || '', 15, 26);
        doc.text(`${legalInfo?.addressZip || ''} ${legalInfo?.addressCity || ''}`, 15, 31);
        doc.text(legalInfo?.email || '', 15, 36);

        doc.setFontSize(28);
        doc.setTextColor(150);
        doc.text('DEVIS', 200, 20, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`N°: ${quote.quoteNumber}`, 200, 30, { align: 'right' });
        doc.text(`Date: ${new Date(quote.issueDate).toLocaleDateString('fr-FR')}`, 200, 35, { align: 'right' });
        if (quote.expiryDate) {
            doc.text(`Valide jusqu'au: ${new Date(quote.expiryDate).toLocaleDateString('fr-FR')}`, 200, 40, { align: 'right' });
        }

        // Client info
        doc.setDrawColor(230);
        doc.line(15, 48, 200, 48);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('FACTURÉ À', 15, 55);
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text(quote.clientInfo.name, 15, 62);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(quote.clientInfo.email, 15, 67);
        if (quote.clientInfo.address && quote.clientInfo.zipCode && quote.clientInfo.city) {
          doc.text(`${quote.clientInfo.address}`, 15, 72);
          doc.text(`${quote.clientInfo.zipCode} ${quote.clientInfo.city}`, 15, 77);
        }


        // Table
        autoTable(doc, {
            startY: 80,
            head: [['Description', 'Qté', 'P.U. HT', 'Total HT']],
            body: quote.items.map(item => [
                item.description,
                item.quantity,
                `${item.unitPrice.toFixed(2)} €`,
                `${(item.quantity * item.unitPrice).toFixed(2)} €`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: 100, fontStyle: 'bold' },
            styles: { cellPadding: 3, fontSize: 10 },
            columnStyles: {
                0: { cellWidth: 95 },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 30, halign: 'right' },
            }
        });
        
        const finalY = (doc as any).lastAutoTable.finalY;

        // Totals
        const totals = [
            ['Sous-total HT', `${quote.subtotal.toFixed(2)} €`],
        ];
        if (isVatSubject) {
            totals.push([`TVA (${quote.tax}%)`, `${(quote.subtotal * (quote.tax / 100)).toFixed(2)} €`]);
        }
        totals.push([`Total ${isVatSubject ? 'TTC' : ''}`, `${quote.total.toFixed(2)} €`]);

        autoTable(doc, {
            startY: finalY + 10,
            body: totals,
            theme: 'plain',
            styles: { fontSize: 10 },
            columnStyles: { 0: { halign: 'right', fontStyle: 'bold' }, 1: { halign: 'right', cellWidth: 40 } },
            didParseCell: (data) => {
                if (data.row.index === totals.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = 12;
                }
            }
        });

        // Notes
        let currentY = (doc as any).lastAutoTable.finalY + 15;
        if (quote.notes) {
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text('Notes', 15, currentY);
            currentY += 5;
            doc.setFontSize(10);
            doc.setTextColor(100);
            const notesLines = doc.splitTextToSize(quote.notes, 180);
            doc.text(notesLines, 15, currentY);
        }
        
        // Contract
        if (quote.contractContent) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(quote.contractTitle || "Contrat", 15, 20);

            let y = 35;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40);
            
            // Basic HTML to text conversion
            const dom = new JSDOM();
            const document = dom.window.document;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = quote.contractContent;
            const textContent = tempDiv.textContent || "";
            
            const lines = doc.splitTextToSize(textContent, 180);
            doc.text(lines, 15, y);
        }

        // Footer for all pages
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const footerText = `${legalInfo?.companyName || ''} - ${legalInfo?.addressStreet || ''}, ${legalInfo?.addressZip || ''} ${legalInfo?.addressCity || ''}`;
            const footerText2 = `SIRET: ${legalInfo?.siret || ''} - ${isVatSubject ? `TVA: ${legalInfo?.vatNumber || ''}` : 'TVA non applicable, art. 293 B du CGI'}`;
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(footerText, 105, 285, { align: 'center' });
            doc.text(footerText2, 105, 290, { align: 'center' });
        }

        const pdfBuffer = doc.output('arraybuffer');
        

        // 2. Send email
        const transporter = nodemailer.createTransport({
            host: emailSettings.smtpHost,
            port: emailSettings.smtpPort,
            secure: emailSettings.smtpSecure,
            auth: {
                user: emailSettings.smtpUser,
                pass: emailSettings.smtpPass,
            },
        });
        
        const validationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/quote/${quote.id}`;

        await transporter.sendMail({
            from: `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`,
            to: quote.clientInfo.email,
            subject: `Votre devis n° ${quote.quoteNumber} de la part de ${emailSettings.fromName}`,
            text: `Bonjour ${quote.clientInfo.name},\n\nVeuillez trouver ci-joint votre devis n° ${quote.quoteNumber}.\n\nPour valider ce devis, veuillez vous rendre à l'adresse suivante : ${validationUrl}\n\nCordialement,\n${emailSettings.fromName}`,
            html: `
                <p>Bonjour ${quote.clientInfo.name},</p>
                <p>Veuillez trouver ci-joint votre devis n° ${quote.quoteNumber} au format PDF.</p>
                <p>Pour consulter et valider ce devis directement en ligne, veuillez cliquer sur le lien ci-dessous :</p>
                <p><a href="${validationUrl}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Consulter mon devis</a></p>
                <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur : ${validationUrl}</p>
                <p>Cordialement,<br/>${emailSettings.fromName}</p>
            `,
            attachments: [
                {
                    filename: `devis-${quote.quoteNumber}.pdf`,
                    content: Buffer.from(pdfBuffer),
                    contentType: 'application/pdf',
                },
            ],
        });

        // The responsibility of updating the quote status is now on the client side
        return { success: true };
    } catch (error: any) {
        console.error("Error sending quote email:", error);
        return { success: false, error: error.message || "Une erreur inconnue est survenue lors de l'envoi du devis." };
    }
}
