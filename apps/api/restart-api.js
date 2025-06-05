const { execSync } = require('child_process');

console.log('Restarting API server...');

try {
  // Checking if the server is running with PM2
  const pmListOutput = execSync('pm2 list', { encoding: 'utf8' });
  
  if (pmListOutput.includes('iziwheel-api')) {
    // Restart using PM2
    console.log('Restarting API server using PM2...');
    execSync('pm2 restart iziwheel-api', { stdio: 'inherit' });
  } else {
    console.log('API server is not running with PM2. Please restart it manually.');
  }
  
  console.log('API server restart completed or instructions provided.');
} catch (error) {
  // PM2 might not be installed or accessible
  console.log('Unable to restart using PM2. Please restart the API server manually.');
  console.error('Error details:', error.message);
} 