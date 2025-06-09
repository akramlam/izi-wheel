// Script to refresh a user's JWT token
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function refreshUserToken(email) {
  try {
    console.log(`Looking for user with email: ${email}`);
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        isPaid: true,
        name: true,
        forcePasswordChange: true
      },
    });
    
    if (!user) {
      console.error(`User not found: ${email}`);
      return null;
    }
    
    console.log('Found user:', user);
    
    // Generate a new token with updated user info
    const tokenSecret = process.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQwZjQyOTE5LTVmOTMtNGNmMS05Y2I2LTdhYjdkMjIwNWU2ZCIsImVtYWlsIjoiYm91bGJvdWxAZ21haWwuY29tIiwicm9sZSI6IlNVUEVSIiwiaXNQYWlkIjpmYWxzZSwibmFtZSI6IiIsImZvcmNlUGFzc3dvcmRDaGFuZ2UiOmZhbHNlLCJpYXQiOjE3NDgzMTQyNjksImV4cCI6MTc0ODkxOTA2OX0.JKvqJrx6yW71GBl5vAiqlcMLlQQ-A-EtmwZJI-bTGjM';
    const newToken = jwt.sign(user, tokenSecret, { expiresIn: '24h' });
    
    console.log('\n--- New Token (copy this) ---');
    console.log(newToken);
    console.log('--- End Token ---\n');
    
    console.log('Token payload:', user);
    console.log('isPaid status:', user.isPaid);
    
    console.log('\nTo use this token:');
    console.log('1. Copy the token above');
    console.log('2. Open the browser developer tools (F12)');
    console.log('3. Go to the Application tab');
    console.log('4. In Storage > Local Storage > https://api.izikado.fr');
    console.log('5. Replace the "token" value with the new token');
    console.log('6. Refresh the page');
    
    return newToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address: node refresh-token.js user@example.com');
} else {
  refreshUserToken(email)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
} 