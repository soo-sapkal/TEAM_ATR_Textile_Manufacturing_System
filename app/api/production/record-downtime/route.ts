import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Pool } from "pg";
import { verifyToken } from "@/lib/auth/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    
    const payload = await verifyToken(token) as any;
    let permissions = payload?.permissions || [];
    if (permissions.length === 0 && payload?.role) {
      const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
      permissions = ROLE_PERMISSIONS[payload.role] || [];
    }
    if (!payload || !permissions.includes("production.execute")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires production.execute permission" }, { status: 403 });
    }

    const body = await req.json();
    const { machineId, category, durationMinutes, reason, actor } = body;

    const mRes = await pool.query("SELECT * FROM machines WHERE id = $1", [machineId]);
    const machine = mRes.rows[0];

    if (!machine) throw new Error("Machine not found");

    // Add downtime to machine
    const newDowntime = (machine.downtime_minutes || 0) + parseInt(durationMinutes || 0);

    await pool.query(
      "UPDATE machines SET downtime_minutes = $1, status = $2 WHERE id = $3",
      [newDowntime, "BREAKDOWN", machineId]
    );

    // Record machine event
    await pool.query(
      "INSERT INTO machine_events (id, machine_code, event_type, description, downtime_minutes, actor, recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [crypto.randomUUID(), machine.code, "DOWNTIME_LOGGED", `[${category}] ${reason}`, parseInt(durationMinutes || 0), actor || "System", new Date().toISOString()]
    );

    return NextResponse.json({ success: true, downtimeMinutes: newDowntime });
  } catch (error: any) {
    console.error("Record downtime error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}


