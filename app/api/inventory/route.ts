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

    const items = itemsRes.rows;
    const lowStockAlerts = items
      .filter((i) => parseFloat(i.available || 0) <= parseFloat(i.reorder_level || 0) * 1.25)
      .map((i) => {
        const available = parseFloat(i.available || 0);
        const reorderLevel = parseFloat(i.reorder_level || 0);
        const isCritical = available < reorderLevel;
        return {
          id: i.id,
          code: i.code,
          description: i.description,
          colour: i.colour,
          unit: i.unit,
          available,
          reorderLevel,
          deficit: Math.max(0, reorderLevel - available),
          severity: isCritical ? "CRITICAL" : "APPROACHING"
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        yarnItems: snakeToCamel(itemsRes.rows),
        yarnBatches: snakeToCamel(batchesRes.rows),
        yarnMovements: snakeToCamel(movementsRes.rows),
        lowStockAlerts: snakeToCamel(lowStockAlerts)
      }
    });
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch inventory data" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token) as any;
  let permissions = payload?.permissions || [];
  if (permissions.length === 0 && payload?.role) {
    const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
    permissions = ROLE_PERMISSIONS[payload.role]?.perms || [];
  }

  // Supervisor or Owner or inventory manager can update reorder levels
  if (!payload || (!permissions.includes("inventory.read") && !permissions.includes("master.manage"))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { itemCode, reorderLevel } = body;

    if (!itemCode || reorderLevel === undefined) {
      return NextResponse.json({ success: false, error: "itemCode and reorderLevel are required" }, { status: 400 });
    }

    const { rows } = await pool.query(
      "UPDATE yarn_items SET reorder_level = $1 WHERE code = $2 RETURNING *",
      [parseFloat(reorderLevel), itemCode]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Yarn item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: snakeToCamel(rows[0]) });
  } catch (error: any) {
    console.error("Inventory PATCH error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
