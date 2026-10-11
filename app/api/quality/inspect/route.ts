import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db/pool";
import { verifyToken } from "@/lib/auth/auth";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    
    const payload = await verifyToken(token) as any;
    let permissions = payload?.permissions || [];
    if (permissions.length === 0 && payload?.role) {
      const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
      permissions = ROLE_PERMISSIONS[payload.role]?.perms || [];
    }
    
    if (!payload || (!permissions.includes("quality.inspect") && !permissions.includes("quality.rework"))) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires quality.inspect permission" }, { status: 403 });
    }

    const body = await req.json();
    const { rollId, result, defect, reason, location, evidenceCount, actor } = body;

    // Fetch roll by ID or code
    const rollRes = await pool.query(
      "SELECT * FROM fabric_rolls WHERE id::text = $1 OR code = $1 LIMIT 1",
      [rollId]
    );
    const roll = rollRes.rows[0];

    if (!roll) {
      return NextResponse.json({ success: false, error: "Roll not found" }, { status: 404 });
    }

    if (roll.status === "DISPATCHED") {
      return NextResponse.json({
        success: false,
        error: "Cannot inspect roll: Roll has already been dispatched to customer."
      }, { status: 400 });
    }

    const nextStatus = (result === "PASS") ? "ACCEPTED" 
      : (result === "REWORK") ? "REWORK_REQUIRED" 
      : (result === "REJECT") ? "REJECTED" 
      : "QUARANTINED";

    const nextSection = (nextStatus === "ACCEPTED") ? "FINISHED_GOODS" 
      : (nextStatus === "QUARANTINED" || nextStatus === "REJECTED") ? "QUARANTINE" 
      : "DYED_FABRIC";

    const nextLocation = (nextStatus === "ACCEPTED") 
      ? (location || "Finished Goods Bay 1") 
      : (location || roll.location);

    const isFailure = ["REWORK", "REJECT", "QUARANTINE"].includes(result);
    const nextPriorFailure = Boolean(roll.prior_failure || isFailure);

    // Update fabric roll in database
    await pool.query(
      `UPDATE fabric_rolls 
       SET status = $1, section = $2, defect = $3, location = $4, prior_failure = $5 
       WHERE id = $6`,
      [
        nextStatus,
        nextSection,
        defect || null,
        nextLocation,
        nextPriorFailure,
        roll.id
      ]
    );

    // Record inspection event
    const inspectionCode = `QC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await pool.query(
      `INSERT INTO quality_inspections 
       (id, code, roll_id, roll_code, result, defect, reason, location, evidence_count, actor, recorded_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        crypto.randomUUID(),
        inspectionCode,
        roll.id,
        roll.code,
        result,
        defect || null,
        reason || (result === "PASS" ? "Passed visual and quality specifications" : "Nonconformance noted"),
        nextLocation,
        parseInt(evidenceCount || "0", 10),
        actor || payload.name || "Quality Inspector"
      ]
    );

    // Recalculate accepted meters for the associated order
    if (roll.order_code) {
      await pool.query(
        `UPDATE orders 
         SET accepted = (
           SELECT COALESCE(SUM(qty), 0) 
           FROM fabric_rolls 
           WHERE order_code = $1 AND status = 'ACCEPTED'
         )
         WHERE code = $1`,
        [roll.order_code]
      );
    }

    return NextResponse.json({ 
      success: true, 
      status: nextStatus,
      rollCode: roll.code,
      message: `Roll ${roll.code} disposition recorded as ${nextStatus}`
    });
  } catch (error: any) {
    console.error("Quality inspection error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to record inspection" }, { status: 500 });
  }
}
