import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Pool } from "pg";
import { verifyToken } from "@/lib/auth/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
});

export async function POST(req: Request) {
  const client = await pool.connect();
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
    if (!payload || (!permissions.includes("production.assign") && !permissions.includes("production.record_output"))) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires production.assign or production.record_output permission" }, { status: 403 });
    }

    const body = await req.json();
    const { operationId, machineId, shift, date, operator, actor, autoSplit } = body;

    await client.query('BEGIN');

    const opRes = await client.query("SELECT * FROM operations WHERE id = $1 FOR UPDATE", [operationId]);
    const operation = opRes.rows[0];
    if (!operation) throw new Error("Operation not found");

    // 1. Skill check
    const profRes = await client.query("SELECT skill FROM users WHERE name LIKE $1 || '%'", [operator]);
    const operatorSkill = profRes.rows[0]?.skill;
    if (!operatorSkill) throw new Error("Operator profile not found or not a machine operator");
    if (operatorSkill !== "ALL" && operatorSkill !== operation.stage) {
      throw new Error(`Operator skill '${operatorSkill}' is not qualified for stage '${operation.stage}'`);
    }

    // 2. Machine validation
    const machRes = await client.query("SELECT * FROM machines WHERE code = $1 FOR UPDATE", [machineId]);
    const machine = machRes.rows[0];
    if (!machine) throw new Error("Machine not found");
    if (machine.stage !== operation.stage) throw new Error("Machine is not suitable for this stage");
    
    // Check conflicts
    const conflictRes = await client.query("SELECT id FROM operations WHERE machine_code = $1 AND scheduled_date = $2 AND shift = $3 AND id != $4 AND status IN ('PLANNED', 'IN_PROGRESS', 'PAUSED')", [machineId, date, shift, operationId]);
    if (conflictRes.rows.length > 0) throw new Error("Machine is already assigned to another task during this shift");

    // 3. Upstream material availability check
    if (operation.stage === 'WEAVING') {
      const yarnRes = await client.query("SELECT COALESCE(SUM(available), 0) as total_avail FROM yarn_batches WHERE order_code = $1 AND section = 'SPUN_YARN' AND status = 'AVAILABLE'", [operation.order_code]);
      const available = parseFloat(yarnRes.rows[0].total_avail);
      if (parseFloat(operation.target) > available) throw new Error(`Insufficient spun yarn. Required: ${operation.target}, Available: ${available}`);
    } else if (operation.stage === 'DYEING') {
      const fabRes = await client.query("SELECT COALESCE(SUM(qty), 0) as total_avail FROM fabric_rolls WHERE order_code = $1 AND section = 'WOVEN_FABRIC'", [operation.order_code]);
      const available = parseFloat(fabRes.rows[0].total_avail);
      if (parseFloat(operation.target) > available) throw new Error(`Insufficient woven fabric. Required: ${operation.target}, Available: ${available}`);
    }

    // 4. Update the operation
    let remainingTarget = 0;
    let currentTarget = parseFloat(operation.target);

    if (autoSplit) {
      const shiftMax = 400; // rough heuristic for 8hrs @ 50/hr
      if (currentTarget > shiftMax) {
        remainingTarget = currentTarget - shiftMax;
        currentTarget = shiftMax;
      }
    }

    await client.query(
      "UPDATE operations SET machine_code = $1, shift = $2, scheduled_date = $3, operators = $4, target = $5 WHERE id = $6",
      [machineId, shift, date, [operator], currentTarget, operationId]
    );

    await client.query(
      "UPDATE machines SET operation_id = $1, order_code = $2 WHERE code = $3",
      [operationId, operation.order_code, machineId]
    );

    // If auto split created remaining target, clone task
    if (remainingTarget > 0) {
       await client.query(
         "INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
         [crypto.randomUUID(), `${operation.code}-SPLIT`, operation.order_code, operation.plan_code, operation.stage, 'PLANNED', remainingTarget, operation.unit]
       );
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Assign machine error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  } finally {
    client.release();
  }
}
