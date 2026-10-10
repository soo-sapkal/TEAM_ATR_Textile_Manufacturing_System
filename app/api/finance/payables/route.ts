import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
    const [billsRes, paymentsRes] = await Promise.all([
      pool.query("SELECT * FROM supplier_bills ORDER BY created_at DESC"),
      pool.query("SELECT * FROM supplier_payments ORDER BY created_at DESC")
    ]);

    return NextResponse.json({
      data: {
        supplierBills: billsRes.rows.map(snakeToCamel),
        supplierPayments: paymentsRes.rows.map(snakeToCamel),
      }
    });
  } catch (error) {
    console.error("Finance Payables GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch finance payables data" }, { status: 500 });
  }
}
