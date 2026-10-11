import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db/pool";
import { verifyToken } from "@/lib/auth/auth";

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
    if (!payload || (!permissions.includes("production.execute") && !permissions.includes("machines.operate") && !permissions.includes("production.record_output"))) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires machines.operate or production.execute permission" }, { status: 403 });
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

      // Release unconsumed material reservations
      const allocs = await pool.query(
        "SELECT a.*, yb.code as batch_code FROM operation_material_allocations a JOIN yarn_batches yb ON a.batch_id = yb.id WHERE a.operation_id = $1 AND a.status = 'RESERVED'",
        [operationId]
      );
      for (const a of allocs.rows) {
        const remaining = parseFloat(a.allocated_qty) - parseFloat(a.consumed_qty);
        if (remaining > 0) {
          await pool.query(
            "UPDATE yarn_batches SET reserved = GREATEST(0, reserved - $1), available = available + $1 WHERE id = $2",
            [remaining, a.batch_id]
          );
          await pool.query(
            "UPDATE yarn_items SET reserved = GREATEST(0, reserved - $1), available = available + $1 WHERE code = $2",
            [remaining, a.item_code]
          );
          await pool.query(
            `INSERT INTO yarn_movements (id, code, kind, batch_id, batch_code, item_code, quantity, unit, reference, actor)
             VALUES ($1, $2, 'REVERSAL', $3, $4, $5, $6, 'KG', $7, $8)`,
            [crypto.randomUUID(), `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`, a.batch_id, a.batch_code, a.item_code, remaining, `Cancelled operation ${operation.code}`, actor || 'Supervisor']
          );
        }
        await pool.query("UPDATE operation_material_allocations SET status = 'RELEASED' WHERE id = $1", [a.id]);
      }
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


