import { PrismaClient, Role, Plan } from '@prisma/client';
import { hashPassword } from './utils/auth';
import { generateToken } from './utils/jwt';

const prisma = new PrismaClient();

async function createTestAccounts() {
  try {
    // Create a test company first
    const testCompany = await prisma.company.upsert({
      where: { name: 'Test Company' },
      update: {
        plan: Plan.PREMIUM,
        maxWheels: 5,
        isActive: true
      },
      create: {
        name: 'Test Company',
        plan: Plan.PREMIUM,
        maxWheels: 5
      }
    });
    console.log('Created test company:', testCompany.name, 'ID:', testCompany.id);

    // Create a super admin with isPaid=true and associate with company
    const superAdminPassword = await hashPassword('test123');
    const superAdmin = await prisma.user.upsert({
      where: { email: 'supertest@example.com' },
      update: {
        password: superAdminPassword,
        isPaid: true,
        companyId: testCompany.id // Assign the company ID
      },
      create: {
        email: 'supertest@example.com',
        password: superAdminPassword,
        role: Role.SUPER,
        isPaid: true,
        companyId: testCompany.id // Assign the company ID
      }
    });
    console.log('Created SUPER admin (isPaid=true):', superAdmin.email, 'CompanyId:', superAdmin.companyId);
    
    // Verify the token generation for SUPER admin
    const superToken = generateToken(superAdmin);
    console.log('SUPER admin token (for testing):', superToken);

    // Create an admin user for the test company
    const adminPassword = await hashPassword('test123');
    const adminUser = await prisma.user.upsert({
      where: { email: 'admintest@example.com' },
      update: {
        password: adminPassword,
        companyId: testCompany.id
      },
      create: {
        email: 'admintest@example.com',
        password: adminPassword,
        role: Role.ADMIN,
        companyId: testCompany.id
      }
    });
    console.log('Created ADMIN user:', adminUser.email, 'CompanyId:', adminUser.companyId);

    // Create a sub-admin user for the test company
    const subAdminPassword = await hashPassword('test123');
    const subAdminUser = await prisma.user.upsert({
      where: { email: 'subtest@example.com' },
      update: {
        password: subAdminPassword,
        companyId: testCompany.id
      },
      create: {
        email: 'subtest@example.com',
        password: subAdminPassword,
        role: Role.SUB,
        companyId: testCompany.id
      }
    });
    console.log('Created SUB user:', subAdminUser.email, 'CompanyId:', subAdminUser.companyId);

    // Create a second company to verify SUPER admin access
    const secondCompany = await prisma.company.upsert({
      where: { name: 'Second Test Company' },
      update: {
        plan: Plan.BASIC,
        maxWheels: 2,
        isActive: true
      },
      create: {
        name: 'Second Test Company',
        plan: Plan.BASIC,
        maxWheels: 2
      }
    });
    console.log('Created second company:', secondCompany.name, 'ID:', secondCompany.id);

    // Create a wheel for each company
    const wheel1 = await prisma.wheel.create({
      data: {
        name: 'Test Wheel 1',
        companyId: testCompany.id,
        mode: 'ALL_WIN',
        formSchema: {},
        isActive: true,
        slots: {
          create: [
            {
              label: 'Lot 1',
              weight: 50,
              prizeCode: 'P1_W1',
              color: '#FF6384',
            },
            {
              label: 'Lot 2',
              weight: 50,
              prizeCode: 'P1_W2',
              color: '#36A2EB',
            },
          ]
        }
      }
    });
    console.log('Created wheel for first company:', wheel1.name);

    const wheel2 = await prisma.wheel.create({
      data: {
        name: 'Test Wheel 2',
        companyId: secondCompany.id,
        mode: 'RANDOM_WIN',
        formSchema: {},
        isActive: true,
        slots: {
          create: [
            {
              label: 'Prix A',
              weight: 50,
              prizeCode: 'P2_WA',
              color: '#FFCE56',
            },
            {
              label: 'Prix B',
              weight: 50,
              prizeCode: 'P2_WB',
              color: '#4BC0C0',
            },
          ]
        }
      }
    });
    console.log('Created wheel for second company:', wheel2.name);

    console.log('\nAll test accounts created successfully with password: test123');
    console.log('You can now log in with these accounts in the application.');
    console.log('\nDEBUGGING INFO:');
    console.log('- SUPER admin isPaid:', superAdmin.isPaid);
    console.log('- SUPER admin role:', superAdmin.role);
    console.log('- Make sure these values are included in the JWT token');

  } catch (error) {
    console.error('Error creating test accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAccounts(); 