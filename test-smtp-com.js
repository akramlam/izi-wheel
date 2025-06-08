require('dotenv').config();

async function testSmtpComAPI() {
  console.log('🧪 Testing SMTP.com API integration...\n');

  // Check environment variables
  const apiKey = process.env.SMTP_COM_API_KEY;
  const useApi = process.env.USE_SMTP_COM_API === 'true';
  
  console.log('📋 Configuration Check:');
  console.log(`   USE_SMTP_COM_API: ${useApi}`);
  console.log(`   SMTP_COM_API_KEY: ${apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || 'Not set'}`);
  console.log('');

  if (!apiKey) {
    console.log('❌ SMTP_COM_API_KEY not found in environment variables');
    console.log('💡 Please add your SMTP.com API key to .env file:');
    console.log('   SMTP_COM_API_KEY=your-api-key-here');
    console.log('   USE_SMTP_COM_API=true');
    return;
  }

  // Test API connection
  try {
    console.log('🔗 Testing SMTP.com API connection...');
    
    const emailData = {
      from: {
        email: process.env.EMAIL_FROM || 'test@example.com',
        name: process.env.EMAIL_FROM_NAME || 'IZI Wheel Test'
      },
      to: [
        {
          email: 'test@example.com',
          name: 'Test User'
        }
      ],
      subject: '🎯 SMTP.com API Test - IZI Wheel Integration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">✅ SMTP.com API Test Successful!</h2>
          <p>This is a test email from your IZI Wheel application using SMTP.com API.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>API Endpoint:</strong> https://api.smtp.com/v4/messages</li>
              <li><strong>Authentication:</strong> Bearer Token</li>
              <li><strong>Format:</strong> JSON (JSend specification)</li>
              <li><strong>Time:</strong> ${new Date().toISOString()}</li>
            </ul>
          </div>
          <p>Your SMTP.com integration is working correctly!</p>
        </div>
      `,
      text: 'SMTP.com API Test - Your integration is working correctly!'
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
      console.log('🎉 Your SMTP.com integration is working perfectly!');
      console.log('💡 You can now use SMTP.com API for your wheel prize emails.');
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