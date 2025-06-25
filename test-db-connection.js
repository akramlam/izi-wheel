// Test database connection and EmailLog table
async function testDatabase() {
  try {
    console.log('🔍 Testing Prisma database connection...');
    
    // Import Prisma client from the API directory
    const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
    const prisma = new PrismaClient();
    
    console.log('📊 Checking EmailLog table...');
    
    // Check if we can query the EmailLog table
    const emailCount = await prisma.emailLog.count();
    console.log(`✅ EmailLog table accessible. Current count: ${emailCount}`);
    
    if (emailCount > 0) {
      const recentEmails = await prisma.emailLog.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          recipient: true,
          status: true,
          createdAt: true
        }
      });
      
      console.log('\n📧 Recent email logs:');
      recentEmails.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.type} to ${email.recipient} - ${email.status}`);
        console.log(`      Created: ${email.createdAt}`);
      });
    } else {
      console.log('📭 No emails logged yet - this is expected if no emails have been sent');
    }
    
    await prisma.$disconnect();
    console.log('✅ Database connection test completed successfully');
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    
    if (error.message.includes('Unknown argument `emailLog`')) {
      console.log('💡 The EmailLog table might not exist in the database yet');
      console.log('   Run: cd apps/api && npx prisma db push');
    }
  }
}

testDatabase(); 