import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db/pool";
import { verifyToken } from "@/lib/auth/auth";
import Decimal from "decimal.js";

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
      // 1. Consume from allocated batches for this operation!
      const allocRes = await client.query(
        `SELECT a.*, b.code as batch_code 
         FROM operation_material_allocations a 
         JOIN yarn_batches b ON a.batch_id = b.id 
         WHERE a.operation_id = $1 AND a.status = 'RESERVED' 
         ORDER BY a.created_at ASC 
         FOR UPDATE`,
        [operationId]
      );

      let itemCode = "YRN-COT-40S";
      let totalRemainingToConsume = totalConsumed.toNumber();

      if (allocRes.rows.length > 0) {
        itemCode = allocRes.rows[0].item_code;
        for (const alloc of allocRes.rows) {
          if (totalRemainingToConsume <= 0) break;
          const unconsumed = parseFloat(alloc.allocated_qty) - parseFloat(alloc.consumed_qty);
          const toDeduct = Math.min(unconsumed, totalRemainingToConsume);

          // Deduct physical on-hand and relieve reserved stock
          await client.query(
            "UPDATE yarn_batches SET on_hand = GREATEST(0, on_hand - $1), reserved = GREATEST(0, reserved - $1) WHERE id = $2",
            [toDeduct, alloc.batch_id]
          );

          await client.query(
            "UPDATE yarn_items SET on_hand = GREATEST(0, on_hand - $1), reserved = GREATEST(0, reserved - $1) WHERE code = $2",
            [toDeduct, alloc.item_code]
          );

          const newConsumed = parseFloat(alloc.consumed_qty) + toDeduct;
          const isFullyConsumed = newConsumed >= parseFloat(alloc.allocated_qty) - 0.001;
          await client.query(
            "UPDATE operation_material_allocations SET consumed_qty = $1, status = $2, updated_at = NOW() WHERE id = $3",
            [newConsumed, isFullyConsumed ? 'CONSUMED' : 'RESERVED', alloc.id]
          );

          await client.query(
            `INSERT INTO yarn_movements (id, code, kind, batch_id, batch_code, item_code, quantity, unit, reference, actor)
             VALUES ($1, $2, 'ISSUE', $3, $4, $5, $6, 'KG', $7, $8)`,
            [
              crypto.randomUUID(),
              `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              alloc.batch_id,
              alloc.batch_code,
              alloc.item_code,
              toDeduct,
              `Consumed by operation ${operation.code}`,
              actor || 'Operator'
            ]
          );

          totalRemainingToConsume -= toDeduct;
        }

        // If extra material was consumed beyond allocation (e.g. unexpected waste), deduct from batch
        if (totalRemainingToConsume > 0) {
          const lastAlloc = allocRes.rows[allocRes.rows.length - 1];
          await client.query(
            "UPDATE yarn_batches SET on_hand = GREATEST(0, on_hand - $1) WHERE id = $2",
            [totalRemainingToConsume, lastAlloc.batch_id]
          );
          await client.query(
            "UPDATE yarn_items SET on_hand = GREATEST(0, on_hand - $1) WHERE code = $2",
            [totalRemainingToConsume, lastAlloc.item_code]
          );
        }

        // If operation has reached or exceeded its planned target, release any unused remaining reservation
        const updatedGoodTotal = parseFloat(operation.good) + parsedGood.toNumber();
        if (updatedGoodTotal >= parseFloat(operation.target)) {
          const remainingAllocs = await client.query(
            "SELECT a.*, yb.code as batch_code FROM operation_material_allocations a JOIN yarn_batches yb ON a.batch_id = yb.id WHERE a.operation_id = $1 AND a.status = 'RESERVED' FOR UPDATE",
            [operationId]
          );
          for (const rem of remainingAllocs.rows) {
            const unusedQty = parseFloat(rem.allocated_qty) - parseFloat(rem.consumed_qty);
            if (unusedQty > 0) {
              await client.query(
                "UPDATE yarn_batches SET reserved = GREATEST(0, reserved - $1), available = available + $1 WHERE id = $2",
                [unusedQty, rem.batch_id]
              );
              await client.query(
                "UPDATE yarn_items SET reserved = GREATEST(0, reserved - $1), available = available + $1 WHERE code = $2",
                [unusedQty, rem.item_code]
              );
              await client.query(
                `INSERT INTO yarn_movements (id, code, kind, batch_id, batch_code, item_code, quantity, unit, reference, actor)
                 VALUES ($1, $2, 'REVERSAL', $3, $4, $5, $6, 'KG', $7, $8)`,
                [crypto.randomUUID(), `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`, rem.batch_id, rem.batch_code, rem.item_code, unusedQty, `Unused reservation release for ${operation.code}`, actor || 'System']
              );
            }
            await client.query("UPDATE operation_material_allocations SET status = 'RELEASED' WHERE id = $1", [rem.id]);
          }
        }
      } else {
        // Fallback for legacy operations without prior allocation records:
        // Must resolve BOM yarn item code and consume from matching RAW_YARN batch FIFO
        const bomRes = await client.query(
          `SELECT y.code FROM bill_of_materials b 
           JOIN products p ON b.product_id = p.id 
           JOIN orders o ON (o.product = p.name OR o.product = p.code OR o.product_id = p.id) 
           JOIN yarn_items y ON b.yarn_item_id = y.id 
           WHERE o.code = $1 LIMIT 1`,
          [operation.order_code]
        );
        if (bomRes.rows.length > 0) {
          itemCode = bomRes.rows[0].code;
        } else {
          const firstYarnRes = await client.query("SELECT code FROM yarn_items ORDER BY code ASC LIMIT 1");
          itemCode = firstYarnRes.rows[0]?.code || "YRN-COT-40S";
        }

        const rawYarnRes = await client.query(
          "SELECT * FROM yarn_batches WHERE item_code = $1 AND section = 'RAW_YARN' AND available >= $2 ORDER BY received_at ASC FOR UPDATE LIMIT 1",
          [itemCode, totalConsumed.toNumber()]
        );
        if (rawYarnRes.rows.length > 0) {
          const rawBatch = rawYarnRes.rows[0];
          await client.query(
            "UPDATE yarn_batches SET on_hand = GREATEST(0, on_hand - $1), available = GREATEST(0, available - $1) WHERE id = $2",
            [totalConsumed.toNumber(), rawBatch.id]
          );
          await client.query(
            "UPDATE yarn_items SET on_hand = GREATEST(0, on_hand - $1), available = GREATEST(0, available - $1) WHERE code = $2",
            [totalConsumed.toNumber(), itemCode]
          );
        }
      }

      // Materialize Spun Yarn into spinning storage
      if (parsedGood.gt(0)) {
        await client.query(
          "INSERT INTO yarn_batches (id, code, item_code, supplier, supplier_lot, on_hand, available, unit, location, section, status, order_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
          [
            crypto.randomUUID(),
            `SPUN-${operation.order_code}-${Math.floor(Math.random() * 10000)}`,
            itemCode,
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
      // Consume Spun Yarn from spinning storage (relieving reserved or available stock)
      const spunRes = await client.query(
        "SELECT * FROM yarn_batches WHERE order_code = $1 AND section = 'SPUN_YARN' AND (available + reserved) >= $2 FOR UPDATE LIMIT 1",
        [operation.order_code, totalConsumed.toNumber()]
      );
      if (spunRes.rows.length > 0) {
        const batch = spunRes.rows[0];
        const consumed = totalConsumed.toNumber();
        const reservedDeduct = Math.min(parseFloat(batch.reserved || 0), consumed);
        const availDeduct = consumed - reservedDeduct;
        await client.query(
          "UPDATE yarn_batches SET on_hand = GREATEST(0, on_hand - $1), reserved = GREATEST(0, reserved - $2), available = GREATEST(0, available - $3) WHERE id = $4",
          [consumed, reservedDeduct, availDeduct, batch.id]
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
      // Consume Woven Fabric (relieving reserved roll or available woven fabric)
      const rollRes = await client.query(
        "SELECT * FROM fabric_rolls WHERE order_code = $1 AND section = 'WOVEN_FABRIC' AND status IN ('RESERVED', 'AWAITING_INSPECTION') FOR UPDATE LIMIT 1",
        [operation.order_code]
      );
      if (rollRes.rows.length > 0) {
        const roll = rollRes.rows[0];
        // Move to dyed storage
        await client.query(
          "UPDATE fabric_rolls SET section = 'DYED_FABRIC', status = 'AWAITING_INSPECTION', colour = COALESCE((SELECT colour FROM orders WHERE code = $1), 'Navy Blue') WHERE id = $2",
          [operation.order_code, roll.id]
        );
      } else if (parsedGood.gt(0)) {
        await client.query(
          "INSERT INTO fabric_rolls (id, code, order_code, buyer, qty, unit, colour, location, section, status, machine_code) VALUES ($1, $2, $3, $4, $5, $6, COALESCE((SELECT colour FROM orders WHERE code = $3), 'Navy Blue'), $7, $8, $9, $10)",
          [
            crypto.randomUUID(),
            `ROLL-D-${Math.floor(Math.random() * 10000)}`,
            operation.order_code,
            "Internal",
            parsedGood.toNumber(),
            "M",
            "Dyeing Storage Bay D",
            "DYED_FABRIC",
            "AWAITING_INSPECTION",
            operation.machine_code || "M-UNKNOWN"
          ]
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



