// Script to fix the specific wheel from the screenshot
require('./prisma-local.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSpecificWheel(wheelId) {
  if (!wheelId) {
    console.error('Please provide a wheel ID as a command line argument');
    process.exit(1);
  }

  try {
    console.log(`Fixing wheel with ID: ${wheelId}`);
    
    // Get the wheel with its slots
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      include: {
        slots: {
          where: { isActive: true },
        },
      },
    });

    if (!wheel) {
      console.error(`Wheel with ID ${wheelId} not found`);
      process.exit(1);
    }

    console.log(`Found wheel: ${wheel.name}`);
    
    if (!wheel.slots || wheel.slots.length === 0) {
      console.log('No slots found for this wheel');
      
      // Create default slots if none exist
      console.log('Creating default slots...');
      
      const defaultSlots = [
        { label: 'Prize 1', weight: 34, isWinning: true, color: '#FF6384', position: 0 },
        { label: 'Prize 2', weight: 33, isWinning: false, color: '#36A2EB', position: 1 },
        { label: 'Prize 3', weight: 33, isWinning: false, color: '#FFCE56', position: 2 }
      ];
      
      for (const [index, slotData] of defaultSlots.entries()) {
        await prisma.slot.create({
          data: {
            ...slotData,
            wheelId: wheel.id,
            prizeCode: `PRIZE${index + 1}`
          }
        });
        console.log(`Created default slot ${index + 1}: ${slotData.label} (${slotData.weight}%)`);
      }
      
      console.log('Default slots created successfully');
      return;
    }

    // Calculate current total weight
    const totalWeight = wheel.slots.reduce((sum, slot) => sum + slot.weight, 0);
    console.log(`Current total weight: ${totalWeight}%`);

    // If the total weight is not 100, adjust it
    if (totalWeight !== 100) {
      console.log(`Need to adjust weights. Current total: ${totalWeight}%`);
      
      // Option 1: Normalize proportionally
      const normalizedSlots = wheel.slots.map(slot => {
        // Calculate normalized weight (proportional distribution)
        const normalizedWeight = Math.round((slot.weight / totalWeight) * 100);
        return {
          ...slot,
          normalizedWeight,
        };
      });
      
      // Due to rounding, we might not get exactly 100, adjust the first slot to compensate
      const normalizedTotal = normalizedSlots.reduce((sum, slot) => sum + slot.normalizedWeight, 0);
      if (normalizedTotal !== 100) {
        const diff = 100 - normalizedTotal;
        normalizedSlots[0].normalizedWeight += diff;
        console.log(`Adjusted first slot by ${diff} to reach total of 100%`);
      }
      
      // Option 2: Set equal weights
      const equalWeight = Math.floor(100 / wheel.slots.length);
      const equalWeights = wheel.slots.map(() => equalWeight);
      
      // Distribute the remainder to the first slots
      const remainder = 100 - (equalWeight * wheel.slots.length);
      for (let i = 0; i < remainder; i++) {
        equalWeights[i]++;
      }
      
      console.log(`Normalized weights: ${normalizedSlots.map(s => s.normalizedWeight).join(', ')}`);
      console.log(`Equal weights: ${equalWeights.join(', ')}`);
      
      // Ask which option to use
      console.log('\nChoosing normalized weights (proportional distribution)');
      
      // Update each slot with its new weight
      for (let i = 0; i < normalizedSlots.length; i++) {
        const slot = normalizedSlots[i];
        await prisma.slot.update({
          where: { id: slot.id },
          data: { weight: slot.normalizedWeight },
        });
        console.log(`Updated slot ${slot.id} (${slot.label}) to weight ${slot.normalizedWeight}%`);
      }
      
      console.log(`Wheel ${wheel.id} slots have been normalized to 100%`);
    } else {
      console.log(`Wheel ${wheel.id} already has a total weight of 100%, no changes needed`);
    }
    
    // Check if at least one slot is winning
    const hasWinningSlot = wheel.slots.some(slot => slot.isWinning);
    if (!hasWinningSlot && wheel.slots.length > 0) {
      console.log('No winning slot found. Making the first slot winning...');
      await prisma.slot.update({
        where: { id: wheel.slots[0].id },
        data: { isWinning: true },
      });
      console.log(`Slot ${wheel.slots[0].id} (${wheel.slots[0].label}) is now set as winning`);
    }
    
    console.log('Wheel has been fixed successfully');
  } catch (error) {
    console.error('Error fixing wheel:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get wheel ID from command line arguments
const wheelId = process.argv[2];

// Run the function
fixSpecificWheel(wheelId)
  .then(() => console.log('Done'))
  .catch(e => console.error('Script failed:', e)); 