
'use server';

import { z } from 'zod';
import nodemailer from 'nodemailer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { JSDOM } from 'jsdom';

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

const paymentSettingsSchema = z.object({
    ribIban: z.string().optional(),
    ribBic: z.string().optional(),
    paypalClientId: z.string().optional(),
    paypalMeLink: z.string().optional(),
}).passthrough();

const invoiceItemSchema = z.object({
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

const invoiceSchema = z.object({
    id: z.string(),
    invoiceNumber: z.string(),
    quoteNumber: z.string(),
    clientInfo: clientInfoSchema,
    issueDate: z.string(),
    dueDate: z.string(),
    total: z.number(),
    subtotal: z.number(),
    tax: z.number(),
    status: z.string(),
    items: z.array(invoiceItemSchema),
    notes: z.string().optional(),
});

const sendInvoiceSchema = z.object({
    invoice: invoiceSchema,
    emailSettings: emailSettingsSchema,
    legalInfo: legalInfoSchema,
    paymentSettings: paymentSettingsSchema,
});


type SendInvoiceResponse = {
  success: boolean;
  error?: string;
};

export async function sendInvoice(data: z.infer<typeof sendInvoiceSchema>): Promise<SendInvoiceResponse> {
    const validation = sendInvoiceSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { invoice, emailSettings, legalInfo, paymentSettings } = validation.data;

    try {
        // 1. Generate PDF
        const doc = new jsPDF();
        const isVatSubject = legalInfo?.isVatSubject ?? false;

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
        doc.text('FACTURE', 200, 20, { align: 'right' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`N°: ${invoice.invoiceNumber}`, 200, 30, { align: 'right' });
        doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString('fr-FR')}`, 200, 35, { align: 'right' });
        doc.text(`Échéance: ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`, 200, 40, { align: 'right' });
        doc.text(`Ref Devis: ${invoice.quoteNumber}`, 200, 45, { align: 'right' });

        doc.setDrawColor(230);
        doc.line(15, 53, 200, 53);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('FACTURÉ À', 15, 60);
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text(invoice.clientInfo.name, 15, 67);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(invoice.clientInfo.email, 15, 72);
        if (invoice.clientInfo.address && invoice.clientInfo.zipCode && invoice.clientInfo.city) {
          doc.text(`${invoice.clientInfo.address}`, 15, 77);
          doc.text(`${invoice.clientInfo.zipCode} ${invoice.clientInfo.city}`, 15, 82);
        }

        autoTable(doc, {
            startY: 85,
            head: [['Description', 'Qté', 'P.U. HT', 'Total HT']],
            body: invoice.items.map(item => [
                item.description,
                item.quantity,
                `${item.unitPrice.toFixed(2)} €`,
                `${(item.quantity * item.unitPrice).toFixed(2)} €`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: 100, fontStyle: 'bold' },
            styles: { cellPadding: 3, fontSize: 10 },
            columnStyles: {
                0: { cellWidth: 95 }, 1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' },
            }
        });
        
        let finalY = (doc as any).lastAutoTable.finalY;

        const totals = [
            ['Sous-total HT', `${invoice.subtotal.toFixed(2)} €`],
        ];
        if (isVatSubject) {
            totals.push([`TVA (${invoice.tax}%)`, `${(invoice.subtotal * (invoice.tax / 100)).toFixed(2)} €`]);
        }
        totals.push([`Total à régler ${isVatSubject ? 'TTC' : ''}`, `${invoice.total.toFixed(2)} €`]);

        autoTable(doc, {
            startY: finalY + 10,
            body: totals,
            theme: 'plain', styles: { fontSize: 10 },
            columnStyles: { 0: { halign: 'right', fontStyle: 'bold' }, 1: { halign: 'right', cellWidth: 40 } },
            didParseCell: (data) => {
                if (data.row.index === totals.length - 1) {
                    data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = 12;
                }
            }
        });
        
        finalY = (doc as any).lastAutoTable.finalY + 15;
        
        doc.setFontSize(10);
        doc.setTextColor(40);
        doc.text("Conditions de paiement :", 15, finalY);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Paiement dû le ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}.`, 15, finalY + 5);

        finalY += 15;

        if (paymentSettings.ribIban && paymentSettings.ribBic) {
            doc.setFontSize(10);
            doc.setTextColor(40);
            doc.text("Paiement par virement bancaire :", 15, finalY);
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`IBAN: ${paymentSettings.ribIban}`, 15, finalY + 5);
            doc.text(`BIC: ${paymentSettings.ribBic}`, 15, finalY + 10);
            finalY += 20;
        }

        if (paymentSettings.paypalMeLink) {
             doc.setFontSize(10);
            doc.setTextColor(40);
            doc.text("Paiement par PayPal :", 15, finalY);
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(paymentSettings.paypalMeLink, 15, finalY + 5);
        }


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
            host: emailSettings.smtpHost, port: emailSettings.smtpPort, secure: emailSettings.smtpSecure,
            auth: { user: emailSettings.smtpUser, pass: emailSettings.smtpPass },
        });

        const paypalButtonHtml = paymentSettings.paypalClientId ? `
            <div id="paypal-button-container" style="max-width:250px; margin-top:20px;"></div>
            <script src="https://www.paypal.com/sdk/js?client-id=${paymentSettings.paypalClientId}&currency=EUR"><\/script>
            <script>
              paypal.Buttons({
                createOrder: function(data, actions) {
                  return actions.order.create({
                    purchase_units: [{
                      description: 'Facture ${invoice.invoiceNumber}',
                      amount: {
                        value: '${invoice.total.toFixed(2)}'
                      }
                    }]
                  });
                },
                onApprove: function(data, actions) {
                  return actions.order.capture().then(function(details) {
                    alert('Transaction complétée par ' + details.payer.name.given_name + '!');
                  });
                }
              }).render('#paypal-button-container');
            <\/script>
        ` : '';
        
        await transporter.sendMail({
            from: `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`,
            to: invoice.clientInfo.email,
            subject: `Votre facture n° ${invoice.invoiceNumber}`,
            text: `Bonjour ${invoice.clientInfo.name},\n\nVeuillez trouver ci-joint votre facture n° ${invoice.invoiceNumber}.\n\nCordialement,\n${emailSettings.fromName}`,
            html: `
                <p>Bonjour ${invoice.clientInfo.name},</p>
                <p>Suite à votre acceptation du devis n°${invoice.quoteNumber}, veuillez trouver ci-joint la facture correspondante n° ${invoice.invoiceNumber} au format PDF.</p>
                ${paypalButtonHtml ? `<p>Vous pouvez régler cette facture directement en ligne via PayPal :</p>${paypalButtonHtml}`: ''}
                <p>Nous restons à votre disposition pour toute question.</p>
                <p>Cordialement,<br/>${emailSettings.fromName}</p>
            `,
            attachments: [
                { filename: `facture-${invoice.invoiceNumber}.pdf`, content: Buffer.from(pdfBuffer), contentType: 'application/pdf' },
            ],
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error sending invoice email:", error);
        return { success: false, error: error.message || "Une erreur inconnue est survenue lors de l'envoi de la facture." };
    }
}
