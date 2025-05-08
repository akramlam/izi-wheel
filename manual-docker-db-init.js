const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'iziwheel-postgres',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '123'
  });

  try {
    console.log('Connecting to PostgreSQL in Docker...');
    await client.connect();
    console.log('Connected successfully!');
    
    const res = await client.query('SELECT NOW() as time');
    console.log('Current time from database:', res.rows[0].time);
    
    await client.end();
    console.log('Connection closed.');
  } catch (err) {
    console.error('Error connecting to PostgreSQL:', err);
  }
}

testConnection(); 