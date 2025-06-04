// check-super-user.js
const { PrismaClient } = require('@api/prisma/client');
const prisma = new PrismaClient();

async function checkSuperUser() {
  try {
    const superUsers = await prisma.user.findMany({
      where: {
        role: 'SUPER'
      },
      select: {
        id: true,
        email: true,
        role: true,
        isPaid: true
      }
    });
    
    console.log('SUPER users found:', superUsers.length);
    console.log('SUPER users:', JSON.stringify(superUsers, null, 2));
  } catch (error) {
    console.error('Error checking for SUPER users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperUser();
