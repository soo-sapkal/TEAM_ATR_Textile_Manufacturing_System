import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Pool } from "pg";
import { verifyToken } from "@/lib/auth/auth";
import Decimal from "decimal.js";

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
      permissions = ROLE_PERMISSIONS[payload.role] || [];
    }
    if (!payload || !permissions.includes("production.execute")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires production.execute permission" }, { status: 403 });
    }

    const body = await req.json();
    const { operationId, good, waste, reject, rollQty, actor } = body;

    const opRes = await pool.query("SELECT * FROM operations WHERE id = $1", [operationId]);
    const operation = opRes.rows[0];

    if (!operation) throw new Error("Operation not found");

    const parsedGood = new Decimal(good || 0);
    const parsedWaste = new Decimal(waste || 0);
    const parsedReject = new Decimal(reject || 0);
    
    // Create output event
    await pool.query(
      "INSERT INTO output_events (id, code, operation_id, operation_code, kind, quantity, unit, actor, recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [crypto.randomUUID(), `OUT-EVT-${Math.floor(Date.now() / 1000)}`, operationId,  operation.code, "GOOD", parsedGood.toNumber(), operation.unit, actor || "System", new Date().toISOString()]
    );

    if (parsedWaste.gt(0)) {
      await pool.query(
        "INSERT INTO output_events (id, code, operation_id, operation_code, kind, quantity, unit, actor, recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [crypto.randomUUID(), `OUT-WST-${Math.floor(Date.now() / 1000)}`, operationId,  operation.code, "WASTE", parsedWaste.toNumber(), operation.unit, actor || "System", new Date().toISOString()]
      );
    }

    if (parsedReject.gt(0)) {
      await pool.query(
        "INSERT INTO output_events (id, code, operation_id, operation_code, kind, quantity, unit, actor, recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [crypto.randomUUID(), `OUT-REJ-${Math.floor(Date.now() / 1000)}`, operationId,  operation.code, "REJECT", parsedReject.toNumber(), operation.unit, actor || "System", new Date().toISOString()]
      );
    }

    // Update cumulative operation totals
    await pool.query(
      "UPDATE operations SET good = good + $1, waste = waste + $2, reject = reject + $3 WHERE id = $4",
      [parsedGood.toNumber(), parsedWaste.toNumber(), parsedReject.toNumber(), operationId]
    );

    // Handle roll creation if rollQty is provided and operation is WEAVING
    if (rollQty && operation.stage === "WEAVING" && parsedGood.gt(0)) {
      await pool.query(
        "INSERT INTO fabric_rolls (id, code, order_code, product_code, colour, dye_lot, qty, unit, location, status, machine_code, recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
        [crypto.randomUUID(), `ROLL-W-${Math.floor(Math.random() * 10000)}`, operation.order_code, "P-W-FABRIC", "Raw", "N/A", parsedGood.toNumber(), "M", "Finished Goods Bay A", "PENDING_INSPECTION", operation.machine_code, new Date().toISOString()]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Record output error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}



