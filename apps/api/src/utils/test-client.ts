import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

// Create a singleton client for testing
const testClient = new PrismaClient();

// Helper to create a unique test prefix
export const getTestPrefix = () => `test_${uuid().substring(0, 8)}`;

// Helper to clear test data
export const clearTestData = async (prefix: string) => {
  // Delete in order of dependencies
  await testClient.prize.deleteMany({
    where: {
      id: { startsWith: prefix }
    }
  });
  
  await testClient.play.deleteMany({
    where: {
      id: { startsWith: prefix }
    }
  });
  
  await testClient.slot.deleteMany({
    where: {
      id: { startsWith: prefix }
    }
  });
  
  await testClient.wheel.deleteMany({
    where: {
      id: { startsWith: prefix }
    }
  });
  
  await testClient.user.deleteMany({
    where: {
      id: { startsWith: prefix }
    }
  });
  
  await testClient.company.deleteMany({
    where: {
      id: { startsWith: prefix }
    }
  });
};

export default testClient; 