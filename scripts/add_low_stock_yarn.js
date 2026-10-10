const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/loom_ledger" 
});

async function run() {
  try {
    const check = await pool.query("SELECT * FROM yarn_items WHERE code = 'YRN-SILK-20D'");
    let silkId;
    if (check.rows.length === 0) {
      const res = await pool.query(
        "INSERT INTO yarn_items (id, code, description, colour, unit, on_hand, reserved, available, held, reorder_level) VALUES (gen_random_uuid(), 'YRN-SILK-20D', 'Pure Mulberry Silk 20D', 'IVORY', 'KG', 420.000, 150.000, 270.000, 0.000, 1000.000) RETURNING *"
      );
      silkId = res.rows[0].id;
      console.log('Inserted Low-Stock Silk Yarn:', res.rows[0]);
    } else {
      silkId = check.rows[0].id;
      console.log('Silk Yarn already exists:', check.rows[0]);
    }

    // Also check if there's a Silk product
    const prodCheck = await pool.query("SELECT * FROM products WHERE code = 'FAB-SILK-401'");
    let prodId;
    if (prodCheck.rows.length === 0) {
      const pRes = await pool.query(
        "INSERT INTO products (id, code, name, description, category) VALUES (gen_random_uuid(), 'FAB-SILK-401', 'Pure Mulberry Silk Twill', 'Luxury silk twill weave for premium couture', 'Silk') RETURNING *"
      );
      prodId = pRes.rows[0].id;
      console.log('Inserted Silk Product:', pRes.rows[0]);

      // Add BOM
      const bomRes = await pool.query(
        "INSERT INTO bill_of_materials (id, product_id, yarn_item_id, quantity_required, unit) VALUES (gen_random_uuid(), $1, $2, 0.350, 'KG') RETURNING *",
        [prodId, silkId]
      );
      console.log('Inserted Silk BOM:', bomRes.rows[0]);
    } else {
      console.log('Silk Product already exists:', prodCheck.rows[0]);
    }

    // Also let's check ORD-2026-871 or add an order for Silk to demonstrate shortage
    const orderCheck = await pool.query("SELECT * FROM orders WHERE product = 'Pure Mulberry Silk Twill'");
    if (orderCheck.rows.length === 0) {
      // 2000 meters requires 700 kg of silk. We only have 270 kg available! So Deficit = 430 kg.
      const oRes = await pool.query(`
        INSERT INTO orders (
          code, buyer, buyer_id, product, colour, due, priority, status, display_status,
          unit, ordered, planned, produced, accepted, available, reserved, dispatched,
          remaining, at_risk, material_shortage, currency, revenue
        ) VALUES (
          'ORD-2026-003', 'Kaveri Apparel Co.', 'kaveri-apparel', 'Pure Mulberry Silk Twill', 'IVORY',
          NOW() + INTERVAL '14 days', 'HIGH', 'DRAFT', 'DRAFT',
          'M', 2000.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000,
          2000.000, true, true, 'INR', 850000.00
        ) RETURNING *
      `);
      console.log('Inserted Sample Order with Material Shortage:', oRes.rows[0]);
    } else {
      console.log('Sample Shortage Order already exists:', orderCheck.rows[0]);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
