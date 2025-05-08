const { exec } = require('child_process');

// Function to execute a command and return a promise
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

async function fixPostgres() {
  try {
    // 1. Create a SQL script to update auth method
    const createSqlScript = `
      echo "ALTER ROLE postgres WITH PASSWORD '123';" > /tmp/update_auth.sql
    `;
    
    // 2. Run the SQL script in the container
    const dockerCmd = `docker exec iziwheel-postgres /bin/sh -c "${createSqlScript} && psql -U postgres -d postgres -f /tmp/update_auth.sql"`;
    
    await executeCommand(dockerCmd);
    console.log('PostgreSQL authentication fixed successfully!');
    
  } catch (error) {
    console.error('Failed to fix PostgreSQL authentication:', error);
  }
}

fixPostgres(); 