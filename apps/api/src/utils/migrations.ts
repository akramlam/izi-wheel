import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Create a migration using Prisma migrate
 */
export const createMigration = async (name: string): Promise<void> => {
  try {
    console.log(`Creating migration: ${name}`);
    const { stdout, stderr } = await execAsync(`npx prisma migrate dev --name=${name}`);
    
    if (stderr) {
      console.error(`Migration error: ${stderr}`);
    }
    
    console.log(`Migration output: ${stdout}`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

/**
 * Run migrations in production
 */
export const runProductionMigrations = async (): Promise<void> => {
  try {
    console.log('Running production migrations');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
    
    if (stderr) {
      console.error(`Migration error: ${stderr}`);
    }
    
    console.log(`Migration output: ${stdout}`);
  } catch (error) {
    console.error('Production migration failed:', error);
    throw error;
  }
};

// Allow running via CLI
if (require.main === module) {
  const migrationName = process.argv[2];
  if (!migrationName) {
    console.error('Please provide a migration name');
    process.exit(1);
  }
  
  createMigration(migrationName)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} 