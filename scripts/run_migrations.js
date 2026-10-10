const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const connectionString = "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function applyMigrationsAndSeed() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to Supabase PostgreSQL database via session pooler...");
    await client.connect();
    console.log("Connected successfully!");

    const migrationPath = path.join(__dirname, "../supabase/migrations/20261010000000_initial_schema.sql");
    const seedPath = path.join(__dirname, "../supabase/seed.sql");

    console.log("Reading migration SQL...");
    const migrationSql = fs.readFileSync(migrationPath, "utf8");

    console.log("Executing migration SQL DDL...");
    await client.query(migrationSql);
    console.log("Migration executed successfully!");

    console.log("Reading seed SQL...");
    const seedSql = fs.readFileSync(seedPath, "utf8");

    console.log("Executing seed SQL...");
    await client.query(seedSql);
    console.log("Seed data executed successfully!");

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log("\n--- Verification: Tables created in public schema ---");
    res.rows.forEach((row, i) => console.log(`${i + 1}. ${row.table_name}`));

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

applyMigrationsAndSeed();
