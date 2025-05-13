/**
 * One-time migration script to activate all slots
 */
import { activateAllSlots } from './utils/db-init';

async function main() {
  console.log('Starting slot activation...');
  const count = await activateAllSlots();
  console.log(`Finished activating ${count} slots`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error running migration:', err);
  process.exit(1);
}); 