const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_COMPANY_ID = 'test-company-id';
const TEST_WHEEL_ID = 'test-wheel-id';

async function testPlayLimit() {
  console.log('🧪 Testing Play Limit Functionality...\n');

  try {
    // First, let's test spinning once
    console.log('1️⃣ First spin attempt...');
    const firstSpin = await axios.post(
      `${BASE_URL}/public/companies/${TEST_COMPANY_ID}/wheels/${TEST_WHEEL_ID}/spin`,
      {
        lead: {
          name: 'Test User',
          email: 'test@example.com'
        }
      },
      {
        headers: {
          'X-Forwarded-For': '192.168.1.100' // Simulate IP address
        }
      }
    );
    
    console.log('✅ First spin successful:', firstSpin.data);
    console.log('   Result:', firstSpin.data.play.result);
    console.log('   Slot:', firstSpin.data.slot.label);

    // Second spin - should be blocked if wheel has ONCE_PER_DAY limit
    console.log('\n2️⃣ Second spin attempt (should be blocked)...');
    try {
      const secondSpin = await axios.post(
        `${BASE_URL}/public/companies/${TEST_COMPANY_ID}/wheels/${TEST_WHEEL_ID}/spin`,
        {
          lead: {
            name: 'Test User 2',
            email: 'test2@example.com'
          }
        },
        {
          headers: {
            'X-Forwarded-For': '192.168.1.100' // Same IP address
          }
        }
      );
      
      console.log('❌ Second spin should have been blocked but succeeded:', secondSpin.data);
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('✅ Second spin correctly blocked with 429 status');
        console.log('   Error message:', error.response.data.error);
        console.log('   Error code:', error.response.data.code);
        console.log('   Play limit:', error.response.data.playLimit);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Third spin from different IP - should work
    console.log('\n3️⃣ Third spin from different IP (should work)...');
    try {
      const thirdSpin = await axios.post(
        `${BASE_URL}/public/companies/${TEST_COMPANY_ID}/wheels/${TEST_WHEEL_ID}/spin`,
        {
          lead: {
            name: 'Test User 3',
            email: 'test3@example.com'
          }
        },
        {
          headers: {
            'X-Forwarded-For': '192.168.1.200' // Different IP address
          }
        }
      );
      
      console.log('✅ Third spin from different IP successful:', thirdSpin.data.play.result);
    } catch (error) {
      console.log('❌ Unexpected error from different IP:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testPlayLimit().then(() => {
  console.log('\n🏁 Play limit test completed');
  process.exit(0);
}).catch(console.error); 