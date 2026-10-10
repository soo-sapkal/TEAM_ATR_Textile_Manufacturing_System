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
    permissions = ROLE_PERMISSIONS[payload.role]?.perms || [];
  }

  if (!payload || !permissions.includes("inventory.read")) {
    return NextResponse.json({ success: false, error: "Forbidden: Requires inventory.read permission" }, { status: 403 });
  }

  try {
    const [itemsRes, batchesRes, movementsRes] = await Promise.all([
      pool.query("SELECT * FROM yarn_items ORDER BY code"),
      pool.query("SELECT * FROM yarn_batches ORDER BY received_at DESC"),
      pool.query("SELECT * FROM yarn_movements ORDER BY recorded_at DESC")
    ]);

    return NextResponse.json({
      success: true,
      data: {
        yarnItems: snakeToCamel(itemsRes.rows),
        yarnBatches: snakeToCamel(batchesRes.rows),
        yarnMovements: snakeToCamel(movementsRes.rows)
      }
    });
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch inventory data" }, { status: 500 });
  }
}
