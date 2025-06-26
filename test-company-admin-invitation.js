const axios = require('axios');

async function testCompanyAdminInvitation() {
  console.log('🧪 Testing Company Admin Invitation Fix...\n');
  
  try {
    const API_BASE = 'http://localhost:3001'; // Local API
    
    // You'll need to replace these with actual values
    const testCompanyId = 'your-test-company-id'; // Replace with an actual company ID
    const authToken = 'your-auth-token'; // Replace with a valid super admin token
    
    console.log('📋 Test Configuration:');
    console.log(`   API Base: ${API_BASE}`);
    console.log(`   Company ID: ${testCompanyId}`);
    console.log(`   Auth Token: ${authToken ? '[SET]' : '[MISSING]'}`);
    console.log('');
    
    // Test data for company update with admin invitation
    const updateData = {
      name: 'Updated Test Company',
      plan: 'PREMIUM',
      maxWheels: 10,
      isActive: true,
      admins: [
        {
          name: 'New Admin User',
          email: 'newadmin@example.com',
          role: 'ADMIN'
        },
        {
          name: 'New Sub Admin',
          email: 'newsub@example.com', 
          role: 'SUB'
        }
      ]
    };
    
    console.log('📧 Sending company update with admin invitations...');
    console.log('   Data:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.patch(`${API_BASE}/companies/${testCompanyId}`, updateData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('📊 API Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      const { company, admins } = response.data;
      console.log('✅ Company update with admin invitations successful!');
      console.log(`📝 Company updated: ${company.name}`);
      console.log(`👥 Admins invited: ${admins ? admins.length : 0}`);
      
      if (admins && admins.length > 0) {
        console.log('\n📧 Invitation emails should have been sent to:');
        admins.forEach(admin => {
          console.log(`   - ${admin.email} (${admin.role})`);
        });
        console.log('\n📁 Check the ./emails/ folder for invitation email files');
      }
    } else {
      console.log('❌ Company update failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 To run this test properly:');
    console.log('1. Make sure your API server is running (npm run dev)');
    console.log('2. Update the testCompanyId and authToken in this script');
    console.log('3. Make sure the company exists in your database');
    console.log('4. Or test manually through the web interface');
  }
}

// Alternative manual test instructions
function printManualTestInstructions() {
  console.log('\n🔧 Manual Test Instructions:');
  console.log('1. Go to your web application dashboard');
  console.log('2. Navigate to "Entreprises" page');
  console.log('3. Click "Modifier" on any company');
  console.log('4. Add a new admin using the "Ajouter Admin" button');
  console.log('5. Fill in name, email, and role');
  console.log('6. Click "Mettre à jour"');
  console.log('7. Check the server logs for invitation email sending');
  console.log('8. Check the ./emails/ folder for the generated email file');
  console.log('9. Verify the success message mentions invited admins');
}

// Run the test
testCompanyAdminInvitation().then(() => {
  printManualTestInstructions();
}).catch(error => {
  console.error('Test setup error:', error.message);
  printManualTestInstructions();
}); 