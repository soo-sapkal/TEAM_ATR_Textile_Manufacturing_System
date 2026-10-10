import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supplier, supplierLot, location, orderCode, receivedAt, notes, lines, actor } = body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const line of lines) {
        const accepted = parseFloat(line.accepted) || 0;
        const held = parseFloat(line.held) || 0;
        const damaged = parseFloat(line.damaged) || 0;
        const putAway = accepted + held;

        if (putAway === 0 && damaged === 0) continue;

        const batchId = crypto.randomUUID();
        const batchCode = `YB-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`;

        // 1. Insert Batch
        await client.query(`
          INSERT INTO yarn_batches (
            id, code, item_code, supplier, supplier_lot, received_at,
            on_hand, reserved, available, held, unit, unit_cost, location,
            status, order_code, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          batchId,
          batchCode,
          line.itemCode,
          supplier,
          supplierLot,
          new Date(receivedAt).toISOString(),
          putAway,
          0,
          accepted,
          held,
          "KG",
          line.unitCost || null,
          location,
          held > 0 ? "QUARANTINED" : "AVAILABLE",
          orderCode || null,
          notes || null
        ]);

        // 2. Insert Movement
        await client.query(`
          INSERT INTO yarn_movements (
            id, code, kind, batch_id, batch_code, item_code,
            quantity, unit, reference, actor, recorded_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          crypto.randomUUID(),
          `MOV-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`,
          "RECEIPT",
          batchId,
          batchCode,
          line.itemCode,
          putAway,
          "KG",
          `${supplier} - lot ${supplierLot}`,
          actor || "System",
          new Date().toISOString()
        ]);

        // 3. Atomically update Yarn Item
        await client.query(`
          UPDATE yarn_items
          SET 
            on_hand = on_hand + $1,
            available = available + $2,
            held = held + $3
          WHERE code = $4
        `, [putAway, accepted, held, line.itemCode]);
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
