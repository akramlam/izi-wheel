const path = require('path');

// Set the correct path for Prisma client
const apiDir = path.join(__dirname, 'apps', 'api');
process.chdir(apiDir);

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperUser() {
  try {
    console.log('Checking for super user...');
    
    // Check if super user already exists
    const existingSuper = await prisma.user.findFirst({
      where: {
        role: 'SUPER'
      }
    });
    
    if (existingSuper) {
      console.log('Super user already exists:', existingSuper.email);
      
      // Ensure super user is active
      if (!existingSuper.isActive) {
        await prisma.user.update({
          where: { id: existingSuper.id },
          data: { isActive: true }
        });
        console.log('Super user activated');
      }
      
      return existingSuper;
    }
    
    // Create super user
    console.log('Creating super user...');
    const hashedPassword = await bcrypt.hash('super123', 10);
    
    const superUser = await prisma.user.create({
      data: {
        email: 'super@iziwheel.com',
        password: hashedPassword,
        role: 'SUPER',
        name: 'Super Administrator',
        isActive: true,
        isPaid: true,
        forcePasswordChange: false
      }
    });
    
    console.log('Super user created successfully:', superUser.email);
    console.log('Default password: super123');
    
    return superUser;
  } catch (error) {
    console.error('Error creating super user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createSuperUser()
  .then(() => {
    console.log('Super user setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to setup super user:', error);
    process.exit(1);
  }); 