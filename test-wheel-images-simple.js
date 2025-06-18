const axios = require('axios');

// Configuration
const API_URL = 'https://api.izikado.fr';

async function testPublicWheelImages() {
  try {
    console.log('🧪 Testing Public Wheel Images...\n');
    
    // Test a few different wheel IDs to see if any have images
    const testWheelIds = [
      'cm5mewqpu0002hxgqo4iaf0es', // Example wheel ID
      'cm5mewqpu0003hxgqo4iaf0et', // Another example
      'cm5mewqpu0004hxgqo4iaf0eu'  // Another example
    ];
    
    for (const wheelId of testWheelIds) {
      try {
        console.log(`🎡 Testing wheel ID: ${wheelId}`);
        
        const response = await axios.get(`${API_URL}/public/company/${wheelId}`);
        const wheel = response.data.wheel;
        
        console.log(`  ✅ Wheel found: ${wheel.name}`);
        console.log(`  📋 Main Title: ${wheel.mainTitle || 'Not set'}`);
        console.log(`  🖼️  Banner Image: ${wheel.bannerImage || 'Not set'}`);
        console.log(`  🎨 Background Image: ${wheel.backgroundImage || 'Not set'}`);
        
        // Test if images are accessible
        if (wheel.bannerImage) {
          try {
            await axios.head(wheel.bannerImage);
            console.log(`  ✅ Banner image is accessible`);
          } catch (error) {
            console.log(`  ❌ Banner image is not accessible: ${error.message}`);
          }
        }
        
        if (wheel.backgroundImage) {
          try {
            await axios.head(wheel.backgroundImage);
            console.log(`  ✅ Background image is accessible`);
          } catch (error) {
            console.log(`  ❌ Background image is not accessible: ${error.message}`);
          }
        }
        
        console.log(`  🎮 Play URL: https://izikado.fr/play/company/${wheelId}\n`);
        
        // If we found a wheel with images, we can stop testing
        if (wheel.bannerImage || wheel.backgroundImage) {
          console.log('✅ Found a wheel with images configured!');
          return wheel;
        }
        
      } catch (error) {
        console.log(`  ❌ Wheel ${wheelId} not found or error: ${error.response?.status || error.message}`);
      }
    }
    
    console.log('⚠️  No wheels found with images configured.');
    console.log('\n💡 To test images:');
    console.log('1. Go to your wheel editor in the admin panel');
    console.log('2. Navigate to the "Personnalisation" tab');
    console.log('3. Add banner and/or background images');
    console.log('4. Save the wheel');
    console.log('5. Test the wheel by visiting the play URL');
    
  } catch (error) {
    console.error('❌ Error testing wheel images:', error.message);
  }
}

// Test with a specific wheel ID if provided as command line argument
async function testSpecificWheel(wheelId) {
  try {
    console.log(`🎯 Testing specific wheel: ${wheelId}\n`);
    
    const response = await axios.get(`${API_URL}/public/company/${wheelId}`);
    const wheel = response.data.wheel;
    
    console.log(`✅ Wheel: ${wheel.name}`);
    console.log(`📋 Main Title: ${wheel.mainTitle || 'Default: IZI Wheel'}`);
    console.log(`🖼️  Banner Image: ${wheel.bannerImage || 'Not configured'}`);
    console.log(`🎨 Background Image: ${wheel.backgroundImage || 'Not configured'}`);
    
    if (wheel.bannerImage || wheel.backgroundImage) {
      console.log('\n🎉 This wheel has custom images configured!');
      console.log(`🎮 Test it at: https://izikado.fr/play/company/${wheelId}`);
      
      if (wheel.bannerImage) {
        console.log(`\n🖼️  Banner Image URL: ${wheel.bannerImage}`);
      }
      if (wheel.backgroundImage) {
        console.log(`🎨 Background Image URL: ${wheel.backgroundImage}`);
      }
    } else {
      console.log('\n⚠️  This wheel has no custom images configured.');
      console.log('Add images in the wheel editor under "Personnalisation" tab.');
    }
    
  } catch (error) {
    console.error(`❌ Error testing wheel ${wheelId}:`, error.response?.data || error.message);
  }
}

// Main execution
async function main() {
  const wheelId = process.argv[2];
  
  if (wheelId) {
    await testSpecificWheel(wheelId);
  } else {
    await testPublicWheelImages();
    console.log('\n💡 You can also test a specific wheel by running:');
    console.log('   node test-wheel-images-simple.js YOUR_WHEEL_ID');
  }
}

main().catch(console.error); 