const axios = require('axios');

// Configuration
const API_URL = 'https://api.izikado.fr';
const TEST_EMAIL = 'admin@demo.com';
const TEST_PASSWORD = 'admin123';

let authToken = '';

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

async function testWheelImages() {
  try {
    console.log('\n🎡 Testing wheel images...');
    
    // Get user info to find company ID
    const userResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const user = userResponse.data.user;
    console.log(`User: ${user.name} (${user.email}), Company ID: ${user.companyId}`);
    
    if (!user.companyId) {
      console.log('No company ID found for user');
      return;
    }
    
    // Get wheels for this company
    const wheelsResponse = await axios.get(`${API_URL}/companies/${user.companyId}/wheels`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const wheels = wheelsResponse.data.wheels || [];
    console.log(`Found ${wheels.length} wheels`);
    
    if (wheels.length === 0) {
      console.log('No wheels found to test');
      return;
    }
    
    // Check the first wheel for images
    const wheel = wheels[0];
    console.log(`\n📊 Checking wheel: ${wheel.name} (ID: ${wheel.id})`);
    console.log(`  - Banner Image: ${wheel.bannerImage || 'Not set'}`);
    console.log(`  - Background Image: ${wheel.backgroundImage || 'Not set'}`);
    console.log(`  - Main Title: ${wheel.mainTitle || 'Not set'}`);
    
    // Test public API endpoint
    console.log('\n🌐 Testing public API endpoint...');
    const publicResponse = await axios.get(`${API_URL}/public/company/${wheel.id}`);
    const publicWheel = publicResponse.data.wheel;
    
    console.log(`Public API response for wheel ${wheel.id}:`);
    console.log(`  - Banner Image: ${publicWheel.bannerImage || 'Not set'}`);
    console.log(`  - Background Image: ${publicWheel.backgroundImage || 'Not set'}`);
    console.log(`  - Main Title: ${publicWheel.mainTitle || 'Not set'}`);
    
    // Test with a wheel that has images
    if (wheel.bannerImage || wheel.backgroundImage) {
      console.log('\n✅ Found wheel with images - testing image URLs...');
      
      if (wheel.bannerImage) {
        try {
          const imageResponse = await axios.head(wheel.bannerImage);
          console.log(`  ✅ Banner image accessible (${imageResponse.status}): ${wheel.bannerImage}`);
        } catch (error) {
          console.log(`  ❌ Banner image not accessible: ${wheel.bannerImage}`);
          console.log(`     Error: ${error.message}`);
        }
      }
      
      if (wheel.backgroundImage) {
        try {
          const imageResponse = await axios.head(wheel.backgroundImage);
          console.log(`  ✅ Background image accessible (${imageResponse.status}): ${wheel.backgroundImage}`);
        } catch (error) {
          console.log(`  ❌ Background image not accessible: ${wheel.backgroundImage}`);
          console.log(`     Error: ${error.message}`);
        }
      }
    } else {
      console.log('\n⚠️  No images found on this wheel. Try adding banner/background images in the wheel editor first.');
    }
    
    return { user, wheel };
    
  } catch (error) {
    console.error('❌ Error testing wheel images:', error.response?.data || error.message);
    return null;
  }
}

async function updateWheelWithTestImages() {
  try {
    console.log('\n🖼️  Adding test images to a wheel...');
    
    // Get user info and wheel
    const testResult = await testWheelImages();
    if (!testResult) {
      console.log('Could not get wheel data for testing');
      return;
    }
    
    const { user, wheel } = testResult;
    console.log(`Updating wheel: ${wheel.name} (ID: ${wheel.id})`);
    
    // Test image URLs
    const testBannerImage = 'https://via.placeholder.com/1200x300/6366f1/ffffff?text=Test+Banner';
    const testBackgroundImage = 'https://via.placeholder.com/1920x1080/a25afd/ffffff?text=Test+Background';
    const testMainTitle = 'Test Wheel with Images';
    
    const updatePayload = {
      name: wheel.name,
      mode: wheel.mode || 'RANDOM_WIN',
      isActive: wheel.isActive,
      companyId: wheel.companyId,
      slots: [], // Keep existing slots
      formSchema: wheel.formSchema || {},
      bannerImage: testBannerImage,
      backgroundImage: testBackgroundImage,
      mainTitle: testMainTitle
    };
    
    const updateResponse = await axios.put(`${API_URL}/companies/${user.companyId}/wheels/${wheel.id}`, updatePayload, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Wheel updated successfully');
    console.log(`  - Added banner image: ${testBannerImage}`);
    console.log(`  - Added background image: ${testBackgroundImage}`);
    console.log(`  - Added main title: ${testMainTitle}`);
    
    // Verify the update
    console.log('\n🔍 Verifying update...');
    const verifyResponse = await axios.get(`${API_URL}/public/company/${wheel.id}`);
    const updatedWheel = verifyResponse.data.wheel;
    
    console.log('Verification results:');
    console.log(`  - Banner Image: ${updatedWheel.bannerImage}`);
    console.log(`  - Background Image: ${updatedWheel.backgroundImage}`);
    console.log(`  - Main Title: ${updatedWheel.mainTitle}`);
    
    if (updatedWheel.bannerImage === testBannerImage && 
        updatedWheel.backgroundImage === testBackgroundImage &&
        updatedWheel.mainTitle === testMainTitle) {
      console.log('✅ All images and title saved correctly!');
      console.log(`\n🎮 Test the wheel at: https://izikado.fr/play/company/${wheel.id}`);
    } else {
      console.log('❌ Images or title not saved correctly');
    }
    
  } catch (error) {
    console.error('❌ Error updating wheel with test images:', error.response?.data || error.message);
  }
}

// Main execution
async function main() {
  console.log('🧪 Testing Wheel Images System');
  console.log('================================');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    process.exit(1);
  }
  
  await testWheelImages();
  
  console.log('\n❓ Would you like to add test images to a wheel? (This will modify your data)');
  console.log('   Uncomment the line below to enable:');
  console.log('   // await updateWheelWithTestImages();');
  
  // Uncomment the next line to actually add test images
  await updateWheelWithTestImages();
}

main().catch(console.error); 