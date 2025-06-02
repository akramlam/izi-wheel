// Script to set all admin users to isPaid = true
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setAllAdminsPaid() {
  try {
    console.log('Starting to update admin users...');
    
    // Update all users with ADMIN role to have isPaid = true
    const result = await prisma.user.updateMany({
      where: {
        role: 'ADMIN',
      },
      data: {
        isPaid: true,
      },
    });
    
    console.log(`✅ Successfully updated ${result.count} admin users to isPaid = true`);
    
    // Get specific admin users to verify
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        isPaid: true,
      },
    });
    
    console.log('Updated admin users:');
    admins.forEach(admin => {
      console.log(`- ${admin.email}: isPaid = ${admin.isPaid}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating admin users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
setAllAdminsPaid(); 