// This script generates Prisma client in a local directory to avoid permission issues
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define paths
const apiDir = path.join(__dirname, 'apps', 'api');
const prismaSchemaPath = path.join(apiDir, 'prisma', 'schema.prisma');
const localPrismaDir = path.join(apiDir, 'local-prisma');

// Ensure the local directory exists
if (!fs.existsSync(localPrismaDir)) {
  fs.mkdirSync(localPrismaDir, { recursive: true });
}

// Modify the Prisma schema temporarily to output to a local directory
console.log('Reading Prisma schema...');
let schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');

// Backup the original schema
const backupPath = prismaSchemaPath + '.backup';
fs.writeFileSync(backupPath, schemaContent, 'utf8');
console.log('Schema backup created at:', backupPath);

// Add or replace the output directive
if (schemaContent.includes('output')) {
  schemaContent = schemaContent.replace(
    /output\s*=\s*{[^}]*}/,
    `output = {\n  value = "../local-prisma"\n}`
  );
} else {
  // Add before the first model declaration
  schemaContent = schemaContent.replace(
    /(model\s+\w+\s*{)/,
    `generator client {\n  provider = "prisma-client-js"\n  output   = "../local-prisma"\n}\n\n$1`
  );
}

// Write the modified schema
fs.writeFileSync(prismaSchemaPath, schemaContent, 'utf8');
console.log('Temporary schema with local output directory created');

// Run Prisma generate
console.log('Generating Prisma client...');
exec('cd apps\\api && npx prisma generate', (error, stdout, stderr) => {
  // Restore the original schema
  fs.writeFileSync(prismaSchemaPath, fs.readFileSync(backupPath, 'utf8'), 'utf8');
  fs.unlinkSync(backupPath);
  console.log('Original schema restored');
  
  if (error) {
    console.error('Error during Prisma generation:', error);
    console.error(stderr);
    process.exit(1);
  }
  
  console.log(stdout);
  console.log('\nPrisma client generated successfully in local directory');
  console.log('Next steps:');
  console.log('1. Update your code to import from the local directory');
  console.log('   Example: const { PrismaClient } = require(\'./local-prisma\')');
  console.log('2. Start your application');
}); 