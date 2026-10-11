import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db/pool";
import { verifyToken } from "@/lib/auth/auth";
import { snakeToCamel } from "@/lib/supabase/adapter";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  
  const payload = await verifyToken(token) as any;
  let permissions = payload?.permissions || [];
  if (permissions.length === 0 && payload?.role) {
    const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
    permissions = ROLE_PERMISSIONS[payload.role]?.perms || [];
  }

  if (!payload || !permissions.includes("quality.read")) {
    return NextResponse.json({ success: false, error: "Forbidden: Requires quality.read permission" }, { status: 403 });
  }

  try {
    const [qualityInspectionsRes, reworkEventsRes, rollsRes] = await Promise.all([
      pool.query("SELECT * FROM quality_inspections ORDER BY recorded_at DESC"),
      pool.query("SELECT * FROM rework_events ORDER BY recorded_at DESC"),
      pool.query("SELECT * FROM fabric_rolls")
    ]);

    return NextResponse.json({
      success: true,
      data: {
        inspectionEvents: snakeToCamel(qualityInspectionsRes.rows),
        reworkEvents: snakeToCamel(reworkEventsRes.rows),
        rolls: snakeToCamel(rollsRes.rows)
      }
    });
  } catch (error) {
    console.error("Quality GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch quality data" }, { status: 500 });
  }
}
