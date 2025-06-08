require('dotenv').config({ path: 'apps/api/.env' });
const nodemailer = require('nodemailer');

async function testCurrentEmailSetup() {
  console.log('🧪 Testing current SMTP.com setup...\n');

  // Read configuration from .env
  const config = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM
  };

  console.log('📋 Configuration Check:');
  console.log(`   SMTP_HOST: ${config.SMTP_HOST}`);
  console.log(`   SMTP_PORT: ${config.SMTP_PORT}`);
  console.log(`   SMTP_USER: ${config.SMTP_USER}`);
  console.log(`   EMAIL_FROM: ${config.EMAIL_FROM}`);
  console.log(`   SMTP_PASSWORD: ${config.SMTP_PASSWORD ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASSWORD) {
    console.log('❌ Missing SMTP configuration');
    return;
  }

  try {
    // Create transporter
    console.log('🔗 Creating SMTP transporter...');
    const transporter = nodemailer.createTransporter({
      host: config.SMTP_HOST,
      port: parseInt(config.SMTP_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
    });

    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    // Send test email
    console.log('📧 Sending test email...');
    const mailOptions = {
      from: config.EMAIL_FROM,
      to: 'test@example.com', // Change this to your email to actually receive it
      subject: '🎯 IZI Wheel - SMTP.com Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">✅ SMTP.com Test Successful!</h1>
          </div>
          
          <p>Congratulations! Your SMTP.com email setup is working perfectly.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>SMTP Server:</strong> ${config.SMTP_HOST}</li>
              <li><strong>Port:</strong> ${config.SMTP_PORT}</li>
              <li><strong>From Address:</strong> ${config.EMAIL_FROM}</li>
              <li><strong>Test Time:</strong> ${new Date().toISOString()}</li>
            </ul>
          </div>
          
          <p>Your wheel prize emails will be delivered successfully! 🎉</p>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            This test email was sent from your IZI Wheel application.<br>
            <strong>Domain:</strong> izikado.fr
          </p>
        </div>
      `,
      text: 'SMTP.com Test - Your email setup is working correctly!'
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully!');
    console.log('📬 Email Details:');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   From: ${config.EMAIL_FROM}`);
    console.log(`   To: ${mailOptions.to}`);
    console.log(`   Subject: ${mailOptions.subject}`);
    console.log('');
    console.log('🎉 Your SMTP.com integration is working perfectly!');
    console.log('💡 Prize emails will be delivered successfully to winners.');

  } catch (error) {
    console.log('❌ Email test failed:', error.message);
    
    // Common error solutions
    if (error.code === 'EAUTH') {
      console.log('💡 Authentication failed - check username/password');
    } else if (error.code === 'ECONNECTION') {
      console.log('💡 Connection failed - check host and port');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('💡 Connection timeout - check firewall/network');
    }
  }
}

testCurrentEmailSetup().catch(console.error); 