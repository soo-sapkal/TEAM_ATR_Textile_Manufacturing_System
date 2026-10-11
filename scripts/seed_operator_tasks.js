const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const todayStr = new Date().toISOString().split('T')[0];
    const shiftA = `${todayStr} | A · 06:00–14:00`;
    const shiftB = `${todayStr} | B · 14:00–22:00`;

    // 1. Assign Ravi Kumar & Amit Sharma to Spinning
    await client.query(`
      UPDATE operations
      SET machine_code = 'SPIN-01',
          shift = $1,
          operators = '["Ravi Kumar", "Amit Sharma"]'::jsonb,
          status = 'IN_PROGRESS',
          good = 1850.00,
          waste = 45.00,
          reject = 12.00,
          target = 3000.00
      WHERE code = 'OP-DEMO-SPIN-1'
    `, [shiftA]);
    console.log('Assigned OP-DEMO-SPIN-1 to Ravi Kumar & Amit Sharma');

    // 2. Assign Suresh Patel & Sharma Amit to Weaving
    await client.query(`
      UPDATE operations
      SET machine_code = 'WEAV-01',
          shift = $1,
          operators = '["Suresh Patel", "Sharma Amit"]'::jsonb,
          status = 'IN_PROGRESS',
          good = 1600.00,
          waste = 35.00,
          reject = 10.00,
          target = 2500.00
      WHERE code = 'OP-DEMO-WEAV-1'
    `, [shiftA]);
    console.log('Assigned OP-DEMO-WEAV-1 to Suresh Patel & Sharma Amit');

    // 3. Assign Kavita Rao & Ajay Sharma to Dyeing
    await client.query(`
      UPDATE operations
      SET machine_code = 'DYE-01',
          shift = $1,
          operators = '["Kavita Rao", "Ajay Sharma"]'::jsonb,
          status = 'IN_PROGRESS',
          good = 1200.00,
          waste = 25.00,
          reject = 8.00,
          target = 2000.00
      WHERE code = 'OP-DEMO-DYEI-1'
    `, [shiftA]);
    console.log('Assigned OP-DEMO-DYEI-1 to Kavita Rao & Ajay Sharma');

    // 4. Update an already-completed operation today for history
    await client.query(`
      UPDATE operations
      SET shift = $1,
          operators = '["Ravi Kumar", "Amit Sharma"]'::jsonb,
          status = 'COMPLETED'
      WHERE code = 'OP-001-SPIN'
    `, [shiftA]);

    // Also update machine status to RUNNING for assigned machines
    await client.query(`UPDATE machines SET status = 'RUNNING' WHERE code IN ('SPIN-01', 'WEAV-01', 'DYE-01')`);

    await client.query('COMMIT');
    console.log('Operator tasks successfully assigned in Supabase database!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error assigning operator tasks:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
