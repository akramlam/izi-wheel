const axios = require('axios');

// Configuration
const API_URL = 'https://api.izikado.fr';
const WHEEL_ID = 'f2733341-e54b-40ed-b45f-089c9ddb1490';

// Your actual images from the screenshots
const BANNER_IMAGE = 'https://res.cloudinary.com/dfklylmho/image/upload/v1750332808/iziwheel/wheels/banners/wheel-banner-1750332807966.png';
const BACKGROUND_IMAGE = 'https://res.cloudinary.com/dfklylmho/image/upload/v1750332815/iziwheel/wheels/backgrounds/wheel-background-1750332814969.png';

async function testDirectWheelUpdate() {
  console.log('🎯 Direct Wheel Update Test');
  console.log('===========================');
  
  // First, get the current wheel data from public API
  try {
    console.log('📊 Getting current wheel data...');
    const publicResponse = await axios.get(`${API_URL}/public/company/${WHEEL_ID}`);
    const currentWheel = publicResponse.data.wheel;
    
    console.log(`Current wheel: ${currentWheel.name}`);
    console.log(`Banner: ${currentWheel.bannerImage || 'Not set'}`);
    console.log(`Background: ${currentWheel.backgroundImage || 'Not set'}`);
    
    // Now try to access the authenticated API using your credentials
    // You'll need to provide your actual login credentials here
    console.log('\\n🔐 Please provide your admin credentials:');
    console.log('Email: (you need to replace this in the script)');
    console.log('Password: (you need to replace this in the script)');
    
    // For now, let's just test if the images are accessible
    console.log('\\n🖼️  Testing image accessibility...');
    
    const bannerTest = await axios.head(BANNER_IMAGE);
    console.log(`✅ Banner image accessible: ${bannerTest.status === 200}`);
    
    const backgroundTest = await axios.head(BACKGROUND_IMAGE);
    console.log(`✅ Background image accessible: ${backgroundTest.status === 200}`);
    
    console.log('\\n📝 Update payload that should be sent:');
    const updatePayload = {
      name: currentWheel.name,
      mode: currentWheel.mode,
      isActive: currentWheel.isActive,
      formSchema: currentWheel.formSchema || {},
      bannerImage: BANNER_IMAGE,
      backgroundImage: BACKGROUND_IMAGE,
      mainTitle: currentWheel.mainTitle || 'IZI Wheel'
    };
    
    console.log(JSON.stringify(updatePayload, null, 2));
    
    console.log('\\n💡 Next steps:');
    console.log('1. Add your login credentials to this script');
    console.log('2. Run the script again to test the actual update');
    console.log('3. Or manually check the browser developer tools when saving');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDirectWheelUpdate(); 