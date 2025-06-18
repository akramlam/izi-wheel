const axios = require('axios');

// Configuration
const API_URL = 'https://api.izikado.fr';
const TEST_EMAIL = 'super@izikado.fr';
const TEST_PASSWORD = 'super123';

let authToken = '';
let testCompanyId = '';
let testUserId = '';

// Test functions
async function login() {
  try {
    console.log('🔐 Logging in as super admin...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getCompanies() {
  try {
    console.log('🏢 Fetching companies...');
    const response = await axios.get(`${API_URL}/companies`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.companies.length > 0) {
      testCompanyId = response.data.companies[0].id;
      console.log(`✅ Found company: ${response.data.companies[0].name} (${testCompanyId})`);
      return true;
    } else {
      console.log('❌ No companies found');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to fetch companies:', error.response?.data || error.message);
    return false;
  }
}

async function createSubAdmin() {
  try {
    console.log('👤 Creating test sub-admin...');
    const testEmail = `test-sub-admin-${Date.now()}@example.com`;
    
    const response = await axios.post(`${API_URL}/companies/${testCompanyId}/users`, {
      name: 'Test Sub Admin',
      email: testEmail,
      role: 'SUB',
      isActive: true
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    testUserId = response.data.user.id;
    console.log(`✅ Sub-admin created successfully: ${testEmail} (${testUserId})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to create sub-admin:', error.response?.data || error.message);
    return false;
  }
}

async function updateSubAdmin() {
  try {
    console.log('✏️ Updating sub-admin...');
    await axios.put(`${API_URL}/companies/${testCompanyId}/users/${testUserId}`, {
      name: 'Updated Test Sub Admin',
      isActive: false
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Sub-admin updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update sub-admin:', error.response?.data || error.message);
    return false;
  }
}

async function resetPassword() {
  try {
    console.log('🔑 Resetting sub-admin password...');
    await axios.put(`${API_URL}/companies/${testCompanyId}/users/${testUserId}/reset-password`, {
      password: 'newpassword123'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Password reset successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to reset password:', error.response?.data || error.message);
    return false;
  }
}

async function deleteSubAdmin() {
  try {
    console.log('🗑️ Deleting sub-admin...');
    await axios.delete(`${API_URL}/companies/${testCompanyId}/users/${testUserId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Sub-admin deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete sub-admin:', error.response?.data || error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting Sub-Admin Operations Test\n');
  
  const tests = [
    { name: 'Login', fn: login },
    { name: 'Get Companies', fn: getCompanies },
    { name: 'Create Sub-Admin', fn: createSubAdmin },
    { name: 'Update Sub-Admin', fn: updateSubAdmin },
    { name: 'Reset Password', fn: resetPassword },
    { name: 'Delete Sub-Admin', fn: deleteSubAdmin }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const result = await test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
      console.log('❌ Test failed, stopping...');
      break;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All sub-admin operations are working correctly!');
  } else {
    console.log('\n⚠️ Some operations failed. Check the error messages above.');
  }
}

// Run the tests
runTests().catch(console.error); 