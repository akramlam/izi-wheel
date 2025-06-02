// Script to fix a specific wheel
require('../prisma-local.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// The ID of the wheel to fix - update this with your wheel ID
const WHEEL_ID = 'd96a7fea-df77-47e6-8f37-b2936090e9d8';

async function fixSpecificWheel() {
  try {
    console.log(`Starting to fix wheel ${WHEEL_ID}...`);
    
    // Find the wheel
    const wheel = await prisma.wheel.findUnique({
      where: { id: WHEEL_ID },
      include: { slots: true }
    });
    
    if (!wheel) {
      console.error(`Error: Wheel with ID ${WHEEL_ID} not found!`);
      return;
    }
    
    console.log(`Found wheel: "${wheel.name}" with ${wheel.slots.length} slots`);
    
    // If wheel has no slots, create default slots
    if (wheel.slots.length === 0) {
      console.log('Wheel has no slots. Creating default slots...');
      
      // Create 3 default slots with proper distribution
      const defaultSlots = [
        { 
          wheelId: WHEEL_ID,
          label: 'Prix 1', 
          prizeCode: 'PRIZE1',
          color: '#FF6384',
          weight: 34,
          isWinning: true,
          position: 0,
          isActive: true
        },
        { 
          wheelId: WHEEL_ID,
          label: 'Prix 2', 
          prizeCode: 'PRIZE2',
          color: '#36A2EB',
          weight: 33,
          isWinning: false,
          position: 1,
          isActive: true
        },
        { 
          wheelId: WHEEL_ID,
          label: 'Prix 3', 
          prizeCode: 'PRIZE3',
          color: '#FFCE56',
          weight: 33,
          isWinning: false,
          position: 2,
          isActive: true
        }
      ];
      
      // Create slots in database
      for (const slot of defaultSlots) {
        await prisma.slot.create({ data: slot });
        console.log(`Created slot: ${slot.label}`);
      }
      
      console.log('Default slots created successfully!');
    } else {
      console.log('Fixing existing slots...');
      
      // Ensure slots have proper positions and at least one is winning
      let hasWinningSlot = wheel.slots.some(slot => slot.isWinning);
      
      for (let i = 0; i < wheel.slots.length; i++) {
        const slot = wheel.slots[i];
        
        // Updates to apply
        const updates = {
          position: i,
          isActive: true
        };
        
        // Make first slot winning if none are winning
        if (!hasWinningSlot && i === 0) {
          updates.isWinning = true;
          hasWinningSlot = true;
        }
        
        // Update the slot
        await prisma.slot.update({
          where: { id: slot.id },
          data: updates
        });
        
        console.log(`Updated slot ${i+1}/${wheel.slots.length}: ${slot.label}`);
      }
    }
    
    // Verify the wheel
    const updatedWheel = await prisma.wheel.findUnique({
      where: { id: WHEEL_ID },
      include: { slots: true }
    });
    
    console.log(`\nVerification: Wheel now has ${updatedWheel.slots.length} slots`);
    console.log('Slots:');
    updatedWheel.slots.forEach((slot, i) => {
      console.log(`  ${i+1}. ${slot.label} - Position: ${slot.position}, isWinning: ${slot.isWinning}`);
    });
    
    console.log('\nWheel fixed successfully!');
    console.log('Please refresh your browser to see the fixed wheel.');
    
  } catch (error) {
    console.error('Error fixing wheel:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixSpecificWheel(); 