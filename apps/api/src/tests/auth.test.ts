import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import { generateToken, verifyToken } from '../utils/jwt';

const prisma = new PrismaClient();

// Test user data
const testUser = {
  email: 'test-auth@example.com',
  password: 'testpassword123',
  role: Role.ADMIN,
};

// Cleanup function
const cleanup = async () => {
  await prisma.user.deleteMany({
    where: { email: testUser.email },
  });
};

describe('Authentication Tests', () => {
  let userId: string;

  // Setup and cleanup
  beforeAll(async () => {
    await cleanup();
    
    // Create test user
    const hashedPassword = await hashPassword(testUser.password);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        password: hashedPassword,
        role: testUser.role,
      },
    });
    
    userId = user.id;
  });
  
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('should hash a password', async () => {
    const password = 'testsecurepassword';
    const hashedPassword = await hashPassword(password);
    
    // Hash should be different from original password
    expect(hashedPassword).not.toBe(password);
    
    // Hash should be a string and have a length of 64 for SHA-256
    expect(typeof hashedPassword).toBe('string');
    expect(hashedPassword.length).toBe(64);
  });

  it('should generate a valid JWT token', async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    expect(user).toBeDefined();
    if (!user) return; // TypeScript safeguard
    
    const token = generateToken(user);
    
    // Token should be a string
    expect(typeof token).toBe('string');
    
    // Token should have three parts separated by dots (header.payload.signature)
    const parts = token.split('.');
    expect(parts.length).toBe(3);
  });

  it('should verify a valid JWT token', async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    expect(user).toBeDefined();
    if (!user) return; // TypeScript safeguard
    
    const token = generateToken(user);
    const decoded = verifyToken(token);
    
    // Decoded token should contain user information
    expect(decoded).toBeDefined();
    expect(decoded.id).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.role).toBe(user.role);
  });

  it('should throw an error for an invalid JWT token', async () => {
    const invalidToken = 'invalid.token.string';
    
    // Verifying an invalid token should throw an error
    expect(() => {
      verifyToken(invalidToken);
    }).toThrow();
  });
}); 