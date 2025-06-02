// Script to fix wheel configuration issues
require('./prisma-local.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWheelSlots() {
  try {
    // Get all wheels
    const wheels = await prisma.wheel.findMany({
      include: {
        slots: {
          where: { isActive: true },
        },
      },
    });

    console.log(`Found ${wheels.length} wheels to check`);

    for (const wheel of wheels) {
      console.log(`Checking wheel ${wheel.id} (${wheel.name})`);
      
      if (!wheel.slots || wheel.slots.length === 0) {
        console.log(`  - No slots found for wheel ${wheel.id}`);
        continue;
      }

      // Calculate current total weight
      const totalWeight = wheel.slots.reduce((sum, slot) => sum + slot.weight, 0);
      console.log(`  - Current total weight: ${totalWeight}`);

      // If the total weight is not 100, adjust it
      if (totalWeight !== 100) {
        console.log(`  - Need to adjust weights. Current total: ${totalWeight}`);
        
        // Normalize the weights to sum to 100
        const normalizedSlots = wheel.slots.map(slot => {
          // Calculate normalized weight (proportional distribution)
          const normalizedWeight = Math.round((slot.weight / totalWeight) * 100);
          return {
            id: slot.id,
            normalizedWeight,
          };
        });
        
        // Due to rounding, we might not get exactly 100, adjust the first slot to compensate
        const normalizedTotal = normalizedSlots.reduce((sum, slot) => sum + slot.normalizedWeight, 0);
        if (normalizedTotal !== 100) {
          const diff = 100 - normalizedTotal;
          normalizedSlots[0].normalizedWeight += diff;
          console.log(`  - Adjusted first slot by ${diff} to reach total of 100`);
        }
        
        console.log(`  - New normalized weights: ${normalizedSlots.map(s => s.normalizedWeight).join(', ')}`);
        
        // Update each slot with its new weight
        for (const slot of normalizedSlots) {
          await prisma.slot.update({
            where: { id: slot.id },
            data: { weight: slot.normalizedWeight },
          });
          console.log(`  - Updated slot ${slot.id} to weight ${slot.normalizedWeight}`);
        }
        
        console.log(`  - Wheel ${wheel.id} slots have been normalized to 100%`);
      } else {
        console.log(`  - Wheel ${wheel.id} already has a total weight of 100%, no changes needed`);
      }
    }
    
    console.log('Wheel slot normalization completed successfully');
  } catch (error) {
    console.error('Error fixing wheel slots:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixWheelSlots()
  .then(() => console.log('Done'))
  .catch(e => console.error('Script failed:', e)); 