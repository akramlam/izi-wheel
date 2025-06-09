require('dotenv').config();

console.log('🧪 Testing File-Based Email System...\n');

console.log('📋 Environment Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'Not set'}`);
console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM}`);
console.log('');

// Test the file transport directly
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Create file transport (same as in mailer.ts)
const createFileTransport = () => {
  const emailsDir = path.join(process.cwd(), 'emails');
  if (!fs.existsSync(emailsDir)) {
    fs.mkdirSync(emailsDir, { recursive: true });
  }
  
  return {
    sendMail: async (mailOptions) => {
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

async function testEmails() {
  try {
    const transporter = createFileTransport();

    console.log('📧 Testing Prize Email...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@iziwheel.com',
      to: 'winner@example.com',
      subject: '🎉 Félicitations ! Vous avez gagné un prix sur IZI Wheel',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">🎉 Félicitations !</h1>
          </div>
          
          <p>Vous avez gagné <strong>Free Coffee</strong> sur IZI Wheel !</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Pour récupérer votre prix :</p>
            <ul style="padding-left: 20px;">
              <li><strong>Code PIN :</strong> PIN123456</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Merci d'avoir participé !<br>
            L'équipe IZI Wheel
          </p>
        </div>
      `
    });
    console.log('✅ Prize email test completed');

    console.log('📧 Testing Invitation Email...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@iziwheel.com',
      to: 'newuser@example.com',
      subject: 'Bienvenue sur IZI Wheel - Test Company',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">Bienvenue sur IZI Wheel!</h1>
          </div>
          
          <p>Bonjour New User,</p>
          
          <p>Vous avez été invité(e) par <strong>Admin User</strong> à rejoindre <strong>Test Company</strong> sur la plateforme IZI Wheel.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Voici vos identifiants de connexion:</p>
            <ul style="padding-left: 20px;">
              <li><strong>Email:</strong> newuser@example.com</li>
              <li><strong>Mot de passe temporaire:</strong> TempPass123</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Cordialement,<br>
            L'équipe IZI Wheel
          </p>
        </div>
      `
    });
    console.log('✅ Invitation email test completed');

    console.log('\n🎉 All email tests completed successfully!');
    console.log('📁 Check the ./emails/ folder for generated email files');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('   Error details:', error);
  }
}

testEmails(); 