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
 */
export const sendInviteEmail = async (
  email: string,
  password: string,
  companyName: string
): Promise<void> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@iziwheel.com',
      to: email,
      subject: `Welcome to IZI Wheel - ${companyName}`,
      html: `
        <h1>Welcome to IZI Wheel!</h1>
        <p>You have been invited to join <strong>${companyName}</strong> on IZI Wheel.</p>
        <p>Here are your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Temporary Password:</strong> ${password}</li>
        </ul>
        <p>Please login and change your password as soon as possible.</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">Click here to login</a></p>
        <p>Thank you,<br>The IZI Wheel Team</p>
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