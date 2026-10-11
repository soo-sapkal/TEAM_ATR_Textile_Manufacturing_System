const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ==========================================
    // ORDER 1: ORD-2026-COMP-01 (Raymond Luxury Cottons)
    // ==========================================
    const order1Code = 'ORD-2026-COMP-01';
    await client.query('DELETE FROM dispatch_events WHERE order_code = $1', [order1Code]);
    await client.query('DELETE FROM invoice_line_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_code = $1)', [order1Code]);
    await client.query('DELETE FROM invoices WHERE order_code = $1', [order1Code]);
    await client.query('DELETE FROM shipments WHERE order_code = $1', [order1Code]);
    await client.query('DELETE FROM fabric_rolls WHERE order_code = $1', [order1Code]);
    await client.query('DELETE FROM orders WHERE code = $1', [order1Code]);

    await client.query(`
      INSERT INTO orders (
        code, buyer, buyer_id, product, colour, due, priority, unit,
        ordered, remaining, dispatched, status, display_status,
        currency, revenue, material_shortage, at_risk
      ) VALUES (
        $1, 'Raymond Luxury Cottons Ltd', 'raymond-luxury-cottons', 'Cotton Poplin 40s', 'Optic White',
        NOW() - INTERVAL '3 days', 'URGENT', 'M',
        5000.00, 0.00, 5000.00, 'DISPATCHED', 'COMPLETED',
        'INR', 750000.00, false, false
      )
    `, [order1Code]);
    console.log('Inserted order:', order1Code);

    const shp1Id = crypto.randomUUID();
    const shp1Code = 'SHP-2026-901';
    const inv1Id = crypto.randomUUID();
    const inv1Code = 'INV-2026-901';

    const roll1Id = crypto.randomUUID();
    const roll2Id = crypto.randomUUID();

    await client.query(`
      INSERT INTO fabric_rolls (id, code, order_code, buyer, qty, unit, colour, dye_lot, status, machine_code, location, section, prior_failure)
      VALUES 
        ($1, 'ROL-2026-901', $2, 'Raymond Luxury Cottons Ltd', 2500.00, 'M', 'Optic White', 'LOT-W-881', 'DISPATCHED', 'L-01', 'Delivered (Raymond Bhiwandi Hub)', 'FINISHED_GOODS', false),
        ($3, 'ROL-2026-902', $2, 'Raymond Luxury Cottons Ltd', 2500.00, 'M', 'Optic White', 'LOT-W-881', 'DISPATCHED', 'L-02', 'Delivered (Raymond Bhiwandi Hub)', 'FINISHED_GOODS', false)
    `, [roll1Id, order1Code, roll2Id]);
    console.log('Inserted fabric rolls for order 1');

    await client.query(`
      INSERT INTO shipments (
        id, code, order_code, roll_ids, buyer, status, rolls, qty, unit,
        vehicle, planned_at, invoice, amount
      ) VALUES (
        $1, $2, $3, $4, 'Raymond Luxury Cottons Ltd', 'DISPATCHED', 2, 5000.00, 'M',
        'MH-12-RN-8812 (VRL Logistics)', NOW() - INTERVAL '2 days', $5, 787500.00
      )
    `, [shp1Id, shp1Code, order1Code, JSON.stringify([roll1Id, roll2Id]), inv1Code]);
    console.log('Inserted shipment for order 1');

    await client.query(`
      INSERT INTO invoices (
        id, code, shipment_id, order_code, buyer_name, subtotal, tax_cgst, tax_sgst, amount_due, due_date, status
      ) VALUES (
        $1, $2, $3, $4, 'Raymond Luxury Cottons Ltd', 750000.00, 18750.00, 18750.00, 787500.00, (NOW() + INTERVAL '28 days')::date, 'PAID'
      )
    `, [inv1Id, inv1Code, shp1Id, order1Code]);

    await client.query(`
      INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit, unit_rate, total)
      VALUES ($1, $2, 'Cotton Poplin 40s - Optic White (Completed Batch)', 5000.00, 'M', 150.00, 750000.00)
    `, [crypto.randomUUID(), inv1Id]);
    console.log('Inserted invoice for order 1');

    await client.query(`
      INSERT INTO dispatch_events (id, code, action, shipment_id, shipment_code, order_code, roll_ids, quantity, unit, actor, invoice_reference, recorded_at)
      VALUES ($1, 'EVT-DSP-901', 'CONFIRMED', $2, $3, $4, $5, 5000.00, 'M', 'Dispatch Officer', $6, NOW() - INTERVAL '2 days')
    `, [crypto.randomUUID(), shp1Id, shp1Code, order1Code, JSON.stringify([roll1Id, roll2Id]), inv1Code]);

    // ==========================================
    // ORDER 2: ORD-2026-COMP-02 (Bombay Dyeing Heritage)
    // ==========================================
    const order2Code = 'ORD-2026-COMP-02';
    await client.query('DELETE FROM dispatch_events WHERE order_code = $1', [order2Code]);
    await client.query('DELETE FROM invoice_line_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_code = $1)', [order2Code]);
    await client.query('DELETE FROM invoices WHERE order_code = $1', [order2Code]);
    await client.query('DELETE FROM shipments WHERE order_code = $1', [order2Code]);
    await client.query('DELETE FROM fabric_rolls WHERE order_code = $1', [order2Code]);
    await client.query('DELETE FROM orders WHERE code = $1', [order2Code]);

    await client.query(`
      INSERT INTO orders (
        code, buyer, buyer_id, product, colour, due, priority, unit,
        ordered, remaining, dispatched, status, display_status,
        currency, revenue, material_shortage, at_risk
      ) VALUES (
        $1, 'Bombay Dyeing Heritage Group', 'bombay-dyeing-heritage', 'Combed Twill 2/40s', 'Navy Blue',
        NOW() - INTERVAL '1 day', 'NORMAL', 'M',
        3200.00, 0.00, 3200.00, 'DISPATCHED', 'COMPLETED',
        'INR', 576000.00, false, false
      )
    `, [order2Code]);
    console.log('Inserted order:', order2Code);

    const shp2Id = crypto.randomUUID();
    const shp2Code = 'SHP-2026-902';
    const inv2Id = crypto.randomUUID();
    const inv2Code = 'INV-2026-902';

    const roll3Id = crypto.randomUUID();
    const roll4Id = crypto.randomUUID();

    await client.query(`
      INSERT INTO fabric_rolls (id, code, order_code, buyer, qty, unit, colour, dye_lot, status, machine_code, location, section, prior_failure)
      VALUES 
        ($1, 'ROL-2026-903', $2, 'Bombay Dyeing Heritage Group', 1600.00, 'M', 'Navy Blue', 'LOT-NB-442', 'DISPATCHED', 'L-03', 'Delivered (Dadar Central Yard)', 'FINISHED_GOODS', false),
        ($3, 'ROL-2026-904', $2, 'Bombay Dyeing Heritage Group', 1600.00, 'M', 'Navy Blue', 'LOT-NB-442', 'DISPATCHED', 'L-04', 'Delivered (Dadar Central Yard)', 'FINISHED_GOODS', false)
    `, [roll3Id, order2Code, roll4Id]);
    console.log('Inserted fabric rolls for order 2');

    await client.query(`
      INSERT INTO shipments (
        id, code, order_code, roll_ids, buyer, status, rolls, qty, unit,
        vehicle, planned_at, invoice, amount
      ) VALUES (
        $1, $2, $3, $4, 'Bombay Dyeing Heritage Group', 'DISPATCHED', 2, 3200.00, 'M',
        'MH-09-EM-4521 (Gati KWE Surface)', NOW() - INTERVAL '1 day', $5, 604800.00
      )
    `, [shp2Id, shp2Code, order2Code, JSON.stringify([roll3Id, roll4Id]), inv2Code]);
    console.log('Inserted shipment for order 2');

    await client.query(`
      INSERT INTO invoices (
        id, code, shipment_id, order_code, buyer_name, subtotal, tax_cgst, tax_sgst, amount_due, due_date, status
      ) VALUES (
        $1, $2, $3, $4, 'Bombay Dyeing Heritage Group', 576000.00, 14400.00, 14400.00, 604800.00, (NOW() + INTERVAL '29 days')::date, 'PENDING'
      )
    `, [inv2Id, inv2Code, shp2Id, order2Code]);

    await client.query(`
      INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit, unit_rate, total)
      VALUES ($1, $2, 'Combed Twill 2/40s - Navy Blue (Completed Batch)', 3200.00, 'M', 180.00, 576000.00)
    `, [crypto.randomUUID(), inv2Id]);
    console.log('Inserted invoice for order 2');

    await client.query(`
      INSERT INTO dispatch_events (id, code, action, shipment_id, shipment_code, order_code, roll_ids, quantity, unit, actor, invoice_reference, recorded_at)
      VALUES ($1, 'EVT-DSP-902', 'CONFIRMED', $2, $3, $4, $5, 3200.00, 'M', 'Dispatch Officer', $6, NOW() - INTERVAL '1 day')
    `, [crypto.randomUUID(), shp2Id, shp2Code, order2Code, JSON.stringify([roll3Id, roll4Id]), inv2Code]);

    await client.query('COMMIT');
    console.log('ALL COMPLETED ORDER TEST DATA INSERTED SUCCESSFULLY!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding completed orders:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
