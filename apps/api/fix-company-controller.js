const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCompanyController() {
  try {
    console.log('Starting to fix company controller issue...');
    
    // 1. Check if any companies are missing the remainingPlays field
    const companies = await prisma.company.findMany();
    console.log(`Found ${companies.length} companies`);
    
    // 2. Update all companies to ensure they have remainingPlays set
    const updates = [];
    for (const company of companies) {
      if (company.remainingPlays === undefined || company.remainingPlays === null) {
        console.log(`Company ${company.id} (${company.name}) is missing remainingPlays, updating...`);
        updates.push(
          prisma.company.update({
            where: { id: company.id },
            data: { remainingPlays: 50 } // Default to 50 plays
          })
        );
      }
    }
    
    // 3. Apply all updates
    if (updates.length > 0) {
      console.log(`Updating ${updates.length} companies...`);
      await Promise.all(updates);
      console.log('Updates completed successfully');
    } else {
      console.log('No companies need updating');
    }
    
    console.log('Fix completed successfully');
  } catch (error) {
    console.error('Error fixing company controller:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCompanyController(); 