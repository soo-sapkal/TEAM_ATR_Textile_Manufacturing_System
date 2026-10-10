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
    if (!payload || !permissions.includes("production.execute")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires production.execute permission" }, { status: 403 });
    }

    const body = await req.json();
    const { operationId, action, reason, actor } = body;

    const opRes = await pool.query("SELECT * FROM operations WHERE id = $1", [operationId]);
    const operation = opRes.rows[0];

    if (!operation) throw new Error("Operation not found");

    let newState = operation.status;
    let machineState = null;

    if (action === "start") {
      newState = "IN_PROGRESS";
      machineState = "RUNNING";
    } else if (action === "pause") {
      newState = "PAUSED";
      machineState = "IDLE";
    } else if (action === "resume") {
      newState = "IN_PROGRESS";
      machineState = "RUNNING";
    } else if (action === "complete") {
      newState = "COMPLETED";
      machineState = "IDLE";
    } else if (action === "cancel") {
      newState = "CANCELLED";
      machineState = "IDLE";
    }

    // Update Operation
    await pool.query("UPDATE operations SET status = $1 WHERE id = $2", [newState, operationId]);

    // Update Machine if assigned
    if (operation.machine_code && machineState) {
      await pool.query("UPDATE machines SET status = $1 WHERE code = $2", [machineState, operation.machine_code]);
    }

    return NextResponse.json({ success: true, status: newState });
  } catch (error: any) {
    console.error("Operation transition error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}


