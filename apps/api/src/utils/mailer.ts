import nodemailer from 'nodemailer';

// Get SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.smtp.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

// Check if SMTP configuration is valid
const isSmtpConfigured = SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS;

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

// Create a transporter using SMTP.com if configured
const transporter = isSmtpConfigured ? nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
}) : testTransport;

// Log SMTP configuration status on startup
console.log(`Mailer initialized: ${isSmtpConfigured ? 'Using SMTP configuration' : 'Using test transport (emails will be logged but not sent)'}`);

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

    await transporter.sendMail(mailOptions);
    console.log(`Prize notification email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send prize email:', error);
    // Don't throw the error, just log it
  }
};

export default transporter; 