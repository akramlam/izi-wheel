import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

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
  
  const emailData = {
    from: {
      email: mailOptions.from,
      name: process.env.EMAIL_FROM_NAME || 'IZI Wheel'
    },
    to: [
      {
        email: mailOptions.to,
        name: mailOptions.toName || ''
      }
    ],
    subject: mailOptions.subject,
    html: mailOptions.html,
    text: mailOptions.text || ''
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
  userName?: string
): Promise<void> => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const greeting = userName ? `Bonjour ${userName},` : 'Bonjour,';
    const invitedBy = adminName ? `par <strong>${adminName}</strong>` : '';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@iziwheel.com',
      to: email,
      subject: `Bienvenue sur IZI Wheel - ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">Bienvenue sur IZI Wheel!</h1>
          </div>
          
          <p>${greeting}</p>
          
          <p>Vous avez été invité(e) ${invitedBy} à rejoindre <strong>${companyName}</strong> sur la plateforme IZI Wheel.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Voici vos identifiants de connexion:</p>
            <ul style="padding-left: 20px;">
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Mot de passe temporaire:</strong> ${password}</li>
            </ul>
          </div>
          
          <p><strong>Important:</strong> Pour des raisons de sécurité, vous devrez changer ce mot de passe temporaire lors de votre première connexion.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/login" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Se connecter maintenant
            </a>
          </div>
          
          <p>Si vous avez des questions, n'hésitez pas à contacter votre administrateur.</p>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Cordialement,<br>
            L'équipe IZI Wheel
          </p>
        </div>
      `,
    };

    if (!isSmtpConfigured) {
      console.log(`[TEST MODE] Invitation email would be sent to ${email} with password ${password}`);
      return;
    }

    await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send invitation email:', error);
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
  pin: string
): Promise<void> => {
  try {
    console.log(`[EMAIL] Attempting to send prize email to: ${email}`);
    console.log(`[EMAIL] Prize: ${prizeName}, PIN: ${pin}`);
    console.log(`[EMAIL] SMTP Config - Host: ${SMTP_HOST}, Port: ${SMTP_PORT}, User: ${SMTP_USER}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@iziwheel.com',
      to: email,
      subject: `🎉 Félicitations ! Vous avez gagné un prix sur IZI Wheel`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">🎉 Félicitations !</h1>
          </div>
          
          <p>Vous avez gagné <strong>${prizeName}</strong> sur IZI Wheel !</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Pour récupérer votre prix, vous avez deux options :</p>
            <ul style="padding-left: 20px;">
              <li><strong>Code PIN :</strong> ${pin}</li>
              ${qrCode ? `<li><strong>Code QR :</strong> Scannez le code ci-dessous</li>` : ''}
            </ul>
          </div>
          
          ${qrCode ? `
          <div style="text-align: center; margin: 20px 0;">
            <img src="${qrCode}" alt="Code QR pour récupérer votre prix" style="max-width: 200px; height: auto;" />
          </div>
          ` : ''}
          
          <p><strong>Comment récupérer votre prix :</strong></p>
          <ol>
            <li>Présentez-vous au point de vente</li>
            <li>Montrez ce code PIN : <strong>${pin}</strong> ${qrCode ? 'ou scannez le code QR' : ''}</li>
            <li>Profitez de votre prix !</li>
          </ol>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Merci d'avoir participé !<br>
            L'équipe IZI Wheel
          </p>
        </div>
      `,
    };

    console.log(`[EMAIL] Mail options prepared for: ${email}`);
    
    if (!isSmtpConfigured) {
      console.log(`[EMAIL] SMTP not configured - would send email to ${email}`);
      console.log(`[EMAIL] Subject: ${mailOptions.subject}`);
      console.log(`[EMAIL] Missing config - Host: ${SMTP_HOST}, User: ${SMTP_USER}, Pass: ${SMTP_PASS ? '[SET]' : '[MISSING]'}`);
      return;
    }

    console.log(`[EMAIL] Sending via SMTP...`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Prize notification email sent successfully to ${email}`);
    console.log(`[EMAIL] Message ID: ${result.messageId}`);
  } catch (error) {
    console.error(`[EMAIL] ❌ Failed to send prize email to ${email}:`, error);
    console.error(`[EMAIL] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      command: (error as any)?.command,
      response: (error as any)?.response
    });
    // Don't throw the error, just log it
  }
};

export default transporter; 