// Script to bypass roles and directly update a wheel in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// The specific wheel ID we want to update
const wheelId = process.argv[2];

// Example JSON string for wheel data - you can modify this
const wheelDataArg = process.argv[3] || '{}';

async function updateWheelDirectly() {
  try {
    console.log('Starting direct wheel update bypass script...');
    
    if (!wheelId) {
      console.error('ERROR: No wheel ID provided!');
      console.log('Usage: node bypass-wheel-update.js WHEEL_ID [JSON_DATA]');
      console.log('Example: node bypass-wheel-update.js 022578a3-1477-4a98-972b-f7a3b3395934 \'{"name": "New Wheel Name"}\'');
      return;
    }
    
    console.log(`Looking for wheel with ID: ${wheelId}`);
    
    // Find existing wheel
    const existingWheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
    });
    
    if (!existingWheel) {
      console.error(`ERROR: Wheel not found with ID: ${wheelId}`);
      return;
    }
    
    console.log('Found existing wheel:', existingWheel.name);
    
    // Parse the wheel data
    let wheelData;
    try {
      wheelData = JSON.parse(wheelDataArg);
      console.log('Update data:', wheelData);
    } catch (e) {
      console.log('No valid JSON data provided, using default values');
      wheelData = {};
    }
    
    // Update the wheel directly in the database
    const updatedWheel = await prisma.wheel.update({
      where: { id: wheelId },
      data: {
        name: wheelData.name || existingWheel.name,
        formSchema: wheelData.formSchema !== undefined ? wheelData.formSchema : existingWheel.formSchema,
        mode: wheelData.mode || existingWheel.mode,
        isActive: wheelData.isActive !== undefined ? wheelData.isActive : existingWheel.isActive,
        socialNetwork: wheelData.socialNetwork || existingWheel.socialNetwork,
        redirectUrl: wheelData.redirectUrl !== undefined ? wheelData.redirectUrl : existingWheel.redirectUrl,
        redirectText: wheelData.redirectText !== undefined ? wheelData.redirectText : existingWheel.redirectText,
        playLimit: wheelData.playLimit || existingWheel.playLimit,
      },
    });
    
    console.log('✅ Wheel successfully updated!');
    console.log('Updated wheel details:');
    console.log('- Name:', updatedWheel.name);
    console.log('- Mode:', updatedWheel.mode);
    console.log('- Social Network:', updatedWheel.socialNetwork || 'None');
    console.log('- Active:', updatedWheel.isActive);
    
  } catch (error) {
    console.error('❌ Error updating wheel:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updateWheelDirectly(); 