'use server';

import { z } from 'zod';
import nodemailer from 'nodemailer';
import { initializeFirebase } from '@/firebase/server';
import { collection, getDocs } from 'firebase/firestore';

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().min(1),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  smtpSecure: z.boolean(),
  fromEmail: z.string().email(),
  fromName: z.string().min(1),
});

const eventDetailsSchema = z.object({
    id: z.string(),
    title: z.string(),
    date: z.string(),
    location: z.string().optional(),
    meetLink: z.string().optional(),
});

const sendConfirmationSchema = z.object({
    event: eventDetailsSchema,
    emailSettings: emailSettingsSchema,
});

type SendConfirmationResponse = {
  success: boolean;
  error?: string;
  sentCount?: number;
};

export async function sendConfirmationEmails(data: z.infer<typeof sendConfirmationSchema>): Promise<SendConfirmationResponse> {
    const validation = sendConfirmationSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { event, emailSettings } = validation.data;
    const { firestore } = initializeFirebase();

    try {
        // 1. Fetch all registrations for the event
        const registrationsRef = collection(firestore, `events/${event.id}/registrations`);
        const registrationsSnapshot = await getDocs(registrationsRef);

        if (registrationsSnapshot.empty) {
            return { success: false, error: "Aucun participant n'est inscrit à cet événement." };
        }

        const recipients = registrationsSnapshot.docs.map(doc => doc.data().userEmail as string);

        // 2. Create Nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: emailSettings.smtpHost,
            port: emailSettings.smtpPort,
            secure: emailSettings.smtpSecure,
            auth: {
                user: emailSettings.smtpUser,
                pass: emailSettings.smtpPass,
            },
        });

        // 3. Construct email body
        const eventDate = new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
        const subject = `Rappel: Votre inscription à l'événement "${event.title}"`;
        
        let htmlBody = `
            <p>Bonjour,</p>
            <p>Ceci est une confirmation de votre inscription à l'événement <strong>${event.title}</strong> qui aura lieu le <strong>${eventDate}</strong>.</p>
            <p>Voici les détails importants :</p>
            <ul>
        `;
        if (event.location) {
            htmlBody += `<li><strong>Lieu :</strong> ${event.location}</li>`;
        }
        if (event.meetLink) {
            htmlBody += `<li><strong>Lien de visioconférence :</strong> <a href="${event.meetLink}">${event.meetLink}</a></li>`;
        }
        htmlBody += `
            </ul>
            <p>Nous avons hâte de vous y voir !</p>
            <p>Cordialement,<br/>L'équipe ${emailSettings.fromName}</p>
        `;

        // 4. Send email to all recipients
        const info = await transporter.sendMail({
            from: `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`,
            to: recipients.join(', '), // Send to all recipients at once
            subject: subject,
            html: htmlBody,
        });

        return { success: true, sentCount: recipients.length };

    } catch (error: any) {
        console.error("Error sending confirmation emails:", error);
        return { success: false, error: error.message || "Une erreur inconnue est survenue." };
    }
}
