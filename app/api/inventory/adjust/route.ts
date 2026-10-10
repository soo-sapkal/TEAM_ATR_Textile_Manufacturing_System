import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { itemCode, delta, reason, actor } = await req.json();

    const amount = parseFloat(delta);
    if (isNaN(amount) || amount === 0) throw new Error("Invalid delta");

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Fetch the item
      const itemRes = await client.query("SELECT * FROM yarn_items WHERE code = $1 FOR UPDATE", [itemCode]);
      const itemData = itemRes.rows[0];
      if (!itemData) throw new Error("Yarn item not found");

      const currentOnHand = parseFloat(itemData.on_hand || 0);
      const currentAvailable = parseFloat(itemData.available || 0);

      const newOnHand = currentOnHand + amount;
      const newAvailable = currentAvailable + amount;

      if (newAvailable < 0) throw new Error("Cannot adjust below reserved stock");

      // Update item
      await client.query(
        "UPDATE yarn_items SET on_hand = $1, available = $2 WHERE code = $3",
        [newOnHand, newAvailable, itemCode]
      );

      // Create a movement record
      await client.query(`
        INSERT INTO yarn_movements (
          id, code, kind, item_code, quantity, unit, reference, actor, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        crypto.randomUUID(),
        `MOV-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`,
        "ADJUSTMENT",
        itemCode,
        amount.toFixed(3),
        itemData.unit,
        reason,
        actor || "System",
        new Date().toISOString()
      ]);

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
