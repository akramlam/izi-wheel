require('dotenv').config();

async function testSmtpComAPI() {
  console.log('🧪 Testing SMTP.com API integration...\n');

  // Check environment variables
  const apiKey = process.env.SMTP_COM_API_KEY;
  const useApi = process.env.USE_SMTP_COM_API === 'true';
  const emailFrom = process.env.EMAIL_FROM;
  
  console.log('📋 Configuration Check:');
  console.log(`   USE_SMTP_COM_API: ${useApi}`);
  console.log(`   SMTP_COM_API_KEY: ${apiKey ? '✅ Set (' + apiKey.substring(0, 8) + '...)' : '❌ Missing'}`);
  console.log(`   EMAIL_FROM: ${emailFrom || 'Not set'}`);
  console.log('');

  if (!apiKey || apiKey === 'your-api-key-from-dashboard') {
    console.log('❌ SMTP_COM_API_KEY not found or not updated in .env file');
    console.log('💡 Please:');
    console.log('   1. Login to https://my.smtp.com/login');
    console.log('   2. Go to API section and generate an API key');
    console.log('   3. Update .env file: SMTP_COM_API_KEY=your-actual-key');
    return;
  }

  // Test API connection
  try {
    console.log('🔗 Testing SMTP.com API connection...');
    
    const emailData = {
      channel: 'transactional',
      originator: {
        email: emailFrom || 'contact@izitouch.fr',
        name: process.env.EMAIL_FROM_NAME || 'IZI Wheel Test'
      },
      recipients: [
        {
          email: emailFrom || 'contact@izitouch.fr', // Send to yourself for testing
          name: 'Test Recipient'
        }
      ],
      subject: '🎯 SMTP.com API Test - IZI Wheel Integration',
      body: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5;">✅ SMTP.com API Test Successful!</h2>
            <p>This is a test email from your IZI Wheel application using SMTP.com API.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>Configuration Details:</h3>
              <ul>
                <li><strong>API Endpoint:</strong> https://api.smtp.com/v4/messages</li>
                <li><strong>Authentication:</strong> Bearer Token</li>
                <li><strong>Time:</strong> ${new Date().toISOString()}</li>
              </ul>
            </div>
            <p>Your SMTP.com integration is working correctly!</p>
          </div>
        `,
        text: 'SMTP.com API Test - Your integration is working correctly!'
      }
    };

    const response = await fetch('https://api.smtp.com/v4/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SMTP.com API Test Successful!');
      console.log('📬 Email Details:');
      console.log(`   Message ID: ${result.data?.message_id || 'N/A'}`);
      console.log(`   Status: ${result.status || 'success'}`);
      console.log(`   To: ${emailData.to[0].email}`);
      console.log(`   Subject: ${emailData.subject}`);
      console.log('');
      console.log('🎉 Your SMTP.com API integration is working perfectly!');
      console.log('💡 Your prize emails should now work correctly.');
    } else {
      const errorData = await response.text();
      console.log('❌ SMTP.com API Test Failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${errorData}`);
      
      // Common error solutions
      if (response.status === 401) {
        console.log('💡 Solution: Check your API key - it might be invalid or expired');
      } else if (response.status === 400) {
        console.log('💡 Solution: Check email format and required fields');
      }
    }

  } catch (error) {
    console.log('❌ Network Error:', error.message);
    console.log('💡 Check your internet connection and API endpoint');
  }
}

// Run the test
testSmtpComAPI().catch(console.error);