
'use server';

import nodemailer from 'nodemailer';
import { z } from 'zod';

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, "L'hôte SMTP est requis."),
  smtpPort: z.number().min(1, "Le port SMTP est requis."),
  smtpUser: z.string().min(1, "Le nom d'utilisateur SMTP est requis."),
  smtpPass: z.string().min(1, "Le mot de passe SMTP est requis."),
  smtpSecure: z.boolean(),
  fromEmail: z.string().email("L'e-mail de l'expéditeur n'est pas valide."),
  fromName: z.string().min(1, "Le nom de l'expéditeur est requis."),
});

const testEmailSchema = z.object({
    settings: emailSettingsSchema,
    recipient: z.string().email("L'e-mail du destinataire n'est pas valide."),
});

const replyEmailSchema = z.object({
    settings: emailSettingsSchema,
    recipientEmail: z.string().email("L'e-mail du destinataire n'est pas valide."),
    subject: z.string().min(1, "Le sujet est requis."),
    htmlBody: z.string().min(1, "Le corps de l'e-mail est requis."),
});


type SendEmailResponse = {
  success: boolean;
  error?: string;
};

export async function sendTestEmail(data: z.infer<typeof testEmailSchema>): Promise<SendEmailResponse> {
  const validation = testEmailSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  const { settings, recipient } = validation.data;

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: recipient,
      subject: "E-mail de test - VApps Success Hub",
      text: "Bonjour,\n\nCeci est un e-mail de test pour vérifier votre configuration SMTP.\n\nSi vous recevez cet e-mail, cela signifie que vos paramètres sont corrects.\n\nCordialement,\nL'équipe VApps",
      html: `
        <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>E-mail de test</h2>
            <p>Bonjour,</p>
            <p>Ceci est un e-mail de test pour vérifier votre configuration SMTP pour la plateforme <strong>VApps Success Hub</strong>.</p>
            <p>Si vous recevez cet e-mail, cela signifie que vos paramètres sont corrects et que l'application peut envoyer des e-mails.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.9em; color: #666;">Cordialement,<br>L'équipe VApps</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error sending test email:", error);
    let errorMessage = "Une erreur inconnue est survenue.";
    if (error.code === 'ECONNREFUSED') {
      errorMessage = `La connexion au serveur SMTP a été refusée. Vérifiez l'hôte (${settings.smtpHost}) et le port (${settings.smtpPort}).`;
    } else if (error.code === 'EAUTH') {
        errorMessage = "L'authentification a échoué. Vérifiez votre nom d'utilisateur et votre mot de passe.";
    } else {
        errorMessage = error.message || "Impossible d'envoyer l'e-mail de test.";
    }
    return { success: false, error: errorMessage };
  }
}

export async function sendReplyEmail(data: z.infer<typeof replyEmailSchema>): Promise<SendEmailResponse> {
  const validation = replyEmailSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  const { settings, recipientEmail, subject, htmlBody } = validation.data;

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: recipientEmail,
      subject: subject,
      html: htmlBody,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error sending reply email:", error);
    return { success: false, error: error.message || "Une erreur inconnue est survenue lors de l'envoi de l'e-mail." };
  }
}
