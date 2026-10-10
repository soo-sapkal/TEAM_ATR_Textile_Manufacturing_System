import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Pool } from "pg";
import { verifyToken } from "@/lib/auth/auth";
import { snakeToCamel } from "@/lib/supabase/adapter";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
});

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  
  const payload = await verifyToken(token) as any;
  let permissions = payload?.permissions || [];
  if (permissions.length === 0 && payload?.role) {
    const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
    permissions = ROLE_PERMISSIONS[payload.role] || [];
  }

  if (!payload || !permissions.includes("production.read")) {
    return NextResponse.json({ success: false, error: "Forbidden: Requires production.read permission" }, { status: 403 });
  }

  try {
    const [machinesRes, opsRes, outputEventsRes, machineEventsRes] = await Promise.all([
      pool.query("SELECT * FROM machines"),
      pool.query("SELECT * FROM operations ORDER BY created_at DESC"),
      pool.query("SELECT * FROM output_events ORDER BY recorded_at DESC"),
      pool.query("SELECT * FROM machine_events ORDER BY recorded_at DESC")
    ]);

    return NextResponse.json({
      success: true,
      data: {
        machines: snakeToCamel(machinesRes.rows),
        operations: snakeToCamel(opsRes.rows),
        outputEvents: snakeToCamel(outputEventsRes.rows),
        machineEvents: snakeToCamel(machineEventsRes.rows)
      }
    });
  } catch (error) {
    console.error("Production GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch production data" }, { status: 500 });
  }
}


