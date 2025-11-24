
'use server';

import { z } from 'zod';
import nodemailer from 'nodemailer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JSDOM } from 'jsdom';

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, "L'hôte SMTP est requis."),
  smtpPort: z.number().min(1, "Le port SMTP est requis."),
  smtpUser: z.string().min(1, "L'utilisateur SMTP est requis."),
  smtpPass: z.string().min(1, "Le mot de passe SMTP est requis."),
  smtpSecure: z.boolean(),
  fromEmail: z.string().email("L'email de l'expéditeur est requis.").min(1),
  fromName: z.string().min(1, "Le nom de l'expéditeur est requis."),
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
    vatRate: z.number().optional(),
}).passthrough();

const quoteItemSchema = z.object({
    id: z.string(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    total: z.number(),
});

const clientInfoSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    email: z.string(),
    address: z.string().optional(),
    zipCode: z.string().optional(),
    city: z.string().optional(),
});

const quoteSchema = z.object({
    id: z.string(),
    quoteNumber: z.string(),
    validationCode: z.string().optional(),
    clientInfo: clientInfoSchema,
    issueDate: z.string(),
    expiryDate: z.string().nullable().optional(),
    total: z.number(),
    subtotal: z.number(),
    tax: z.number(),
    status: z.string(),
    items: z.array(quoteItemSchema),
    notes: z.string().optional(),
    contractId: z.string().optional(),
    contractContent: z.string().optional(),
    contractTitle: z.string().nullable().optional(),
    agencyInfo: legalInfoSchema.optional(),
});

const sendQuoteSchema = z.object({
    quote: quoteSchema,
    emailSettings: emailSettingsSchema,
    legalInfo: legalInfoSchema,
});

async function generatePdf(quote: z.infer<typeof quoteSchema>, legalInfo: z.infer<typeof legalInfoSchema>): Promise<Buffer> {
    const doc = new jsPDF();
    
    const text = (value: string | number | null | undefined, fallback = '') => {
        if (value === null || value === undefined) {
            return fallback;
        }
        return String(value);
    };


    const isVatSubject = legalInfo?.isVatSubject ?? false;
    const commercialName = text(legalInfo?.commercialName) || text(legalInfo?.companyName);
    const address = text(legalInfo?.address) || text(legalInfo?.addressStreet);
    const zipCode = text(legalInfo?.zipCode) || text(legalInfo?.addressZip);
    const city = text(legalInfo?.city) || text(legalInfo?.addressCity);
    const email = text(legalInfo?.email);
    const siret = text(legalInfo?.siret);
    const vatNumber = text(legalInfo?.vatNumber);

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text(commercialName, 15, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(address, 15, 26);
    doc.text(`${zipCode} ${city}`, 15, 31);
    doc.text(email, 15, 36);

    doc.setFontSize(28);
    doc.setTextColor(150);
    doc.text('DEVIS', 200, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`N°: ${text(quote.quoteNumber)}`, 200, 30, { align: 'right' });
    doc.text(`Date: ${new Date(quote.issueDate).toLocaleDateString('fr-FR')}`, 200, 35, { align: 'right' });
    if (quote.expiryDate) {
        doc.text(`Valide jusqu'au: ${new Date(quote.expiryDate).toLocaleDateString('fr-FR')}`, 200, 40, { align: 'right' });
    }

    // Client info
    doc.setDrawColor(230);
    doc.line(15, 48, 200, 48);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('CLIENT', 15, 55);
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(text(quote.clientInfo.name), 15, 62);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(text(quote.clientInfo.email), 15, 67);
    if (text(quote.clientInfo.address) || text(quote.clientInfo.zipCode) || text(quote.clientInfo.city)) {
      doc.text(text(quote.clientInfo.address), 15, 72);
      doc.text(`${text(quote.clientInfo.zipCode)} ${text(quote.clientInfo.city)}`, 15, 77);
    }


    // Table
    autoTable(doc, {
        startY: 80,
        head: [['Description', 'Qté', 'P.U. HT', 'Total HT']],
        body: quote.items.map(item => [
            text(item.description),
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
    
    let finalY = (doc as any).lastAutoTable.finalY;

    // Totals
    const totals = [
        ['Sous-total HT', `${quote.subtotal.toFixed(2)} €`],
    ];
    if (isVatSubject) {
        totals.push([`TVA (${quote.tax}%)`, `${(quote.subtotal * quote.tax / 100).toFixed(2)} €`]);
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

    finalY = (doc as any).lastAutoTable.finalY;
    
    // Notes
    if (quote.notes) {
        finalY += 15;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Notes', 15, finalY);
        finalY += 5;
        doc.setFontSize(10);
        doc.setTextColor(100);
        const notesLines = doc.splitTextToSize(text(quote.notes), 180);
        doc.text(notesLines, 15, finalY);
    }
    
    // Contract
    if (quote.contractContent) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(text(quote.contractTitle, "Contrat"), 15, 20);

        let y = 35;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40);
        
        const dom = new JSDOM();
        const document = dom.window.document;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text(quote.contractContent);
        const textContent = tempDiv.textContent || '';
        
        const lines = doc.splitTextToSize(textContent, 180);
        doc.text(lines, 15, y);
    }

    // Footer for all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerText = `${commercialName} - ${address}, ${zipCode} ${city}`;
        const footerText2 = `SIRET: ${siret} - ${isVatSubject ? `TVA: ${vatNumber}` : 'TVA non applicable, art. 293 B du CGI'}`;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(footerText, 105, 285, { align: 'center' });
        doc.text(footerText2, 105, 290, { align: 'center' });
    }

    return Buffer.from(doc.output('arraybuffer'));
}


type SendQuoteResponse = {
  success: boolean;
  error?: string;
};

export async function sendQuote(data: z.infer<typeof sendQuoteSchema>): Promise<SendQuoteResponse> {
    const validation = sendQuoteSchema.safeParse(data);
    if (!validation.success) {
        const errorMessages = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("Validation failed:", errorMessages);
        return { success: false, error: `Données du devis invalides: ${errorMessages}` };
    }

    const { quote, emailSettings, legalInfo } = validation.data;
    
    if (!emailSettings.fromEmail || !emailSettings.fromName) {
        return { success: false, error: "Le nom et l'e-mail de l'expéditeur sont requis. Veuillez les configurer." };
    }

    try {
        const pdfBuffer = await generatePdf(quote, legalInfo);
        
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
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error sending quote email:", error);
        return { success: false, error: error.message || "Une erreur inconnue est survenue lors de l'envoi du devis." };
    }
}
