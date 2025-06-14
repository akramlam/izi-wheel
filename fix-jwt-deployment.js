const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting JWT deployment fix...');

// Check if we're in the right directory
const currentDir = process.cwd();
console.log('Current directory:', currentDir);

const apiDir = path.join(currentDir, 'apps', 'api');
const jwtSourcePath = path.join(apiDir, 'src', 'utils', 'jwt.ts');
const jwtDistPath = path.join(apiDir, 'dist', 'utils', 'jwt.js');

try {
  // 1. Check if source file exists
  if (!fs.existsSync(jwtSourcePath)) {
    console.error('JWT source file not found:', jwtSourcePath);
    process.exit(1);
  }
  
  console.log('✓ JWT source file exists');
  
  // 2. Check if jsonwebtoken is installed
  try {
    execSync('cd apps/api && npm list jsonwebtoken', { stdio: 'pipe' });
    console.log('✓ jsonwebtoken package is installed');
  } catch (error) {
    console.log('Installing jsonwebtoken...');
    execSync('cd apps/api && pnpm add jsonwebtoken @types/jsonwebtoken', { stdio: 'inherit' });
    console.log('✓ jsonwebtoken installed');
  }
  
  // 3. Rebuild the API
  console.log('Rebuilding API...');
  execSync('cd apps/api && pnpm build', { stdio: 'inherit' });
  console.log('✓ API rebuilt successfully');
  
  // 4. Check if the built JWT file exists and has the correct content
  if (fs.existsSync(jwtDistPath)) {
    const builtContent = fs.readFileSync(jwtDistPath, 'utf8');
    if (builtContent.includes('jwt.sign') || builtContent.includes('jsonwebtoken')) {
      console.log('✓ JWT built file looks correct');
    } else {
      console.warn('⚠ JWT built file may not have correct imports');
    }
  } else {
    console.warn('⚠ JWT built file not found, but build succeeded');
  }
  
  console.log('\n✅ JWT deployment fix completed successfully!');
  console.log('Next steps:');
  console.log('1. Create super user: node create-super-user.js');
  console.log('2. Restart the API service: pm2 restart iziwheel-api');
  
} catch (error) {
  console.error('❌ Error during JWT fix:', error.message);
  console.error('Full error:', error);
  process.exit(1);
} 