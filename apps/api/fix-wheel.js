// Require the prisma local configuration
require('../../prisma-local.js');
const { PrismaClient } = require('@prisma/client');

// Create a new Prisma client
const prisma = new PrismaClient();

// The wheel ID to fix
const wheelId = 'd96a7fea-df77-47e6-8f37-b2936090e9d8';

async function main() {
  try {
    // First, get the wheel details
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      include: { slots: true }
    });

    if (!wheel) {
      console.error(`Wheel with ID ${wheelId} not found`);
      return;
    }

    console.log(`Found wheel: ${wheel.name}`);
    console.log(`Found ${wheel.slots.length} slots`);

    // Update each slot with a proper position and set the first one as winning
    for (let i = 0; i < wheel.slots.length; i++) {
      const slot = wheel.slots[i];
      console.log(`Updating slot ${i+1}/${wheel.slots.length}: ${slot.label}`);
      
      await prisma.slot.update({
        where: { id: slot.id },
        data: {
          position: i,
          isWinning: i === 0, // Set the first slot as winning
          weight: 100 / wheel.slots.length // Distribute weight evenly
        }
      });
    }

    console.log('Wheel configuration updated successfully!');
    console.log('Please refresh the wheel page to see the changes.');
  } catch (error) {
    console.error('Error updating wheel:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function
main(); 