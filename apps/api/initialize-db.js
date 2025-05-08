const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if .env file exists, if not create from example
const envPath = path.join(__dirname, '../../..', '.env');
const envExamplePath = path.join(__dirname, '../../..', '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('Creating .env file from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('.env file created.');
}

// Function to execute command and print output
function runCommand(command) {
  console.log(`Running: ${command}`);
  try {
    const output = execSync(command, { cwd: __dirname, stdio: 'inherit' });
    return output;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Check if database exists, create if needed
console.log('Initializing database...');

// Generate Prisma client
console.log('Generating Prisma client...');
runCommand('npx prisma generate');

// Create initial migration
console.log('Creating initial migration...');
runCommand('npx prisma migrate dev --name initial_schema --create-only');

// Apply migration
console.log('Applying migration...');
runCommand('npx prisma migrate deploy');

// Seed the database
console.log('Seeding database...');
runCommand('npx prisma db seed');

console.log('Database initialization complete.'); 