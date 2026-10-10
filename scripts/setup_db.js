const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/loom_ledger';
  console.log(`\n======================================================`);
  console.log(`Setting up Loom Ledger PostgreSQL Database`);
  console.log(`Target: ${connectionString.replace(/:([^:@]+)@/, ':****@')}`);
  console.log(`======================================================\n`);

  // Parse connection URL to extract DB name or connect to default postgres DB first if needed
  let client;
  try {
    client = new Client({ connectionString });
    await client.connect();
    console.log('✓ Successfully connected to PostgreSQL database.');
  } catch (err) {
    if (err.code === '3D000') { // Database does not exist
      console.log('Database does not exist yet. Attempting to create it...');
      try {
        const url = new URL(connectionString);
        const dbName = url.pathname.replace(/^\//, '');
        url.pathname = '/postgres';
        const defaultClient = new Client({ connectionString: url.toString() });
        await defaultClient.connect();
        await defaultClient.query(`CREATE DATABASE "${dbName}";`);
        await defaultClient.end();
        console.log(`✓ Created database "${dbName}".`);

        client = new Client({ connectionString });
        await client.connect();
      } catch (createErr) {
        console.error('Failed to auto-create database:', createErr.message);
        process.exit(1);
      }
    } else {
      console.error('\n✗ Error connecting to PostgreSQL:');
      console.error(err.message);
      console.error('\nPlease verify PostgreSQL is running and DATABASE_URL in .env.local is valid.');
      process.exit(1);
    }
  }

  try {
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

    console.log('Applying database schema from database/schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('✓ Schema applied successfully.');

    console.log('Seeding initial data from database/seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('✓ Initial data seeded successfully.');

    console.log('\n======================================================');
    console.log('✓ Database setup completed successfully!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n✗ Error executing database script:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
