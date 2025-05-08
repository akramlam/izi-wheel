import { PrismaClient, Role, WheelMode } from '@prisma/client';
import { hashPassword } from '../utils/auth';

const prisma = new PrismaClient();

// Test data
const testCompany = {
  name: 'Test Wheel Company',
  plan: 'BASIC' as const,
  maxWheels: 2,
};

const testWheel = {
  name: 'Test Wheel',
  mode: WheelMode.RANDOM_WIN,
  formSchema: {
    fields: [
      { name: 'email', label: 'Email', type: 'email', required: true },
    ],
  },
  isActive: true,
};

const testSlots = [
  { label: 'Prize 1', probability: 50, prizeCode: 'CODE1' },
  { label: 'Prize 2', probability: 50, prizeCode: 'CODE2' },
];

// Cleanup function
const cleanup = async () => {
  // Delete in reverse order of dependencies
  await prisma.slot.deleteMany({
    where: { label: { in: testSlots.map(s => s.label) } },
  });
  
  await prisma.wheel.deleteMany({
    where: { name: testWheel.name },
  });
  
  await prisma.company.deleteMany({
    where: { name: testCompany.name },
  });
};

describe('Wheel and Slot Tests', () => {
  let companyId: string;
  let wheelId: string;
  let slotIds: string[] = [];

  // Setup and cleanup
  beforeAll(async () => {
    await cleanup();
    
    // Create test company
    const company = await prisma.company.create({
      data: testCompany,
    });
    
    companyId = company.id;
  });
  
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('should create a wheel', async () => {
    const wheel = await prisma.wheel.create({
      data: {
        ...testWheel,
        companyId,
      },
    });
    
    expect(wheel).toBeDefined();
    expect(wheel.id).toBeDefined();
    expect(wheel.name).toBe(testWheel.name);
    expect(wheel.mode).toBe(testWheel.mode);
    expect(wheel.companyId).toBe(companyId);
    
    wheelId = wheel.id;
  });

  it('should retrieve a wheel', async () => {
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
    });
    
    expect(wheel).toBeDefined();
    expect(wheel?.name).toBe(testWheel.name);
  });

  it('should create slots with valid probability values', async () => {
    // Create slots one by one
    for (const slotData of testSlots) {
      const slot = await prisma.slot.create({
        data: {
          ...slotData,
          wheelId,
        },
      });
      
      expect(slot).toBeDefined();
      expect(slot.label).toBe(slotData.label);
      expect(slot.probability).toBe(slotData.probability);
      
      slotIds.push(slot.id);
    }
    
    // Verify total probability
    const slots = await prisma.slot.findMany({
      where: { wheelId },
    });
    
    expect(slots).toHaveLength(2);
    
    const totalProbability = slots.reduce((sum, slot) => sum + slot.probability, 0);
    expect(totalProbability).toBe(100);
  });

  it('should update a slot while maintaining valid probability', async () => {
    if (slotIds.length < 2) {
      throw new Error('Slot IDs not properly set up');
    }
    
    // Update first slot to probability 60
    await prisma.slot.update({
      where: { id: slotIds[0] },
      data: { probability: 60 },
    });
    
    // Update second slot to probability 40
    await prisma.slot.update({
      where: { id: slotIds[1] },
      data: { probability: 40 },
    });
    
    // Verify total is still 100
    const slots = await prisma.slot.findMany({
      where: { wheelId },
    });
    
    const totalProbability = slots.reduce((sum, slot) => sum + slot.probability, 0);
    expect(totalProbability).toBe(100);
  });

  it('should delete a wheel and cascade delete its slots', async () => {
    // Verify slots exist
    const beforeSlots = await prisma.slot.findMany({
      where: { wheelId },
    });
    expect(beforeSlots.length).toBeGreaterThan(0);
    
    // Delete wheel
    await prisma.wheel.delete({
      where: { id: wheelId },
    });
    
    // Verify wheel is deleted
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
    });
    expect(wheel).toBeNull();
    
    // Verify slots are deleted
    const afterSlots = await prisma.slot.findMany({
      where: { wheelId },
    });
    expect(afterSlots).toHaveLength(0);
  });
}); 