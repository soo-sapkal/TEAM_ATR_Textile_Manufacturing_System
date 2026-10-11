import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Pool } from "pg";
import { verifyToken } from "@/lib/auth/auth";
import Decimal from "decimal.js";

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
    if (!payload || !permissions.includes("production.record_output")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires production.record_output permission" }, { status: 403 });
    }

    const body = await req.json();
    const { operationId, good, waste, reject, rollQty, actor, selectedRollId } = body;

    await client.query('BEGIN');

    const opRes = await client.query("SELECT * FROM operations WHERE id = $1 FOR UPDATE", [operationId]);
    const operation = opRes.rows[0];
    if (!operation) throw new Error("Operation not found");

    const parsedGood = new Decimal(good || 0);
    const parsedWaste = new Decimal(waste || 0);
    const parsedReject = new Decimal(reject || 0);
    const totalConsumed = parsedGood.plus(parsedWaste).plus(parsedReject);

    if (parsedGood.lte(0) && parsedWaste.lte(0) && parsedReject.lte(0)) {
      throw new Error("Cannot record empty output");
    }

    // 1. Output Events Logging
    if (parsedGood.gt(0)) {
      await client.query(
        "INSERT INTO output_events (id, code, operation_id, operation_code, kind, quantity, unit, actor, recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [crypto.randomUUID(), `OUT-EVT-${Math.floor(Date.now() / 1000)}`, operationId, operation.code, "GOOD", parsedGood.toNumber(), operation.unit, actor || "System", new Date().toISOString()]
      );
    }
    if (parsedWaste.gt(0)) {
      await client.query(
        "INSERT INTO output_events (id, code, operation_id, operation_code, kind, quantity, unit, actor, recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [crypto.randomUUID(), `OUT-WST-${Math.floor(Date.now() / 1000)}`, operationId, operation.code, "WASTE", parsedWaste.toNumber(), operation.unit, actor || "System", new Date().toISOString()]
      );
    }
    if (parsedReject.gt(0)) {
      await client.query(
        "INSERT INTO output_events (id, code, operation_id, operation_code, kind, quantity, unit, actor, recorded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [crypto.randomUUID(), `OUT-REJ-${Math.floor(Date.now() / 1000)}`, operationId, operation.code, "REJECT", parsedReject.toNumber(), operation.unit, actor || "System", new Date().toISOString()]
      );
    }

    // 2. Cumulative totals on operations
    await client.query(
      "UPDATE operations SET good = good + $1, waste = waste + $2, reject = reject + $3 WHERE id = $4",
      [parsedGood.toNumber(), parsedWaste.toNumber(), parsedReject.toNumber(), operationId]
    );

    // 3. Stage-Specific Material Flow
    if (operation.stage === "SPINNING") {
      // Consume Raw Yarn if available
      const rawYarnRes = await client.query("SELECT * FROM yarn_batches WHERE section = 'RAW_YARN' AND available >= $1 FOR UPDATE LIMIT 1", [totalConsumed.toNumber()]);
      if (rawYarnRes.rows.length > 0) {
        await client.query(
          "UPDATE yarn_batches SET on_hand = on_hand - $1, available = available - $1 WHERE id = $2",
          [totalConsumed.toNumber(), rawYarnRes.rows[0].id]
        );
      }

      // Materialize Spun Yarn into spinning storage
      if (parsedGood.gt(0)) {
        await client.query(
          "INSERT INTO yarn_batches (id, code, item_code, supplier, supplier_lot, on_hand, available, unit, location, section, status, order_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
          [
            crypto.randomUUID(),
            `SPUN-${operation.order_code}-${Math.floor(Math.random() * 10000)}`,
            "Y-COT-30S",
            "In-House Spinning",
            operation.code,
            parsedGood.toNumber(),
            parsedGood.toNumber(),
            "KG",
            "Spinning Storage Bay S",
            "SPUN_YARN",
            "AVAILABLE",
            operation.order_code
          ]
        );
      }
    } else if (operation.stage === "WEAVING") {
      // Consume Spun Yarn from spinning storage
      const spunRes = await client.query(
        "SELECT * FROM yarn_batches WHERE order_code = $1 AND section = 'SPUN_YARN' AND available >= $2 FOR UPDATE LIMIT 1",
        [operation.order_code, totalConsumed.toNumber()]
      );
      if (spunRes.rows.length > 0) {
        await client.query(
          "UPDATE yarn_batches SET on_hand = on_hand - $1, available = available - $1 WHERE id = $2",
          [totalConsumed.toNumber(), spunRes.rows[0].id]
        );
      }

      // Produce Woven Fabric into weaving storage
      if (parsedGood.gt(0)) {
        await client.query(
          "INSERT INTO fabric_rolls (id, code, order_code, buyer, qty, unit, colour, location, section, status, machine_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
          [
            crypto.randomUUID(),
            `ROLL-W-${Math.floor(Math.random() * 10000)}`,
            operation.order_code,
            "Internal",
            parsedGood.toNumber(),
            "M",
            "Raw Greige",
            "Weaving Storage Bay W",
            "WOVEN_FABRIC",
            "AWAITING_INSPECTION",
            operation.machine_code || "M-UNKNOWN"
          ]
        );
      }
    } else if (operation.stage === "DYEING") {
      // Consume Woven Fabric
      const rollRes = await client.query(
        "SELECT * FROM fabric_rolls WHERE order_code = $1 AND section = 'WOVEN_FABRIC' FOR UPDATE LIMIT 1",
        [operation.order_code]
      );
      if (rollRes.rows.length > 0) {
        const roll = rollRes.rows[0];
        // Move to dyed storage
        await client.query(
          "UPDATE fabric_rolls SET section = 'DYED_FABRIC', status = 'AWAITING_INSPECTION', colour = (SELECT colour FROM orders WHERE code = $1) WHERE id = $2",
          [operation.order_code, roll.id]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Record output error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  } finally {
    client.release();
  }
}



