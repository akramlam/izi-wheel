import { PrismaClient, Role, Plan } from '@prisma/client';
import { hashPassword } from './utils/auth';

const prisma = new PrismaClient();

async function fixAccounts() {
  try {
    // Create a test company with a clear ID
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
        maxWheels: 5,
        isActive: true
      }
    });
    console.log('Created/Updated test company:', testCompany.name, 'ID:', testCompany.id);

    // Create an admin user for instant login - SUPER_ADMIN
    const superAdminPassword = await hashPassword('admin123');
    const superAdmin = await prisma.user.upsert({
      where: { email: 'super@example.com' },
      update: {
        password: superAdminPassword,
        role: Role.SUPER,
        isPaid: true,
        companyId: testCompany.id
      },
      create: {
        email: 'super@example.com',
        password: superAdminPassword,
        role: Role.SUPER,
        isPaid: true,
        companyId: testCompany.id
      }
    });
    console.log('Created/Updated SUPER admin:', superAdmin.email);
    console.log('isPaid:', superAdmin.isPaid);
    console.log('role:', superAdmin.role);
    console.log('companyId:', superAdmin.companyId);

    // Create an admin user for the company
    const adminPassword = await hashPassword('admin123');
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        password: adminPassword,
        role: Role.ADMIN,
        companyId: testCompany.id
      },
      create: {
        email: 'admin@example.com',
        password: adminPassword,
        role: Role.ADMIN,
        companyId: testCompany.id
      }
    });
    console.log('Created/Updated ADMIN user:', adminUser.email);
    console.log('role:', adminUser.role);
    console.log('companyId:', adminUser.companyId);

    console.log('\nLogin credentials:');
    console.log('SUPER admin: super@example.com / admin123');
    console.log('ADMIN: admin@example.com / admin123');

  } catch (error) {
    console.error('Error fixing accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAccounts(); 