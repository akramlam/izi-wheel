// Script to fix wheel configuration
require('../prisma-local.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// The wheel ID to fix
const WHEEL_ID = 'd96a7fea-df77-47e6-8f37-b2936090e9d8';

async function fixWheel() {
  try {
    console.log(`Fixing wheel ${WHEEL_ID}...`);
    
    // 1. Get the wheel with slots
    const wheel = await prisma.wheel.findUnique({
      where: { id: WHEEL_ID },
      include: { slots: true }
    });
    
    if (!wheel) {
      console.error('Wheel not found!');
      return;
    }
    
    console.log(`Found wheel "${wheel.name}" with ${wheel.slots.length} slots`);
    
    // 2. Update each slot with proper position, weight, and winning status
    // Make the first slot a winning slot
    const totalSlots = wheel.slots.length;
    
    for (let i = 0; i < totalSlots; i++) {
      const slot = wheel.slots[i];
      const isFirst = i === 0;
      
      console.log(`Updating slot ${i+1}/${totalSlots}: ${slot.label}`);
      
      await prisma.slot.update({
        where: { id: slot.id },
        data: {
          position: i,
          isWinning: isFirst, // Make the first slot winning
          weight: Math.floor(100 / totalSlots) // Distribute weight evenly
        }
      });
    }
    
    console.log('\nWheel fixed successfully!');
    console.log('Please refresh your browser to see the updated wheel.');
    
  } catch (error) {
    console.error('Error fixing wheel:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixWheel(); 