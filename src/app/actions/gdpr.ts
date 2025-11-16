
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

const sendEmailSchema = z.object({
  emailSettings: emailSettingsSchema,
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  subject: z.string(),
  textBody: z.string(),
  htmlBody: z.string(),
});

type SendEmailResponse = {
  success: boolean;
  error?: string;
};

export async function sendGdprEmail(data: z.infer<typeof sendEmailSchema>): Promise<SendEmailResponse> {
  const validation = sendEmailSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }
  
  const { emailSettings, recipientEmail, recipientName, subject, textBody, htmlBody } = validation.data;

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
      text: textBody,
      html: htmlBody,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error sending GDPR email:", error);
    return { success: false, error: error.message || "Une erreur inconnue est survenue lors de l'envoi de l'e-mail." };
  }
}
