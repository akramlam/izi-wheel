require('dotenv').config();
const fetch = require('node-fetch');

console.log('🧪 Testing Invitation API Endpoint...\n');

async function testInviteAPI() {
  try {
    // You'll need to replace these with actual values from your app
    const API_BASE = 'https://api.izikado.fr'; // Your API port
    const companyId = 'your-company-id'; // Replace with actual company ID
    const authToken = 'your-auth-token'; // Replace with actual auth token
    
    console.log('📋 Test Configuration:');
    console.log(`   API Base: ${API_BASE}`);
    console.log(`   Company ID: ${companyId}`);
    console.log(`   Auth Token: ${authToken ? '[SET]' : '[MISSING]'}`);
    console.log('');
    
    // Test data for invitation
    const inviteData = {
      name: 'Test Sub Admin',
      email: 'testsubadmin@example.com',
      role: 'SUB',
      isActive: true
    };
    
    console.log('📧 Sending invitation request...');
    console.log('   Data:', JSON.stringify(inviteData, null, 2));
    
    const response = await fetch(`${API_BASE}/companies/${companyId}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(inviteData)
    });
    
    const result = await response.json();
    
    console.log('📊 API Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Invitation API call successful!');
      console.log('📁 Check the ./emails/ folder for the invitation email file');
    } else {
      console.log('❌ Invitation API call failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 To run this test properly:');
    console.log('1. Make sure your API server is running (npm run dev)');
    console.log('2. Update the companyId and authToken in this script');
    console.log('3. Or use the manual test instead');
  }
}

console.log('⚠️  This test requires actual company ID and auth token.');
console.log('💡 Alternative: Try adding a sub admin through your web interface');
console.log('   and check if emails appear in the ./emails/ folder\n');

// Uncomment the line below and fill in the actual values to run the test
// testInviteAPI(); 