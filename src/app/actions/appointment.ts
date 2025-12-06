
'use server';

import { z } from 'zod';
import nodemailer from 'nodemailer';

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().min(1),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  smtpSecure: z.boolean(),
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
});

const appointmentDetailsSchema = z.object({
    title: z.string(),
    start: z.string(),
    description: z.string(),
});

const clientDetailsSchema = z.object({
    name: z.string(),
    email: z.string().email(),
});

const counselorDetailsSchema = z.object({
    name: z.string(),
    email: z.string().email(),
});

const sendConfirmationSchema = z.object({
    appointment: appointmentDetailsSchema,
    client: clientDetailsSchema,
    counselor: counselorDetailsSchema,
    emailSettings: emailSettingsSchema,
});

type SendConfirmationResponse = {
  success: boolean;
  error?: string;
};

export async function sendConfirmationEmails(data: z.infer<typeof sendConfirmationSchema>): Promise<SendConfirmationResponse> {
    const validation = sendConfirmationSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { appointment, client, counselor, emailSettings } = validation.data;

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

        const appointmentDate = new Date(appointment.start).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
        
        // Email to client
        await transporter.sendMail({
            from: `"${counselor.name}" <${counselor.email}>`,
            to: client.email,
            subject: `Confirmation de votre rendez-vous: ${appointment.title}`,
            html: `
                <p>Bonjour ${client.name},</p>
                <p>Ceci est une confirmation de votre rendez-vous "<strong>${appointment.title}</strong>" prévu le <strong>${appointmentDate}</strong>.</p>
                ${appointment.description ? `<p><strong>Notes :</strong> ${appointment.description}</p>` : ''}
                <p>Cordialement,<br/>${counselor.name}</p>
            `,
        });

        // Confirmation email to counselor
        await transporter.sendMail({
            from: `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`,
            to: counselor.email,
            subject: `Nouveau rendez-vous confirmé avec ${client.name}`,
            html: `
                <p>Bonjour ${counselor.name},</p>
                <p>Un nouveau rendez-vous a été confirmé avec <strong>${client.name}</strong>.</p>
                <ul>
                    <li><strong>Titre :</strong> ${appointment.title}</li>
                    <li><strong>Date :</strong> ${appointmentDate}</li>
                    <li><strong>Client :</strong> ${client.name} (${client.email})</li>
                </ul>
            `,
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error sending appointment confirmation emails:", error);
        return { success: false, error: error.message || "Une erreur inconnue est survenue." };
    }
}
