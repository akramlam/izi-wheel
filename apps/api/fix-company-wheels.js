const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCompanyMaxWheels() {
  try {
    // Update the specific company
    const result = await prisma.company.update({
      where: {
        id: '290d4b67-bcff-4bfa-ae97-9c1875bada79' // Your company ID
      },
      data: {
        maxWheels: 5 // Set to match the new default
      }
    });
    
    console.log('Company updated successfully:', result);
  } catch (error) {
    console.error('Error updating company:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCompanyMaxWheels(); 