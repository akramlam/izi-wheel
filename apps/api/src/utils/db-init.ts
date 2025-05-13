import prisma from './db';

/**
 * Ensures a wheel has at least one slot by creating default slots if needed
 */
export async function ensureWheelHasSlots(wheelId: string): Promise<boolean> {
  try {
    // Check if wheel exists and has slots
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      include: { slots: true }
    });

    if (!wheel) {
      console.error(`Wheel not found: ${wheelId}`);
      return false;
    }

    if (wheel.slots && wheel.slots.length > 0) {
      console.log(`Wheel ${wheelId} already has ${wheel.slots.length} slots.`);
      return true;
    }

    // Create default slots
    const defaultSlots = [
      { 
        label: 'Prize 1', 
        color: '#FF5722', 
        weight: 10, 
        isWinning: true,
        position: 0,
        isActive: true
      },
      { 
        label: 'Prize 2', 
        color: '#2196F3', 
        weight: 20, 
        isWinning: true,
        position: 1,
        isActive: true
      },
      { 
        label: 'Try Again', 
        color: '#4CAF50', 
        weight: 30, 
        isWinning: false,
        position: 2,
        isActive: true
      },
      { 
        label: 'Better Luck Next Time', 
        color: '#9C27B0', 
        weight: 40, 
        isWinning: false,
        position: 3,
        isActive: true
      }
    ];

    // Create slots in transaction
    await prisma.$transaction(
      defaultSlots.map(slotData => 
        prisma.slot.create({
          data: {
            ...slotData,
            wheelId: wheel.id
          }
        })
      )
    );

    console.log(`Created ${defaultSlots.length} default slots for wheel ${wheelId}`);
    return true;
  } catch (error) {
    console.error('Error ensuring wheel has slots:', error);
    return false;
  }
}

/**
 * Sets all slots for all wheels to isActive=true
 */
export async function activateAllSlots(): Promise<number> {
  try {
    const result = await prisma.slot.updateMany({
      where: {}, // Update all slots regardless of current isActive state
      data: {
        isActive: true
      }
    });
    
    console.log(`Updated ${result.count} slots to isActive=true`);
    return result.count;
  } catch (error) {
    console.error('Error activating slots:', error);
    return 0;
  }
}

/**
 * Initializes the database with default data for demo purposes
 */
export async function initializeDatabase() {
  // You can add more initialization here if needed
  console.log('Database initialization complete');
}

// Export default for direct script execution
export default {
  ensureWheelHasSlots,
  activateAllSlots,
  initializeDatabase
}; 