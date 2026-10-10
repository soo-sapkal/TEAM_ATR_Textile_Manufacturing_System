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
      permissions = ROLE_PERMISSIONS[payload.role]?.perms || [];
    }
    if (!payload || !permissions.includes("production.assign")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires production.assign permission" }, { status: 403 });
    }

    const body = await req.json();
    const { operationId, machineId, shift, operator, actor } = body;

    const opRes = await pool.query("SELECT * FROM operations WHERE id = $1", [operationId]);
    const operation = opRes.rows[0];

    if (!operation) throw new Error("Operation not found");

    await pool.query(
      "UPDATE operations SET machine_code = $1, shift = $2, operators = $3 WHERE id = $4",
      [machineId, shift, [operator], operationId]
    );

    // Optional: Also update machine to show it's assigned to this operation
    await pool.query(
      "UPDATE machines SET operation_id = $1, order_code = $2 WHERE code = $3",
      [operationId, operation.order_code, machineId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Assign machine error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}


