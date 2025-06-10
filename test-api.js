const fs = require('fs');

// Read config from .env file
const envContent = fs.readFileSync('./apps/api/.env', 'utf8');
const lines = envContent.split('\n');
const config = {};
lines.forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    config[key.trim()] = valueParts.join('=').trim();
  }
});

console.log('📋 Current SMTP Configuration:');
console.log('   USE_SMTP_COM_API:', config.USE_SMTP_COM_API);
console.log('   SMTP_COM_API_KEY:', config.SMTP_COM_API_KEY ? '✅ Set' : '❌ Missing');
console.log('   EMAIL_FROM:', config.EMAIL_FROM);

async function testAPI() {
  if (config.USE_SMTP_COM_API === 'true' && config.SMTP_COM_API_KEY) {
    console.log('\n🧪 Testing SMTP.com API...');
    
    try {
      const response = await fetch('https://api.smtp.com/v4/messages', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + config.SMTP_COM_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: { email: config.EMAIL_FROM, name: 'IZI Wheel Test' },
          to: [{ email: 'test@example.com', name: 'Test User' }],
          subject: '🎯 SMTP.com API Test',
          html: '<h1>Test Email</h1><p>Your SMTP.com API is working!</p>'
        })
      });
      
      console.log('📡 Response Status:', response.status);
      const data = await response.text();
      console.log('📧 Response:', data);
      
      if (response.ok && (data.includes('success') || data.includes('message_id'))) {
        console.log('✅ SMTP.com API is working correctly!');
      } else {
        console.log('❌ API test failed - check your API key');
      }
    } catch (error) {
      console.error('❌ API Error:', error.message);
    }
  } else {
    console.log('❌ SMTP.com API not configured properly');
  }
}

testAPI(); 