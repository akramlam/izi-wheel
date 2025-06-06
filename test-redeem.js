const axios = require('axios');

async function testRedeemEndpoint() {
  try {
    console.log('Testing redeem endpoint...');
    
    // Test the exact endpoint that's failing
    const playId = 'a6b9db0b-094a-40d5-b20a-680af05a04f7';
    const url = `http://127.0.0.1:3001/public/plays/${playId}/redeem`;
    
    console.log(`Testing URL: ${url}`);
    
    const response = await axios.post(url, {
      pin: '123456'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        // Accept any status code to see what we get
        return true;
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('Error testing endpoint:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

// Also test if we can reach other endpoints
async function testOtherEndpoints() {
  try {
    console.log('\nTesting other endpoints...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://127.0.0.1:3001/health');
    console.log('Health endpoint status:', healthResponse.status);
    
    // Test debug endpoint  
    const debugResponse = await axios.get('http://127.0.0.1:3001/public/debug/plays/a6b9db0b-094a-40d5-b20a-680af05a04f7');
    console.log('Debug endpoint status:', debugResponse.status);
    console.log('Debug response:', debugResponse.data);
    
  } catch (error) {
    console.error('Error testing other endpoints:', error.message);
  }
}

// Run tests
async function runTests() {
  await testOtherEndpoints();
  await testRedeemEndpoint();
}

runTests().catch(console.error); 