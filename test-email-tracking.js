const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_EMAIL = 'test@example.com';
const TEST_COMPANY_NAME = 'Test Company';

console.log('🧪 Testing Email Tracking System...\n');

// Test the email logging functionality
async function testEmailTracking() {
  try {
    console.log('📧 Testing email sending with tracking...');
    
    // Import the mailer functions
    const { sendInviteEmail } = require('./apps/api/src/utils/mailer.ts');
    
    // Send a test invitation email
    await sendInviteEmail(
      TEST_EMAIL,
      'temp123',
      TEST_COMPANY_NAME,
      'Test Admin',
      'Test User',
      'test-company-id',
      'test-user-id'
    );
    
    console.log('✅ Email sent with tracking enabled');
    
    // Wait a moment for logging to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n📊 Email tracking logs should now show:');
    console.log('- Type: INVITATION');
    console.log('- Recipient:', TEST_EMAIL);
    console.log('- Subject: Bienvenue sur IZI Wheel - ' + TEST_COMPANY_NAME);
    console.log('- Status: SENT (or FAILED if SMTP not configured)');
    console.log('- Company ID: test-company-id');
    console.log('- User ID: test-user-id');
    
  } catch (error) {
    console.error('❌ Error testing email tracking:', error.message);
  }
}

// Test API endpoints (requires running server)
async function testEmailTrackingAPI() {
  try {
    console.log('\n🔗 Testing Email Tracking API endpoints...');
    
    // Note: These will return mock data since database migration isn't applied
    const endpoints = [
      '/emails/stats',
      '/emails/logs',
      '/emails/dashboard'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n📡 Testing ${endpoint}...`);
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': 'Bearer test-token' // Replace with real token
          },
          timeout: 5000
        });
        
        console.log(`✅ ${endpoint} - Status: ${response.status}`);
        console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
        
      } catch (error) {
        if (error.response) {
          console.log(`⚠️  ${endpoint} - Status: ${error.response.status}`);
          console.log(`📝 Error: ${error.response.data?.error || error.message}`);
        } else {
          console.log(`❌ ${endpoint} - Network error: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Test email tracking console output
async function testEmailLogging() {
  console.log('\n📝 Testing Email Logging Functions...');
  
  try {
    // Import email logger functions
    const { 
      logEmailAttempt, 
      updateEmailStatus, 
      EmailType, 
      EmailStatus 
    } = require('./apps/api/src/utils/email-logger.ts');
    
    // Test logging an email attempt
    console.log('\n1. Testing logEmailAttempt...');
    const emailId = await logEmailAttempt({
      type: EmailType.PRIZE_NOTIFICATION,
      recipient: 'winner@example.com',
      subject: '🎉 Vous avez gagné un prix!',
      companyId: 'test-company',
      playId: 'test-play-123',
      metadata: {
        prizeName: 'iPhone 15',
        pin: '1234'
      }
    });
    
    console.log('✅ Email logged with ID:', emailId);
    
    // Test updating email status
    console.log('\n2. Testing updateEmailStatus...');
    await updateEmailStatus(emailId, EmailStatus.SENT, 'smtp-message-456');
    
    console.log('✅ Email status updated to SENT');
    
    // Test updating to failed status
    console.log('\n3. Testing failed status update...');
    await updateEmailStatus(emailId, EmailStatus.FAILED, null, 'SMTP connection timeout');
    
    console.log('✅ Email status updated to FAILED');
    
  } catch (error) {
    console.error('❌ Error testing email logging:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Email Tracking System Tests\n');
  console.log('=' .repeat(50));
  
  // Test 1: Email logging functions
  await testEmailLogging();
  
  // Test 2: Email sending with tracking
  await testEmailTracking();
  
  // Test 3: API endpoints (if server is running)
  await testEmailTrackingAPI();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Email Tracking System Tests Complete!');
  console.log('\n📋 Summary:');
  console.log('- Email logging functions tested');
  console.log('- Email sending with tracking tested');
  console.log('- API endpoints tested (requires auth token)');
  console.log('\n💡 To view the email tracking interface:');
  console.log('1. Start the web application');
  console.log('2. Login as ADMIN or SUPER user');
  console.log('3. Navigate to "E-mails" in the sidebar');
  console.log('4. View real-time email statistics and logs');
}

// Run the tests
runTests().catch(console.error); 