import { Resend } from 'resend';
import { env, isResendConfigured } from '../config/env';

export interface RecoveryEmailPayload {
  to: string;
  username: string;
  resetCode: string;
}

export interface RecoveryEmailResult {
  sentVia: 'resend' | 'console';
  devResetCode?: string;
}

export async function sendPasswordRecoveryEmail(
  payload: RecoveryEmailPayload
): Promise<RecoveryEmailResult> {
  const subject = 'BeerDex — Recuperación de usuario y contraseña';
  const html = `
    <div style="font-family: sans-serif; background: #120E0B; color: #F8F1E5; padding: 24px; border-radius: 12px;">
      <h2 style="color: #E5A93C; margin-top: 0;">BeerDex</h2>
      <p>Has solicitado recuperar el acceso a tu cuenta.</p>
      <p><strong>Tu nombre de usuario:</strong> ${payload.username}</p>
      <p><strong>Código de restablecimiento (válido 30 minutos):</strong></p>
      <p style="font-size: 24px; letter-spacing: 4px; font-weight: bold; color: #E5A93C;">${payload.resetCode}</p>
      <p style="color: #B9AA98; font-size: 13px;">Si no solicitaste este correo, puedes ignorarlo.</p>
    </div>
  `;

  if (isResendConfigured()) {
    const resendClient = new Resend(env.resend.apiKey);
    await resendClient.emails.send({
      from: env.resend.emailFrom,
      to: payload.to,
      subject,
      html,
    });
    return { sentVia: 'resend' };
  }

  if (env.nodeEnv !== 'test') {
    console.log(
      `[BeerDex Email Fallback] Para: ${payload.to} | Usuario: ${payload.username} | Código reset: ${payload.resetCode}`
    );
  }

  return {
    sentVia: 'console',
    devResetCode: env.nodeEnv !== 'production' ? payload.resetCode : undefined,
  };
}
