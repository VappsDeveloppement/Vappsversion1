'use server';

import { z } from 'zod';
import nodemailer from 'nodemailer';

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, "L'hôte SMTP est requis."),
  smtpPort: z.number().min(1, "Le port SMTP est requis."),
  smtpUser: z.string().min(1, "L'utilisateur SMTP est requis."),
  smtpPass: z.string().min(1, "Le mot de passe SMTP est requis."),
  smtpSecure: z.boolean(),
  fromEmail: z.string().email("L'email de l'expéditeur est requis.").min(1),
  fromName: z.string().min(1, "Le nom de l'expéditeur est requis."),
});

const sendProgramSchema = z.object({
    recipientEmail: z.string().email("L'email du destinataire est invalide."),
    subject: z.string().min(1, "Le sujet est requis."),
    htmlBody: z.string().min(1, "Le corps de l'email est requis."),
    pdfDataUri: z.string().min(1, "Les données du PDF sont requises."),
    fileName: z.string().min(1, "Le nom du fichier est requis."),
    emailSettings: emailSettingsSchema,
});

type SendEmailResponse = {
  success: boolean;
  error?: string;
};

export async function sendTrainingProgram(data: z.infer<typeof sendProgramSchema>): Promise<SendEmailResponse> {
    const validation = sendProgramSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { recipientEmail, subject, htmlBody, pdfDataUri, fileName, emailSettings } = validation.data;

    try {
        const transporter = nodemailer.createTransport({
            host: emailSettings.smtpHost,
            port: emailSettings.smtpPort,
            secure: emailSettings.smtpSecure,
            auth: {
                user: emailSettings.smtpUser,
                pass: emailSettings.smtpPass,
            },
        });

        await transporter.sendMail({
            from: `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`,
            to: recipientEmail,
            subject: subject,
            html: htmlBody,
            attachments: [
                {
                    filename: fileName,
                    content: pdfDataUri.split('base64,')[1],
                    encoding: 'base64',
                    contentType: 'application/pdf',
                },
            ],
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error sending training program email:", error);
        return { success: false, error: error.message || "Une erreur inconnue est survenue." };
    }
}
