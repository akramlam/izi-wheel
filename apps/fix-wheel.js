// Script to fix wheel configuration issues
require('../prisma-local.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWheels() {
  try {
    console.log('Starting wheel configuration fix...');
    
    // Get all wheels
    const wheels = await prisma.wheel.findMany({
      include: { slots: true }
    });
    
    console.log(`Found ${wheels.length} wheels to check`);
    
    for (const wheel of wheels) {
      console.log(`\nChecking wheel: ${wheel.name} (${wheel.id})`);
      console.log(`Found ${wheel.slots.length} slots`);
      
      if (wheel.slots.length === 0) {
        console.log('No slots found, skipping wheel');
        continue;
      }
      
      // Update slots with proper positions and make at least one winning
      let hasWinningSlot = wheel.slots.some(slot => slot.isWinning);
      
      for (let i = 0; i < wheel.slots.length; i++) {
        const slot = wheel.slots[i];
        const updates = {
          position: i,
        };
        
        // Make first slot winning if no winning slots exist
        if (!hasWinningSlot && i === 0) {
          updates.isWinning = true;
          hasWinningSlot = true;
        }
        
        await prisma.slot.update({
          where: { id: slot.id },
          data: updates
        });
        
        console.log(`Updated slot ${i+1}/${wheel.slots.length}: position=${i}, isWinning=${i === 0 && !hasWinningSlot}`);
      }
      
      console.log(`Successfully updated wheel: ${wheel.name}`);
    }
    
    console.log('\nWheel configuration fix completed successfully!');
  } catch (error) {
    console.error('Error fixing wheels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixWheels(); 