import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { logEmailAttempt, updateEmailStatus, EmailType, EmailStatus } from './email-logger';

// Get SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.smtp.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '2525');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

// Alternative ports for fallback (based on troubleshooting guides)
const FALLBACK_PORTS = [2525, 587, 465, 25];

// SMTP.com API configuration
const SMTP_COM_API_KEY = process.env.SMTP_COM_API_KEY || '';
const SMTP_COM_API_URL = 'https://api.smtp.com/v4';
const USE_SMTP_COM_API = process.env.USE_SMTP_COM_API === 'true' && SMTP_COM_API_KEY;

// Check if SMTP configuration is valid
const isSmtpConfigured = SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS;
const isSmtpComApiConfigured = USE_SMTP_COM_API && SMTP_COM_API_KEY;

// Enhanced SMTP transporter with connection testing and fallback ports
const createSmtpTransporter = async (port = SMTP_PORT) => {
  const config = {
    host: SMTP_HOST,
    port: port,
    secure: port === 465, // Use secure for port 465, false for others
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Additional options based on troubleshooting guides
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000,   // 30 seconds
    socketTimeout: 60000,     // 60 seconds
    // Disable certificate validation for development
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  };

  console.log(`[SMTP] Attempting connection to ${SMTP_HOST}:${port}`);
  const transporter = nodemailer.createTransport(config);
  
  try {
    // Test the connection
    await transporter.verify();
    console.log(`[SMTP] ✅ Connection successful on port ${port}`);
    return transporter;
  } catch (error) {
    const err = error as Error;
    console.log(`[SMTP] ❌ Connection failed on port ${port}:`, err.message);
    throw error;
  }
};

// SMTP.com API email sender
const sendViaSmtpComApi = async (mailOptions: any) => {
  console.log(`[SMTP.COM API] Sending email to ${mailOptions.to}`);
  
  // SMTP.com API v4 official format from documentation
  const emailData = {
    channel: 'contact_izitouch_fr', // Your actual channel name from dashboard
    originator: {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'IZI Kado',
        address: mailOptions.from
      }
    },
    recipients: {
      to: [
        {
          name: mailOptions.toName || '',
          address: mailOptions.to
        }
      ]
    },
    subject: mailOptions.subject,
    body: {
      parts: [
        {
          type: 'text/html',
          content: mailOptions.html
        },
        {
          type: 'text/plain', 
          content: mailOptions.text || mailOptions.html?.replace(/<[^>]*>/g, '') || ''
        }
      ]
    }
  };

  try {
    const response = await fetch(`${SMTP_COM_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SMTP_COM_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[SMTP.COM API] ❌ Error ${response.status}:`, errorData);
      throw new Error(`SMTP.com API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log(`[SMTP.COM API] ✅ Email sent successfully:`, result);
    return { messageId: (result as any).data?.message_id || `smtp-com-${Date.now()}` };
  } catch (error) {
    const err = error as Error;
    console.error(`[SMTP.COM API] ❌ Failed to send via API:`, err.message);
    throw error;
  }
};

// Create a development file transport for testing
const createFileTransport = () => {
  const emailsDir = path.join(process.cwd(), 'emails');
  if (!fs.existsSync(emailsDir)) {
    fs.mkdirSync(emailsDir, { recursive: true });
  }
  
  return {
    sendMail: async (mailOptions: any) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `email-${timestamp}.html`;
      const filepath = path.join(emailsDir, filename);
      
      const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${mailOptions.subject}</title>
</head>
<body>
    <h2>Email Details</h2>
    <p><strong>To:</strong> ${mailOptions.to}</p>
    <p><strong>From:</strong> ${mailOptions.from}</p>
    <p><strong>Subject:</strong> ${mailOptions.subject}</p>
    <hr>
    <div>
        ${mailOptions.html || mailOptions.text || 'No content'}
    </div>
</body>
</html>`;
      
      fs.writeFileSync(filepath, emailContent);
      console.log(`[EMAIL] 📁 Email saved to file: ${filepath}`);
      console.log(`[EMAIL] 📧 Would send to: ${mailOptions.to}`);
      console.log(`[EMAIL] 📝 Subject: ${mailOptions.subject}`);
      
      return { messageId: `file-${timestamp}` };
    }
  };
};

// Create a test/fallback transport when SMTP is not configured
const testTransport = {
  sendMail: async (mailOptions: any) => {
    console.log('EMAIL NOT SENT (SMTP not configured) - Would have sent:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text || 'Email content would be here'
    });
    return { messageId: 'test-id' };
  }
};

// Enhanced transport that supports both SMTP.com API and traditional SMTP with fallbacks
const createEnhancedTransport = () => {
  let cachedTransporter: any = null;
  
  return {
    sendMail: async (mailOptions: any) => {
      console.log(`[EMAIL] Attempting to send email to: ${mailOptions.to}`);
      console.log(`[EMAIL] Subject: ${mailOptions.subject}`);
      
      // Try SMTP.com API first if configured
      if (isSmtpComApiConfigured) {
        try {
          console.log(`[EMAIL] Using SMTP.com API for delivery`);
          return await sendViaSmtpComApi(mailOptions);
        } catch (error) {
          const err = error as Error;
          console.error(`[EMAIL] SMTP.com API failed, falling back to traditional SMTP:`, err.message);
        }
      }
      
      // Fall back to traditional SMTP
      if (isSmtpConfigured) {
        console.log(`[EMAIL] Using traditional SMTP for delivery`);
        
        // Try to use cached transporter first
        if (cachedTransporter) {
          try {
            const result = await cachedTransporter.sendMail(mailOptions);
            console.log(`[SMTP] ✅ Email sent successfully via cached connection`);
            return result;
          } catch (error) {
            const err = error as Error;
            console.log(`[SMTP] Cached connection failed, creating new connection:`, err.message);
            cachedTransporter = null;
          }
        }
        
        // Try different ports based on troubleshooting guides
        for (const port of FALLBACK_PORTS) {
          try {
            const transporter = await createSmtpTransporter(port);
            const result = await transporter.sendMail(mailOptions);
            
            // Cache successful transporter
            cachedTransporter = transporter;
            console.log(`[SMTP] ✅ Email sent successfully on port ${port}`);
            return result;
          } catch (error) {
            const err = error as any; // Use 'any' to access SMTP-specific properties
            console.log(`[SMTP] Port ${port} failed:`, err.message);
            
            // Check for specific SMTP error codes (based on Google's guide)
            if (err.code === 'EAUTH' || err.responseCode === 535) {
              console.error(`[SMTP] ❌ Authentication failed. Check credentials.`);
              break; // Don't try other ports for auth errors
            }
            
            if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
              console.log(`[SMTP] Connection issue on port ${port}, trying next port...`);
              continue; // Try next port
            }
            
            // For other errors, continue to next port
            continue;
          }
        }
        
        throw new Error(`All SMTP ports failed. Check your network connection and SMTP settings.`);
      } else {
        throw new Error('No email transport configured');
      }
    }
  };
};

// Create the appropriate transporter
const transporter = (isSmtpComApiConfigured || isSmtpConfigured) 
  ? createEnhancedTransport()
  : (process.env.NODE_ENV === 'development' ? createFileTransport() : testTransport);

// Log email configuration status on startup
if (isSmtpComApiConfigured) {
  console.log(`[EMAIL] ✅ Mailer initialized: Using SMTP.com REST API`);
} else if (isSmtpConfigured) {
  console.log(`[EMAIL] ✅ Mailer initialized: Using traditional SMTP (${SMTP_HOST}:${SMTP_PORT})`);
} else if (process.env.NODE_ENV === 'development') {
  console.log(`[EMAIL] 📁 Mailer initialized: Using file transport (emails saved to ./emails/ folder)`);
} else {
  console.log(`[EMAIL] ⚠️  Mailer initialized: Using test transport (emails will be logged but not sent)`);
}

/**
 * Send an invitation email to a new user
 * @param email User's email address
 * @param password Temporary password
 * @param companyName Company name
 * @param adminName Admin name (optional)
 * @param userName User's name (optional)
 */
export const sendInviteEmail = async (
  email: string,
  password: string,
  companyName: string,
  adminName?: string,
  userName?: string,
  companyId?: string,
  userId?: string
): Promise<void> => {
  let emailLogId: string | null = null;
  
  try {
    // Log the email attempt
    emailLogId = await logEmailAttempt({
      type: EmailType.INVITATION,
      recipient: email,
      subject: `Bienvenue sur IZI Kado - ${companyName}`,
      companyId,
      userId,
      metadata: {
        companyName,
        adminName,
        userName,
        hasPassword: !!password
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://dashboard.izikado.fr';
    const greeting = userName ? `Bonjour ${userName},` : 'Bonjour,';
    const invitedBy = adminName ? `par <strong>${adminName}</strong>` : '';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@izikado.fr',
      to: email,
      subject: `Bienvenue sur IZI Kado - ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">🎯 Bienvenue sur IZI Kado!</h1>
          </div>
          
          <p style="font-size: 16px;">${greeting}</p>
          
          <p style="font-size: 16px;">Vous avez été invité(e) ${invitedBy} à rejoindre <strong>${companyName}</strong> sur la plateforme IZI Kado.</p>
          
          <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0288d1;">
            <p style="margin: 0; font-weight: bold; color: #01579b; font-size: 16px;">🔑 Vos identifiants de connexion :</p>
            <div style="margin: 15px 0; padding: 15px; background-color: white; border-radius: 6px;">
              <p style="margin: 0 0 10px 0; font-size: 16px;"><strong>Email :</strong> ${email}</p>
              <p style="margin: 0; font-size: 16px;"><strong>Mot de passe temporaire :</strong> <span style="font-family: monospace; font-size: 18px; color: #d32f2f; font-weight: bold; background-color: #ffebee; padding: 4px 8px; border-radius: 4px;">${password}</span></p>
            </div>
          </div>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <p style="margin: 0; font-weight: bold; color: #e65100; font-size: 16px;">🔒 Important - Sécurité :</p>
            <p style="margin: 10px 0 0 0; color: #e65100;">Vous devrez <strong>changer ce mot de passe temporaire</strong> lors de votre première connexion pour des raisons de sécurité.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/admin-login" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              🚀 Se connecter maintenant
            </a>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #495057;">📋 Étapes de connexion :</p>
            <ol style="margin: 0; padding-left: 20px; color: #495057;">
              <li style="margin-bottom: 5px;">Cliquez sur le bouton ci-dessus</li>
              <li style="margin-bottom: 5px;">Saisissez votre email et mot de passe temporaire</li>
              <li style="margin-bottom: 5px;">Créez votre nouveau mot de passe sécurisé</li>
              <li>Commencez à utiliser IZI Kado ! 🎉</li>
            </ol>
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">Si vous avez des questions, n'hésitez pas à contacter votre administrateur.</p>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px; text-align: center;">
            Cordialement,<br>
            <strong>L'équipe IZI Kado</strong><br>
            <small>Plateforme de roues de la fortune digitales</small>
          </p>
        </div>
      `,
    };

    if (!isSmtpConfigured) {
      console.log(`[TEST MODE] Invitation email would be sent to ${email} with password ${password}`);
      if (emailLogId) {
        await updateEmailStatus(emailLogId, EmailStatus.SENT, 'test-mode');
      }
      return;
    }

    const result = await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent to ${email}`);
    
    // Update email status to SENT
    if (emailLogId) {
      await updateEmailStatus(emailLogId, EmailStatus.SENT, result.messageId);
    }
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    
    // Update email status to FAILED
    if (emailLogId) {
      await updateEmailStatus(
        emailLogId, 
        EmailStatus.FAILED, 
        undefined, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    
    // Don't throw the error, just log it - we don't want API calls to fail if email fails
  }
};

/**
 * Send a prize notification email
 * @param email Recipient email
 * @param prizeName Name of the prize
 * @param qrCode QR code for redemption
 * @param pin PIN code for redemption
 */
export const sendPrizeEmail = async (
  email: string,
  prizeName: string,
  qrCode: string,
  pin: string,
  playId?: string,
  companyId?: string
): Promise<void> => {
  let emailLogId: string | null = null;
  
  try {
    console.log(`[EMAIL] Attempting to send prize email to: ${email}`);
    console.log(`[EMAIL] Prize: ${prizeName}, PIN: ${pin}`);
    console.log(`[EMAIL] SMTP Config - Host: ${SMTP_HOST}, Port: ${SMTP_PORT}, User: ${SMTP_USER}`);
    
    // Log the email attempt
    emailLogId = await logEmailAttempt({
      type: EmailType.PRIZE_NOTIFICATION,
      recipient: email,
      subject: `🎉 Félicitations ! Vous avez gagné un prix sur IZI Kado`,
      companyId,
      playId,
      metadata: {
        prizeName,
        pin,
        hasQrCode: !!qrCode
      }
    });
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@iziwheel.com',
      to: email,
      subject: `🎉 Félicitations ! Vous avez gagné un prix sur IZI Kado`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">🎉 Félicitations !</h1>
          </div>
          
          <p>Vous avez gagné <strong>${prizeName}</strong> sur IZI Kado !</p>
          
          <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0288d1;">
            <p style="margin: 0; font-weight: bold; color: #01579b; font-size: 16px;">🎁 Vos codes de récupération :</p>
            <div style="margin: 15px 0; padding: 10px; background-color: white; border-radius: 6px;">
              <p style="margin: 0; font-size: 18px;"><strong>Code PIN :</strong> <span style="font-family: monospace; font-size: 20px; color: #d32f2f; font-weight: bold;">${pin}</span></p>
            </div>
            ${qrCode ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #01579b;"><strong>Ou scannez le QR code ci-dessous</strong></p>` : ''}
          </div>
          
          ${qrCode ? `
          <div style="text-align: center; margin: 20px 0;">
            <img src="${qrCode}" alt="Code QR pour récupérer votre prix" style="max-width: 200px; height: auto;" />
          </div>
          ` : ''}
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #495057;">📍 Comment récupérer votre prix :</p>
            <ol style="margin: 0; padding-left: 20px; color: #495057;">
              <li style="margin-bottom: 5px;">Présentez-vous au point de vente</li>
              <li style="margin-bottom: 5px;">Montrez votre <strong>code PIN : ${pin}</strong> ${qrCode ? 'ou scannez le QR code' : ''}</li>
              <li>Profitez de votre prix ! 🎉</li>
            </ol>
          </div>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Merci d'avoir participé !<br>
            L'équipe IZI Kado
          </p>
        </div>
      `,
    };

    console.log(`[EMAIL] Mail options prepared for: ${email}`);
    
    if (!isSmtpConfigured) {
      console.log(`[EMAIL] SMTP not configured - would send email to ${email}`);
      console.log(`[EMAIL] Subject: ${mailOptions.subject}`);
      console.log(`[EMAIL] Missing config - Host: ${SMTP_HOST}, User: ${SMTP_USER}, Pass: ${SMTP_PASS ? '[SET]' : '[MISSING]'}`);
      
      if (emailLogId) {
        await updateEmailStatus(emailLogId, EmailStatus.SENT, 'test-mode');
      }
      return;
    }

    console.log(`[EMAIL] Sending via SMTP...`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Prize notification email sent successfully to ${email}`);
    console.log(`[EMAIL] Message ID: ${result.messageId}`);
    
    // Update email status to SENT
    if (emailLogId) {
      await updateEmailStatus(emailLogId, EmailStatus.SENT, result.messageId);
    }
  } catch (error) {
    console.error(`[EMAIL] ❌ Failed to send prize email to ${email}:`, error);
    console.error(`[EMAIL] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      command: (error as any)?.command,
      response: (error as any)?.response
    });
    
    // Update email status to FAILED
    if (emailLogId) {
      await updateEmailStatus(
        emailLogId, 
        EmailStatus.FAILED, 
        undefined, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    
    // Don't throw the error, just log it
  }
};

/**
 * Send a password reset email
 * @param email User's email address
 * @param resetToken Reset token
 * @param companyName Company name
 * @param userName User's name (optional)
 */
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  companyName: string,
  userName?: string
): Promise<void> => {
  let emailLogId: string | null = null;
  
  try {
    console.log(`[EMAIL] Attempting to send password reset email to: ${email}`);
    
    // Log the email attempt
    emailLogId = await logEmailAttempt({
      type: EmailType.PASSWORD_RESET,
      recipient: email,
      subject: `Réinitialisation de votre mot de passe - ${companyName}`,
      metadata: {
        companyName,
        userName,
        hasResetToken: !!resetToken
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://dashboard.izikado.fr';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    const greeting = userName ? `Bonjour ${userName},` : 'Bonjour,';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@iziwheel.com',
      to: email,
      subject: `Réinitialisation de votre mot de passe - ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">🔑 Réinitialisation de mot de passe</h1>
          </div>
          
          <p style="font-size: 16px;">${greeting}</p>
          
          <p style="font-size: 16px;">Vous avez demandé la réinitialisation de votre mot de passe pour votre compte <strong>${companyName}</strong> sur la plateforme IZI Kado.</p>
          
          <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0288d1;">
            <p style="margin: 0; font-weight: bold; color: #01579b; font-size: 16px;">🔒 Réinitialisation sécurisée :</p>
            <p style="margin: 10px 0 0 0; color: #01579b;">Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe sécurisé.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              🔐 Réinitialiser mon mot de passe
            </a>
          </div>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <p style="margin: 0; font-weight: bold; color: #e65100; font-size: 16px;">⚠️ Important :</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #e65100;">
              <li>Ce lien est valide pendant <strong>1 heure</strong></li>
              <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
              <li>Ne partagez jamais ce lien avec quelqu'un d'autre</li>
            </ul>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #495057;">🛡️ Conseils de sécurité :</p>
            <ul style="margin: 0; padding-left: 20px; color: #495057;">
              <li style="margin-bottom: 5px;">Choisissez un mot de passe d'au moins 8 caractères</li>
              <li style="margin-bottom: 5px;">Mélangez lettres, chiffres et symboles</li>
              <li style="margin-bottom: 5px;">Évitez les mots du dictionnaire</li>
              <li>Ne réutilisez pas d'anciens mots de passe</li>
            </ul>
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
          <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f9fafb; padding: 10px; border-radius: 4px;">${resetUrl}</p>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px; text-align: center;">
            Cordialement,<br>
            <strong>L'équipe IZI Kado</strong><br>
            <small>Plateforme de roues de la fortune digitales</small>
          </p>
        </div>
      `,
    };

    console.log(`[EMAIL] Mail options prepared for password reset: ${email}`);
    
    if (!isSmtpConfigured) {
      console.log(`[EMAIL] SMTP not configured - would send password reset email to ${email}`);
      console.log(`[EMAIL] Reset URL: ${resetUrl}`);
      
      if (emailLogId) {
        await updateEmailStatus(emailLogId, EmailStatus.SENT, 'test-mode');
      }
      return;
    }

    console.log(`[EMAIL] Sending password reset email via SMTP...`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Password reset email sent successfully to ${email}`);
    console.log(`[EMAIL] Message ID: ${result.messageId}`);
    
    // Update email status to SENT
    if (emailLogId) {
      await updateEmailStatus(emailLogId, EmailStatus.SENT, result.messageId);
    }
  } catch (error) {
    console.error(`[EMAIL] ❌ Failed to send password reset email to ${email}:`, error);
    
    // Update email status to FAILED
    if (emailLogId) {
      await updateEmailStatus(
        emailLogId, 
        EmailStatus.FAILED, 
        undefined, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    
    // Don't throw the error, just log it
  }
};

export default transporter; 