import { PrismaClient } from '@prisma/client';

// Create a dedicated test instance
const prisma = new PrismaClient();

// Clean up function to remove test data
const cleanup = async () => {
  // Delete all created data in reverse order of dependencies
  await prisma.prize.deleteMany();
  await prisma.play.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.wheel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
};

describe('Prisma Schema Tests', () => {
  // Clean up before and after all tests
  beforeAll(async () => {
    await cleanup();
  });
  
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('should create and retrieve a company', async () => {
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        plan: 'BASIC',
        maxWheels: 2
      }
    });

    expect(company).toBeDefined();
    expect(company.id).toBeDefined();
    expect(company.name).toBe('Test Company');
    expect(company.plan).toBe('BASIC');
    expect(company.maxWheels).toBe(2);

    // Clean up
    await prisma.company.delete({ where: { id: company.id } });
  });

  it('should create a user with company relation', async () => {
    // Create a company first
    const company = await prisma.company.create({
      data: {
        name: 'User Test Company',
        plan: 'PREMIUM',
        maxWheels: 3
      }
    });

    // Create a user associated with the company
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'ADMIN',
        companyId: company.id
      }
    });

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('ADMIN');
    expect(user.companyId).toBe(company.id);

    // Get user with company relation
    const userWithCompany = await prisma.user.findUnique({
      where: { id: user.id },
      include: { company: true }
    });

    expect(userWithCompany?.company).toBeDefined();
    expect(userWithCompany?.company?.name).toBe('User Test Company');

    // Clean up
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.company.delete({ where: { id: company.id } });
  });

  it('should create a wheel with slots', async () => {
    // Create a company first
    const company = await prisma.company.create({
      data: {
        name: 'Wheel Test Company',
        plan: 'BASIC',
        maxWheels: 1
      }
    });

    // Create a wheel
    const wheel = await prisma.wheel.create({
      data: {
        name: 'Test Wheel',
        companyId: company.id,
        mode: 'RANDOM_WIN',
        formSchema: { fields: [{ name: 'email', type: 'email' }] },
        isActive: true
      }
    });

    expect(wheel).toBeDefined();
    expect(wheel.id).toBeDefined();
    expect(wheel.name).toBe('Test Wheel');
    expect(wheel.mode).toBe('RANDOM_WIN');

    // Create slots for the wheel
    const slot1 = await prisma.slot.create({
      data: {
        wheelId: wheel.id,
        label: 'Prize 1',
        probability: 50,
        prizeCode: 'CODE1'
      }
    });

    const slot2 = await prisma.slot.create({
      data: {
        wheelId: wheel.id,
        label: 'Prize 2',
        probability: 50,
        prizeCode: 'CODE2'
      }
    });

    expect(slot1).toBeDefined();
    expect(slot2).toBeDefined();

    // Get wheel with slots
    const wheelWithSlots = await prisma.wheel.findUnique({
      where: { id: wheel.id },
      include: { slots: true }
    });

    expect(wheelWithSlots?.slots).toHaveLength(2);
    expect(wheelWithSlots?.slots[0].label).toBe('Prize 1');
    expect(wheelWithSlots?.slots[1].label).toBe('Prize 2');

    // Clean up
    await prisma.slot.deleteMany({ where: { wheelId: wheel.id } });
    await prisma.wheel.delete({ where: { id: wheel.id } });
    await prisma.company.delete({ where: { id: company.id } });
  });
}); 