import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client instance
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

export default prisma;

/**
 * Utility function to check if a Play record exists in the database
 * @param playId The Play ID to check
 * @returns Promise that resolves to true if record exists, false otherwise
 */
export const checkPlayExists = async (playId: string): Promise<boolean> => {
  if (!playId) {
    console.error('checkPlayExists: No playId provided');
    return false;
  }
  
  try {
    // Use findUnique with select to minimize data retrieval
    const play = await prisma.play.findUnique({
      where: { id: playId },
      select: { id: true } // Only get the ID
    });
    
    const exists = Boolean(play);
    console.log(`Play ID ${playId} ${exists ? 'exists' : 'does not exist'} in database`);
    
    return exists;
  } catch (error) {
    console.error(`Error checking if Play ID ${playId} exists:`, error);
    return false;
  }
}; 