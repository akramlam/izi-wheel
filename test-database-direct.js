const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWheelInDatabase() {
  try {
    console.log('🔍 Checking wheel in database...');
    
    const wheel = await prisma.wheel.findUnique({
      where: {
        id: 'f2733341-e54b-40ed-b45f-089c9ddb1490'
      },
      select: {
        id: true,
        name: true,
        bannerImage: true,
        backgroundImage: true,
        mainTitle: true,
        updatedAt: true
      }
    });
    
    if (wheel) {
      console.log('✅ Wheel found in database:');
      console.log(`  ID: ${wheel.id}`);
      console.log(`  Name: ${wheel.name}`);
      console.log(`  Banner Image: ${wheel.bannerImage || 'NULL'}`);
      console.log(`  Background Image: ${wheel.backgroundImage || 'NULL'}`);
      console.log(`  Main Title: ${wheel.mainTitle || 'NULL'}`);
      console.log(`  Last Updated: ${wheel.updatedAt}`);
    } else {
      console.log('❌ Wheel not found in database');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWheelInDatabase(); 