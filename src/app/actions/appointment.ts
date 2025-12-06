
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
    clientName: z.string(),
    clientEmail: z.string().email(),
});

const sendConfirmationSchema = z.object({
    appointment: appointmentDetailsSchema,
    emailSettings: emailSettingsSchema,
});

type SendConfirmationResponse = {
  success: boolean;
  error?: string;
};

export async function sendConfirmationEmail(data: z.infer<typeof sendConfirmationSchema>): Promise<SendConfirmationResponse> {
    const validation = sendConfirmationSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { appointment, emailSettings } = validation.data;

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
        const subject = `Confirmation de votre rendez-vous : ${appointment.title}`;
        
        const htmlBody = `
            <p>Bonjour ${appointment.clientName},</p>
            <p>Ceci est une confirmation pour votre rendez-vous "<strong>${appointment.title}</strong>" programmé le <strong>${appointmentDate}</strong>.</p>
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            <p>Cordialement,<br/>L'équipe ${emailSettings.fromName}</p>
        `;

        await transporter.sendMail({
            from: `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`,
            to: appointment.clientEmail,
            subject: subject,
            html: htmlBody,
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error sending confirmation email:", error);
        return { success: false, error: error.message || "Une erreur inconnue est survenue." };
    }
}
