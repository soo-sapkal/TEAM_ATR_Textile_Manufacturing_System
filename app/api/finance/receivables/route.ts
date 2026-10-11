import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db/pool";
import { verifyToken } from "@/lib/auth/auth";
import { snakeToCamel } from "@/lib/supabase/adapter";

export const dynamic = "force-dynamic";

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

  if (!payload || !permissions.includes("finance.read")) {
    return NextResponse.json({ success: false, error: "Forbidden: Requires finance.read permission" }, { status: 403 });
  }

  try {
    const invoicesRes = await pool.query("SELECT * FROM invoices ORDER BY created_at DESC");
    const paymentsRes = await pool.query("SELECT * FROM payments ORDER BY created_at DESC");

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoicesRes.rows.map(snakeToCamel),
        payments: paymentsRes.rows.map(snakeToCamel),
      }
    });
  } catch (error) {
    console.error("Finance GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch finance data" }, { status: 500 });
  }
}
