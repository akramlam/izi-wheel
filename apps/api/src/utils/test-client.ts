import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import axios, { AxiosInstance } from 'axios';

// Create a singleton client for testing
const testClient = new PrismaClient();

const API_URL = process.env.API_URL || 'http://localhost:3001';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to set token for tests
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Helper to create a unique test prefix
export const getTestPrefix = () => `test_${uuid().substring(0, 8)}`;

// Helper to clear test data
export const clearTestData = async (prefix: string) => {
  // Delete in order of dependencies
  // await testClient.prize.deleteMany({ // Prize model does not exist
  //   where: {
  //     id: { startsWith: prefix }
  //   }
  // });
  
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