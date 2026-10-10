import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rollId, result, defect, reason, location, evidenceCount, actor } = body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const rollRes = await client.query("SELECT * FROM fabric_rolls WHERE id = $1 FOR UPDATE", [rollId]);
      const roll = rollRes.rows[0];

      if (!roll) throw new Error("Roll not found");

      const finalLocation = location || roll.location;

      // Update Roll status
      await client.query(
        "UPDATE fabric_rolls SET status = $1, defect = $2, location = $3 WHERE id = $4",
        [result, defect || null, finalLocation, rollId]
      );

      // Insert inspection event
      await client.query(`
        INSERT INTO quality_inspections (
          id, roll_id, roll_code, result, defect, reason, location, evidence_count, actor, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        crypto.randomUUID(),
        rollId,
        roll.code,
        result,
        defect || null,
        reason || "",
        finalLocation,
        parseInt(evidenceCount || 0),
        actor || "System",
        new Date().toISOString()
      ]);

      await client.query("COMMIT");
      return NextResponse.json({ success: true, status: result });
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
