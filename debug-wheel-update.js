const axios = require('axios');

// Configuration
const API_URL = 'https://api.izikado.fr';
const TEST_EMAIL = 'admin@demo.com';
const TEST_PASSWORD = 'admin123';
const WHEEL_ID = 'f2733341-e54b-40ed-b45f-089c9ddb1490';

let authToken = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
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

async function getUserInfo() {
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data.user;
  } catch (error) {
    console.error('❌ Failed to get user info:', error.response?.data || error.message);
    return null;
  }
}

async function getCurrentWheelData(companyId) {
  try {
    console.log('\n📊 Getting current wheel data...');
    const response = await axios.get(`${API_URL}/companies/${companyId}/wheels/${WHEEL_ID}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const wheel = response.data.wheel;
    console.log('Current wheel data:');
    console.log(`  - Name: ${wheel.name}`);
    console.log(`  - Mode: ${wheel.mode}`);
    console.log(`  - Active: ${wheel.isActive}`);
    console.log(`  - Banner Image: ${wheel.bannerImage || 'Not set'}`);
    console.log(`  - Background Image: ${wheel.backgroundImage || 'Not set'}`);
    console.log(`  - Main Title: ${wheel.mainTitle || 'Not set'}`);
    
    return wheel;
  } catch (error) {
    console.error('❌ Failed to get wheel data:', error.response?.data || error.message);
    return null;
  }
}

async function updateWheelWithImages(companyId, currentWheel) {
  try {
    console.log('\n🖼️  Updating wheel with test images...');
    
    const updatePayload = {
      name: currentWheel.name,
      mode: currentWheel.mode,
      isActive: currentWheel.isActive,
      formSchema: currentWheel.formSchema || {},
      bannerImage: 'https://res.cloudinary.com/dfklylmho/image/upload/v1750332808/iziwheel/wheels/banners/wheel-banner-1750332807966.png',
      backgroundImage: 'https://res.cloudinary.com/dfklylmho/image/upload/v1750332815/iziwheel/wheels/backgrounds/wheel-background-1750332814969.png',
      mainTitle: 'Test Wheel with Images'
    };
    
    console.log('Sending update payload:');
    console.log(JSON.stringify(updatePayload, null, 2));
    
    const response = await axios.put(`${API_URL}/companies/${companyId}/wheels/${WHEEL_ID}`, updatePayload, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Update successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.wheel;
  } catch (error) {
    console.error('❌ Update failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function verifyUpdate() {
  try {
    console.log('\n🔍 Verifying update via public API...');
    const response = await axios.get(`${API_URL}/public/company/${WHEEL_ID}`);
    const wheel = response.data.wheel;
    
    console.log('Public API verification:');
    console.log(`  - Name: ${wheel.name}`);
    console.log(`  - Banner Image: ${wheel.bannerImage || 'Not set'}`);
    console.log(`  - Background Image: ${wheel.backgroundImage || 'Not set'}`);
    console.log(`  - Main Title: ${wheel.mainTitle || 'Not set'}`);
    
    if (wheel.bannerImage && wheel.backgroundImage) {
      console.log('\n✅ SUCCESS! Images are now saved and accessible!');
      console.log(`🎮 Test the wheel at: https://roue.izikado.fr/play/company/${WHEEL_ID}`);
    } else {
      console.log('\n❌ Images still not saved properly');
    }
    
    return wheel;
  } catch (error) {
    console.error('❌ Verification failed:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🔧 Debug Wheel Update with Images');
  console.log('==================================');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    process.exit(1);
  }
  
  const user = await getUserInfo();
  if (!user || !user.companyId) {
    console.error('❌ User has no company ID');
    process.exit(1);
  }
  
  console.log(`👤 User: ${user.name} (${user.email})`);
  console.log(`🏢 Company ID: ${user.companyId}`);
  
  const currentWheel = await getCurrentWheelData(user.companyId);
  if (!currentWheel) {
    process.exit(1);
  }
  
  const updatedWheel = await updateWheelWithImages(user.companyId, currentWheel);
  if (!updatedWheel) {
    process.exit(1);
  }
  
  await verifyUpdate();
}

main().catch(console.error); 