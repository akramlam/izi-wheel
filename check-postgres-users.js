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

async function checkPostgres() {
  try {
    // 1. Check PostgreSQL users
    const checkUsers = `
      echo "SELECT usename, usecreatedb, usesuper FROM pg_catalog.pg_user;" | psql -U postgres -d postgres
    `;
    
    // 2. Check authentication config
    const checkAuth = `
      cat $PGDATA/pg_hba.conf | grep -v "^#" | grep -v "^$"
    `;
    
    const dockerCmd1 = `docker exec iziwheel-postgres /bin/sh -c "${checkUsers}"`;
    const dockerCmd2 = `docker exec iziwheel-postgres /bin/sh -c "${checkAuth}"`;
    
    await executeCommand(dockerCmd1);
    await executeCommand(dockerCmd2);
    
    console.log('PostgreSQL check completed!');
    
  } catch (error) {
    console.error('Failed to check PostgreSQL:', error);
  }
}

checkPostgres(); 