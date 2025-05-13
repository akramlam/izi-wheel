import nodemailer from 'nodemailer';

// Create a transporter using SMTP.com
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.smtp.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
});

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
      subject: `Congratulations! You won a prize on IZI Wheel`,
      html: `
        <h1>Congratulations!</h1>
        <p>You have won <strong>${prizeName}</strong> on IZI Wheel.</p>
        <p>To redeem your prize, use one of the following methods:</p>
        <ul>
          <li>Scan this QR code: <img src="${qrCode}" alt="QR Code" /></li>
          <li>Or use this PIN code: <strong>${pin}</strong></li>
        </ul>
        <p>Thank you for participating!</p>
        <p>The IZI Wheel Team</p>
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