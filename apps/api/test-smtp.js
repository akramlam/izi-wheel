#!/usr/bin/env node

/**
 * SMTP Test Script
 * 
 * This script tests your SMTP configuration based on the troubleshooting guides:
 * - LCN.com SMTP troubleshooting
 * - Google SMTP error codes
 * - ServerSMTP.com diagnostics
 * 
 * Run with: node test-smtp.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// SMTP Configuration from environment
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.smtp.com';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
const EMAIL_FROM = process.env.EMAIL_FROM || '';

// Test ports based on troubleshooting guides
const TEST_PORTS = [2525, 587, 465, 25];

console.log('🧪 SMTP Configuration Test\n');
console.log('Configuration:');
console.log(`Host: ${SMTP_HOST}`);
console.log(`User: ${SMTP_USER}`);
console.log(`From: ${EMAIL_FROM}`);
console.log(`Password: ${SMTP_PASS ? '✅ Set' : '❌ Missing'}\n`);

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error('❌ Missing required SMTP configuration in .env file');
  process.exit(1);
}

async function testSmtpConnection(port) {
  const config = {
    host: SMTP_HOST,
    port: port,
    secure: port === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    // Disable certificate validation for testing
    tls: {
      rejectUnauthorized: false
    }
  };

  console.log(`\n🔗 Testing connection on port ${port}...`);
  
  try {
    const transporter = nodemailer.createTransport(config);
    
    // Test connection
    await transporter.verify();
    console.log(`✅ Port ${port}: Connection successful!`);
    
    // Send test email
    const testEmail = {
      from: EMAIL_FROM,
      to: SMTP_USER, // Send to yourself for testing
      subject: `IZI Wheel SMTP Test - Port ${port}`,
      html: `
        <h2>🎉 SMTP Test Successful!</h2>
        <p>Your SMTP configuration is working correctly on port ${port}.</p>
        <p><strong>Host:</strong> ${SMTP_HOST}</p>
        <p><strong>Port:</strong> ${port}</p>
        <p><strong>Secure:</strong> ${port === 465}</p>
        <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
        <hr>
        <p><em>This is an automated test email from IZI Wheel SMTP configuration.</em></p>
      `,
      text: `SMTP Test Successful! Your configuration is working on ${SMTP_HOST}:${port}`
    };
    
    console.log(`📧 Sending test email...`);
    const result = await transporter.sendMail(testEmail);
    console.log(`✅ Test email sent successfully!`);
    console.log(`📮 Message ID: ${result.messageId}`);
    
    return { success: true, port, messageId: result.messageId };
    
  } catch (error) {
    console.log(`❌ Port ${port}: ${error.message}`);
    
    // Analyze error based on troubleshooting guides
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.log(`   🔍 Authentication error - Check username/password`);
    } else if (error.code === 'ECONNECTION') {
      console.log(`   🔍 Connection error - Port may be blocked`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`   🔍 Timeout error - Network or firewall issue`);
    } else if (error.responseCode) {
      console.log(`   🔍 SMTP Error Code: ${error.responseCode}`);
    }
    
    return { success: false, port, error: error.message };
  }
}

async function runSmtpTests() {
  console.log('🚀 Starting SMTP tests...\n');
  
  const results = [];
  
  for (const port of TEST_PORTS) {
    const result = await testSmtpConnection(port);
    results.push(result);
    
    if (result.success) {
      console.log(`\n🎉 SUCCESS! Port ${port} is working perfectly.`);
      console.log(`\nRecommendation: Update your .env file with:`);
      console.log(`SMTP_PORT=${port}`);
      console.log(`SMTP_SECURE=${port === 465}`);
      break; // Stop on first success
    }
  }
  
  console.log('\n📊 Test Summary:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Port ${result.port}: ${result.success ? 'Working' : 'Failed'}`);
  });
  
  if (!results.some(r => r.success)) {
    console.log('\n❌ All tests failed. Common solutions:');
    console.log('1. Check your internet connection');
    console.log('2. Verify SMTP credentials are correct');
    console.log('3. Check if your ISP blocks SMTP ports');
    console.log('4. Try using Gmail SMTP as alternative');
    console.log('5. Contact SMTP.com support for assistance');
  }
}

// Run the tests
runSmtpTests().catch(console.error); 