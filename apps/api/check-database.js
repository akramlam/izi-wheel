const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the database URL from the .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const databaseUrl = envContent
  .split('\n')
  .find(line => line.startsWith('DATABASE_URL='))
  ?.split('=')[1]
  ?.trim();

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env file');
  process.exit(1);
}

// SQL to check the status of the schema
const checkSql = `
-- Check if FREE value exists in Plan enum
SELECT EXISTS (
  SELECT 1 FROM pg_type JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
  WHERE pg_type.typname = 'plan' AND pg_enum.enumlabel = 'FREE'
) AS free_plan_exists;

-- Check if remainingPlays column exists in Company table
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'Company' AND column_name = 'remainingPlays'
) AS remaining_plays_exists;

-- Check if migration is marked as applied
SELECT EXISTS (
  SELECT 1 FROM "_prisma_migrations" 
  WHERE migration_name = '20250605000000_add_free_plan_and_remaining_plays'
) AS migration_applied;

-- Check default values
SELECT 
  pg_get_expr(d.adbin, d.adrelid) as default_expr,
  a.attname as column_name
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
WHERE c.relname = 'Company' 
  AND n.nspname = 'public'
  AND a.attname IN ('plan', 'maxWheels', 'remainingPlays');
`;

try {
  // Write the SQL to a temporary file
  const tempCheckSqlPath = path.join(__dirname, 'temp-check-schema.sql');
  fs.writeFileSync(tempCheckSqlPath, checkSql);

  // Execute the SQL using psql
  console.log('Checking database schema status...');
  const result = execSync(`psql "${databaseUrl}" -f "${tempCheckSqlPath}"`, { encoding: 'utf8' });
  
  // Delete the temporary file
  fs.unlinkSync(tempCheckSqlPath);

  // Output the results
  console.log('\nDatabase Schema Check Results:');
  console.log(result);
  
  console.log('\nNext steps:');
  console.log('1. If "free_plan_exists" and "remaining_plays_exists" are both true, the schema is updated correctly.');
  console.log('2. If "migration_applied" is true, Prisma migrations are up to date.');
  console.log('3. Ensure default values for plan and maxWheels are set correctly.');
  console.log('4. Run "npx prisma generate" to update the Prisma client.');
  console.log('5. Restart your API server.');
} catch (error) {
  console.error('Error checking schema:', error);
  process.exit(1);
} 