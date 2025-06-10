require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🧪 Testing SMTP Configuration...\n');

// Get environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM;

console.log('📋 Configuration Check:');
console.log(`   SMTP_HOST: ${SMTP_HOST}`);
console.log(`   SMTP_PORT: ${SMTP_PORT}`);
console.log(`   SMTP_SECURE: ${SMTP_SECURE}`);
console.log(`   SMTP_USER: ${SMTP_USER}`);
console.log(`   SMTP_PASS: ${SMTP_PASS ? '✅ Set' : '❌ Missing'}`);
console.log(`   EMAIL_FROM: ${EMAIL_FROM}`);
console.log('');

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.log('❌ Missing required SMTP configuration');
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  debug: true,
  logger: true
});

// Test connection
console.log('🔌 Testing SMTP connection...');
transporter.verify()
  .then(() => {
    console.log('✅ SMTP connection successful!');
    
    // Send test email
    console.log('📧 Sending test email...');
    return transporter.sendMail({
      from: EMAIL_FROM || 'test@izikado.fr',
      to: 'boulboul1507@gmail.com',
      subject: 'Test Email from IZI Wheel',
      html: '<h1>Test Email</h1><p>This is a test email from your SMTP configuration.</p>',
      text: 'Test Email - This is a test email from your SMTP configuration.'
    });
  })
  .then((info) => {
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
  })
  .catch((error) => {
    console.error('❌ SMTP Error:', error.message);
    console.error('   Error Code:', error.code);
    console.error('   Error Command:', error.command);
    console.error('   Error Response:', error.response);
  }); 