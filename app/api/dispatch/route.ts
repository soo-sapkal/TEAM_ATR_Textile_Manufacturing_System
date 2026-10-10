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

  if (!payload || !permissions.includes("dispatch.read")) {
    return NextResponse.json({ success: false, error: "Forbidden: Requires dispatch.read permission" }, { status: 403 });
  }

  try {
    const [shipmentsRes, eventsRes, rollsRes] = await Promise.all([
      pool.query("SELECT * FROM shipments ORDER BY created_at DESC"),
      pool.query("SELECT * FROM dispatch_events ORDER BY recorded_at DESC"),
      pool.query("SELECT * FROM fabric_rolls ORDER BY recorded_at DESC")
    ]);

    return NextResponse.json({
      success: true,
      data: {
        shipments: snakeToCamel(shipmentsRes.rows),
        dispatchEvents: snakeToCamel(eventsRes.rows),
        rolls: snakeToCamel(rollsRes.rows)
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed to fetch dispatch data" }, { status: 500 });
  }
}
