const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres" 
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

    const orders = await pool.query("SELECT id, code, product FROM orders");
    console.log('Orders:', orders.rows);

    const products = await pool.query("SELECT id, code, name FROM products");
    console.log('Products:', products.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
