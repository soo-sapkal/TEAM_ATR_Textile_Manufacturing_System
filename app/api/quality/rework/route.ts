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
    
    if (!payload || !permissions.includes("quality.rework")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires quality.rework permission" }, { status: 403 });
    }

    const body = await req.json();
    const { rollId, action, reason, actor } = body;

    const rollRes = await pool.query(
      "SELECT * FROM fabric_rolls WHERE id::text = $1 OR code = $1 LIMIT 1",
      [rollId]
    );
    const roll = rollRes.rows[0];

    if (!roll) {
      return NextResponse.json({ success: false, error: "Roll not found" }, { status: 404 });
    }

    let newStatus = roll.status;
    if (action === "start-rework") newStatus = "IN_REWORK";
    if (action === "complete-rework") newStatus = "REINSPECTION_REQUIRED";

    await pool.query(
      "UPDATE fabric_rolls SET status = $1, prior_failure = true WHERE id = $2",
      [newStatus, roll.id]
    );

    const reworkCode = `RWK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await pool.query(
      `INSERT INTO rework_events 
       (id, code, roll_id, roll_code, action, reason, actor, recorded_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        crypto.randomUUID(),
        reworkCode,
        roll.id,
        roll.code,
        action,
        reason || "Rework operation recorded",
        actor || payload.name || "Quality Inspector"
      ]
    );

    return NextResponse.json({ success: true, status: newStatus, rollCode: roll.code });
  } catch (error: any) {
    console.error("Rework error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to process rework" }, { status: 500 });
  }
}
