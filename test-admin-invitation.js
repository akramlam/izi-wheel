require('dotenv').config();
const { sendInviteEmail } = require('./apps/api/src/utils/mailer');

async function testAdminInvitation() {
  console.log('🧪 Testing Admin Invitation Email System...\n');
  
  try {
    // Test sending an invitation email
    await sendInviteEmail(
      'newadmin@example.com',        // email
      'TempPass123!',                // temporary password
      'Test Company',                // company name
      'Super Admin',                 // admin name who invited
      'New Admin User'               // new user name
    );
    
    console.log('✅ Admin invitation email test completed successfully!');
    console.log('📧 Email sent to: newadmin@example.com');
    console.log('🔑 Temporary password: TempPass123!');
    console.log('🏢 Company: Test Company');
    console.log('👤 Invited by: Super Admin');
    console.log('📝 New user name: New Admin User');
    
  } catch (error) {
    console.error('❌ Admin invitation email test failed:', error.message);
    console.error('   Error details:', error);
  }
}

// Run the test
testAdminInvitation(); 