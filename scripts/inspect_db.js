const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/loom_ledger" 
});

async function run() {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.rows.map(r => r.table_name).sort());

    const yarnCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'yarn_items'");
    console.log('yarn_items columns:', yarnCols.rows);

    const yarnBatchCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'yarn_batches'");
    console.log('yarn_batches columns:', yarnBatchCols.rows);

    const bomCols = await pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name LIKE '%bom%'");
    console.log('BOM columns:', bomCols.rows);

    const sampleYarn = await pool.query("SELECT * FROM yarn_items LIMIT 5");
    console.log('Sample yarn_items:', JSON.stringify(sampleYarn.rows, null, 2));

    const sampleBatches = await pool.query("SELECT * FROM yarn_batches LIMIT 5");
    console.log('Sample yarn_batches:', JSON.stringify(sampleBatches.rows, null, 2));

    const sampleOrders = await pool.query("SELECT * FROM orders LIMIT 3");
    console.log('Sample orders:', JSON.stringify(sampleOrders.rows, null, 2));

    const sampleProducts = await pool.query("SELECT * FROM products LIMIT 3");
    console.log('Sample products:', JSON.stringify(sampleProducts.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
