const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testEmailLogging() {
  console.log('🧪 Testing Email Database Logging...\n');

  try {
    // First, let's send a test email to generate a log entry
    console.log('📧 Sending test prize email...');
    
    const testEmailResponse = await axios.post('http://localhost:3001/public/test-email', {
      email: 'test-winner@example.com',
      name: 'Test Winner'
    });
    
    console.log('✅ Test email sent:', testEmailResponse.data);
    
    // Wait a moment for the logging to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now check if the email was logged in the database
    console.log('\n📊 Checking email statistics...');
    
    try {
      // Note: This will require authentication in production
      const statsResponse = await axios.get(`${API_BASE_URL}/emails/stats`, {
        headers: {
          'Authorization': 'Bearer test-token' // Replace with actual token
        }
      });
      
      console.log('📈 Email Statistics:', JSON.stringify(statsResponse.data, null, 2));
      
      if (statsResponse.data.data.total > 0) {
        console.log('✅ SUCCESS: Emails are being logged to the database!');
      } else {
        console.log('⚠️  No emails found in database - check if logging is working');
      }
      
    } catch (authError) {
      console.log('🔐 Authentication required for stats endpoint');
      console.log('   Error:', authError.response?.data?.error || authError.message);
    }
    
    // Test the dashboard endpoint
    console.log('\n📊 Checking email dashboard...');
    
    try {
      const dashboardResponse = await axios.get(`${API_BASE_URL}/emails/dashboard`, {
        headers: {
          'Authorization': 'Bearer test-token' // Replace with actual token
        }
      });
      
      console.log('📊 Dashboard Data:', JSON.stringify(dashboardResponse.data, null, 2));
      
    } catch (authError) {
      console.log('🔐 Authentication required for dashboard endpoint');
      console.log('   Error:', authError.response?.data?.error || authError.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing email logging:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

async function testDirectDatabaseQuery() {
  console.log('\n🔍 Testing Direct Database Query...');
  
  try {
    // Import Prisma client directly to check database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Check if EmailLog table exists and has data
    const emailCount = await prisma.emailLog.count();
    console.log(`📊 Total emails in database: ${emailCount}`);
    
    if (emailCount > 0) {
      const recentEmails = await prisma.emailLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          recipient: true,
          subject: true,
          status: true,
          createdAt: true
        }
      });
      
      console.log('📧 Recent emails:');
      recentEmails.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.type} to ${email.recipient} - ${email.status}`);
        console.log(`      Subject: ${email.subject}`);
        console.log(`      Created: ${email.createdAt}`);
        console.log('');
      });
    }
    
    await prisma.$disconnect();
    
  } catch (dbError) {
    console.error('❌ Database query error:', dbError.message);
  }
}

// Run the tests
async function runTests() {
  await testEmailLogging();
  await testDirectDatabaseQuery();
  
  console.log('\n🎯 Summary:');
  console.log('1. Email logging should now be working with the real database');
  console.log('2. Check the email tracking dashboard in the admin interface');
  console.log('3. Send a few more emails (invitations, prizes) to see them appear');
  console.log('4. The dashboard should show real statistics instead of zeros');
}

runTests().catch(console.error); 