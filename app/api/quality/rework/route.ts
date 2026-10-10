import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rollId, action, reason, actor } = body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const rollRes = await client.query("SELECT * FROM fabric_rolls WHERE id = $1 FOR UPDATE", [rollId]);
      const roll = rollRes.rows[0];

      if (!roll) throw new Error("Roll not found");

      let newStatus = roll.status;
      if (action === "start-rework") newStatus = "IN_REWORK";
      if (action === "complete-rework") newStatus = "REINSPECTION_REQUIRED";

      // Update Roll status
      await client.query(
        "UPDATE fabric_rolls SET status = $1 WHERE id = $2",
        [newStatus, rollId]
      );

      // Insert rework event
      await client.query(`
        INSERT INTO rework_events (
          id, roll_id, roll_code, action, reason, actor, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        crypto.randomUUID(),
        rollId,
        roll.code,
        action,
        reason,
        actor || "System",
        new Date().toISOString()
      ]);

      await client.query("COMMIT");
      return NextResponse.json({ success: true, status: newStatus });
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
