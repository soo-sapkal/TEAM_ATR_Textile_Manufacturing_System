import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db/pool";
import { verifyToken } from "@/lib/auth/auth";

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
      return NextResponse.json({ success: false, error: "Forbidden: Requires production.assign permission" }, { status: 403 });
    }

    const body = await req.json();
    const { operationId, machineId, shift, date, operator, actor, autoSplit, target: customTarget } = body;

    if (!operationId) throw new Error("Operation ID is required");
    if (!machineId) throw new Error("Machine is required");
    if (!shift) throw new Error("Shift is required");
    if (!date) throw new Error("Scheduled date is required");
    if (!operator) throw new Error("Operator is required");

    await client.query('BEGIN');

    const opRes = await client.query("SELECT * FROM operations WHERE id = $1 FOR UPDATE", [operationId]);
    const operation = opRes.rows[0];
    if (!operation) throw new Error("Operation not found");

    // 1. Enforce operator skills
    const profRes = await client.query(
      "SELECT skill, name FROM users WHERE name ILIKE $1 || '%' OR name ILIKE '%' || $1 || '%'",
      [operator]
    );
    let operatorSkill = profRes.rows[0]?.skill;

    if (!operatorSkill) {
      const { DEMO_USERS } = await import("@/lib/auth/permissions");
      const demoOp = DEMO_USERS.find(u => u.name.toLowerCase().includes(operator.toLowerCase()));
      if (demoOp) {
        const nameLower = demoOp.name.toLowerCase();
        operatorSkill = (demoOp as any).skill || (nameLower.includes("spinning") ? "SPINNING" : nameLower.includes("weaving") ? "WEAVING" : nameLower.includes("dyeing") ? "DYEING" : "ALL");
      }
    }

    if (!operatorSkill) throw new Error(`Operator profile '${operator}' not found`);
    if (operatorSkill !== "ALL" && operatorSkill !== operation.stage) {
      throw new Error(`Operator skill '${operatorSkill}' is not qualified for stage '${operation.stage}'. Required: ${operation.stage} or ALL.`);
    }

    // 2. Machine suitability & conflict validation
    const machRes = await client.query("SELECT * FROM machines WHERE code = $1 FOR UPDATE", [machineId]);
    const machine = machRes.rows[0];
    if (!machine) throw new Error(`Machine '${machineId}' not found`);
    if (machine.stage !== operation.stage) {
      throw new Error(`Machine '${machineId}' (${machine.stage}) is not qualified for stage '${operation.stage}'`);
    }
    
    // Check conflicts: machine cannot have overlapping active assignments for the same date & shift
    const cleanShift = shift.includes("|") ? shift.split("|")[1].trim() : shift.trim();
    const conflictRes = await client.query(
      `SELECT id, code FROM operations 
       WHERE machine_code = $1 
         AND scheduled_date = $2 
         AND (shift = $3 OR shift LIKE '% | ' || $3) 
         AND id != $4 
         AND status IN ('PLANNED', 'IN_PROGRESS', 'PAUSED')`, 
      [machineId, date, cleanShift, operationId]
    );
    if (conflictRes.rows.length > 0) {
      throw new Error(`Machine '${machineId}' is already booked for task ${conflictRes.rows[0].code} on ${date} (${cleanShift})`);
    }

    // Determine target quantity
    const originalTarget = parseFloat(operation.target);
    let targetToAssign = customTarget !== undefined && customTarget !== null ? parseFloat(customTarget) : originalTarget;
    if (isNaN(targetToAssign) || targetToAssign <= 0) {
      throw new Error("Target quantity must be a positive number");
    }

    // 3. Enforce material availability between stages
    const unit = operation.unit || "KG";

    if (operation.stage === 'SPINNING') {
      // 1. Resolve order and product
      const orderRes = await client.query(
        "SELECT * FROM orders WHERE code = $1",
        [operation.order_code]
      );
      const order = orderRes.rows[0];
      if (!order) {
        throw new Error(`Order '${operation.order_code}' not found for operation '${operation.code}'`);
      }

      // Resolve product ID: either order.product_id or match products by name/code
      let productId = order.product_id;
      if (!productId) {
        const prodRes = await client.query(
          "SELECT id FROM products WHERE name = $1 OR code = $1",
          [order.product]
        );
        if (prodRes.rows.length === 1) {
          productId = prodRes.rows[0].id;
        }
      }

      // Load BOM requirements
      let bomItems: any[] = [];
      if (productId) {
        const bomRes = await client.query(
          `SELECT b.*, y.code as yarn_code, y.description as yarn_name, y.unit as yarn_unit
           FROM bill_of_materials b
           JOIN yarn_items y ON b.yarn_item_id = y.id
           WHERE b.product_id = $1`,
          [productId]
        );
        bomItems = bomRes.rows;
      } else {
        const bomFallback = await client.query(
          `SELECT b.*, y.code as yarn_code, y.description as yarn_name, y.unit as yarn_unit
           FROM bill_of_materials b
           JOIN products p ON b.product_id = p.id
           JOIN yarn_items y ON b.yarn_item_id = y.id
           WHERE p.name = $1 OR p.code = $1`,
          [order.product]
        );
        bomItems = bomFallback.rows;
      }

      if (bomItems.length === 0) {
        throw new Error(`Cannot assign spinning: product '${order.product}' has no Bill of Materials (BOM) configured.`);
      }

      // Calculate total ratio across BOM components
      const totalBomRatio = bomItems.reduce((acc, b) => acc + parseFloat(b.quantity_required), 0);
      if (totalBomRatio <= 0) {
        throw new Error(`Cannot assign spinning: invalid BOM quantity_required for product '${order.product}'`);
      }

      // Release any prior reservations for this operation if re-assigning
      const existingAllocs = await client.query(
        "SELECT a.*, yb.code as batch_code FROM operation_material_allocations a JOIN yarn_batches yb ON a.batch_id = yb.id WHERE a.operation_id = $1 AND a.status = 'RESERVED' FOR UPDATE",
        [operationId]
      );
      for (const alloc of existingAllocs.rows) {
        const relQty = parseFloat(alloc.allocated_qty) - parseFloat(alloc.consumed_qty);
        if (relQty > 0) {
          await client.query(
            "UPDATE yarn_batches SET reserved = GREATEST(0, reserved - $1), available = available + $1 WHERE id = $2",
            [relQty, alloc.batch_id]
          );
          await client.query(
            "UPDATE yarn_items SET reserved = GREATEST(0, reserved - $1), available = available + $1 WHERE code = $2",
            [relQty, alloc.item_code]
          );
          await client.query(
            `INSERT INTO yarn_movements (id, code, kind, batch_id, batch_code, item_code, quantity, unit, reference, actor)
             VALUES ($1, $2, 'REVERSAL', $3, $4, $5, $6, 'KG', $7, $8)`,
            [crypto.randomUUID(), `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`, alloc.batch_id, alloc.batch_code, alloc.item_code, relQty, `Reversal for operation ${operation.code}`, actor || 'Supervisor']
          );
        }
        await client.query("UPDATE operation_material_allocations SET status = 'RELEASED' WHERE id = $1", [alloc.id]);
      }

      // Now validate and reserve each required yarn component individually
      for (const b of bomItems) {
        const itemCode = b.yarn_code;
        const yarnName = b.yarn_name;
        const ratio = parseFloat(b.quantity_required) / totalBomRatio;
        const requiredQty = targetToAssign * ratio;

        const rawRes = await client.query(
          "SELECT COALESCE(SUM(on_hand), 0) as total_on_hand, COALESCE(SUM(available), 0) as total_avail FROM yarn_batches WHERE item_code = $1 AND section = 'RAW_YARN' AND status = 'AVAILABLE'",
          [itemCode]
        );
        const totalOnHand = parseFloat(rawRes.rows[0].total_on_hand);
        const totalAvail = parseFloat(rawRes.rows[0].total_avail);

        if (totalOnHand <= 0) {
          throw new Error(`Cannot assign spinning: no raw yarn available for '${itemCode}' (${yarnName}) in raw material warehouse.`);
        }
        if (totalAvail <= 0) {
          throw new Error(`Cannot assign spinning: all raw yarn for '${itemCode}' (${yarnName}) is already committed/reserved.`);
        }
        if (requiredQty > totalAvail) {
          throw new Error(`Cannot assign spinning: requested target requires ${requiredQty.toFixed(1)} KG of '${itemCode}' (${yarnName}), but only ${totalAvail.toFixed(1)} KG is available in warehouse.`);
        }

        // Atomically reserve batches using FIFO (received_at ASC, id ASC)
        let needed = requiredQty;
        const batches = await client.query(
          "SELECT id, code, item_code, available FROM yarn_batches WHERE item_code = $1 AND section = 'RAW_YARN' AND status = 'AVAILABLE' AND available > 0 ORDER BY received_at ASC, id ASC FOR UPDATE",
          [itemCode]
        );

        for (const batch of batches.rows) {
          if (needed <= 0) break;
          const bAvail = parseFloat(batch.available);
          const toReserve = Math.min(bAvail, needed);

          await client.query(
            "UPDATE yarn_batches SET reserved = reserved + $1, available = available - $1 WHERE id = $2",
            [toReserve, batch.id]
          );

          await client.query(
            "UPDATE yarn_items SET reserved = reserved + $1, available = available - $1 WHERE code = $2",
            [toReserve, itemCode]
          );

          await client.query(
            `INSERT INTO operation_material_allocations (id, operation_id, order_code, batch_id, item_code, allocated_qty, consumed_qty, unit, status)
             VALUES ($1, $2, $3, $4, $5, $6, 0, 'KG', 'RESERVED')`,
            [crypto.randomUUID(), operationId, operation.order_code, batch.id, itemCode, toReserve]
          );

          await client.query(
            `INSERT INTO yarn_movements (id, code, kind, batch_id, batch_code, item_code, quantity, unit, reference, actor)
             VALUES ($1, $2, 'RESERVATION', $3, $4, $5, $6, 'KG', $7, $8)`,
            [
              crypto.randomUUID(),
              `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              batch.id,
              batch.code,
              itemCode,
              toReserve,
              `Reservation for operation ${operation.code}`,
              actor || 'Supervisor'
            ]
          );

          needed -= toReserve;
        }

        if (needed > 0.001) {
          throw new Error(`Cannot assign spinning: unable to lock sufficient batches for '${itemCode}'.`);
        }
      }
    } else if (operation.stage === 'WEAVING') {
      // Must have spun yarn in spinning storage produced for this order
      const spunRes = await client.query(
        "SELECT COALESCE(SUM(on_hand), 0) as total_on_hand, COALESCE(SUM(available), 0) as total_avail FROM yarn_batches WHERE order_code = $1 AND section = 'SPUN_YARN' AND status = 'AVAILABLE'",
        [operation.order_code]
      );
      const totalSpunOnHand = parseFloat(spunRes.rows[0].total_on_hand);
      const totalSpun = parseFloat(spunRes.rows[0].total_avail);

      const committedRes = await client.query(
        `SELECT COALESCE(SUM(GREATEST(0, target - good)), 0) as committed 
         FROM operations 
         WHERE order_code = $1 AND stage = 'WEAVING' AND id != $2 AND status IN ('PLANNED', 'IN_PROGRESS', 'PAUSED') AND machine_code IS NOT NULL`,
        [operation.order_code, operationId]
      );
      const committedSpun = parseFloat(committedRes.rows[0].committed);
      const availableSpun = Math.max(0, totalSpun - committedSpun);

      if (totalSpunOnHand <= 0) {
        throw new Error(`Cannot assign weaving: no spun yarn is available in spinning storage for order ${operation.order_code}. Complete spinning first.`);
      }
      if (totalSpun <= 0 || availableSpun <= 0) {
        throw new Error(`Cannot assign weaving: all spun yarn for order ${operation.order_code} is already committed to active weaving tasks.`);
      }
      if (targetToAssign > availableSpun) {
        throw new Error(`Cannot assign weaving: requested target (${targetToAssign} ${unit}) exceeds available spun yarn in spinning storage (${availableSpun} ${unit}). Available for assignment: ${availableSpun} ${unit}.`);
      }

      // Atomically reserve the spun yarn across batches to prevent double allocation
      let needed = targetToAssign;
      const batches = await client.query(
        "SELECT id, available FROM yarn_batches WHERE order_code = $1 AND section = 'SPUN_YARN' AND status = 'AVAILABLE' AND available > 0 FOR UPDATE",
        [operation.order_code]
      );
      for (const b of batches.rows) {
        if (needed <= 0) break;
        const bAvail = parseFloat(b.available);
        const toReserve = Math.min(bAvail, needed);
        await client.query(
          "UPDATE yarn_batches SET reserved = reserved + $1, available = available - $1 WHERE id = $2",
          [toReserve, b.id]
        );
        needed -= toReserve;
      }
    } else if (operation.stage === 'DYEING') {
      // Must have woven fabric in weaving storage produced for this order
      const fabRes = await client.query(
        "SELECT COALESCE(SUM(qty), 0) as total_rolls, COALESCE(SUM(CASE WHEN status NOT IN ('REJECTED', 'QUARANTINED', 'RESERVED') THEN qty ELSE 0 END), 0) as total_avail FROM fabric_rolls WHERE order_code = $1 AND section = 'WOVEN_FABRIC'",
        [operation.order_code]
      );
      const totalWovenRolls = parseFloat(fabRes.rows[0].total_rolls);
      const totalWoven = parseFloat(fabRes.rows[0].total_avail);

      const committedRes = await client.query(
        `SELECT COALESCE(SUM(GREATEST(0, target - good)), 0) as committed 
         FROM operations 
         WHERE order_code = $1 AND stage = 'DYEING' AND id != $2 AND status IN ('PLANNED', 'IN_PROGRESS', 'PAUSED') AND machine_code IS NOT NULL`,
        [operation.order_code, operationId]
      );
      const committedWoven = parseFloat(committedRes.rows[0].committed);
      const availableWoven = Math.max(0, totalWoven - committedWoven);

      if (totalWovenRolls <= 0) {
        throw new Error(`Cannot assign dyeing: no woven fabric is available in weaving storage for order ${operation.order_code}. Complete weaving first.`);
      }
      if (totalWoven <= 0 || availableWoven <= 0) {
        throw new Error(`Cannot assign dyeing: all woven fabric for order ${operation.order_code} is already committed to active dyeing tasks.`);
      }
      if (targetToAssign > availableWoven) {
        throw new Error(`Cannot assign dyeing: requested target (${targetToAssign} ${unit}) exceeds available woven fabric in weaving storage (${availableWoven} ${unit}). Available for assignment: ${availableWoven} ${unit}.`);
      }

      // Atomically reserve eligible woven rolls
      let neededRollQty = targetToAssign;
      const rolls = await client.query(
        "SELECT id, qty FROM fabric_rolls WHERE order_code = $1 AND section = 'WOVEN_FABRIC' AND status NOT IN ('REJECTED', 'QUARANTINED', 'RESERVED') FOR UPDATE",
        [operation.order_code]
      );
      for (const r of rolls.rows) {
        if (neededRollQty <= 0) break;
        const rQty = parseFloat(r.qty);
        await client.query("UPDATE fabric_rolls SET status = 'RESERVED' WHERE id = $1", [r.id]);
        neededRollQty -= rQty;
      }
    }

    // 4. Partial production and auto-split handling
    let unassignedRemaining = 0;
    if (targetToAssign < originalTarget && !autoSplit) {
      unassignedRemaining = originalTarget - targetToAssign;
    }

    let autoSplitRemaining = 0;
    if (autoSplit) {
      const shiftMax = 400; // 8 hours @ 50 units/hr
      if (targetToAssign > shiftMax) {
        autoSplitRemaining = targetToAssign - shiftMax;
        targetToAssign = shiftMax;
      }
    }

    // Update the operation
    await client.query(
      "UPDATE operations SET machine_code = $1, shift = $2, scheduled_date = $3, operators = $4::jsonb, target = $5, status = 'PLANNED' WHERE id = $6",
      [machineId, cleanShift, date, JSON.stringify([operator]), targetToAssign, operationId]
    );

    // Update machine status to linked operation
    await client.query(
      "UPDATE machines SET operation_id = $1, order_code = $2 WHERE code = $3",
      [operationId, operation.order_code, machineId]
    );

    // If partial target or auto-split left remaining quantity, create an unassigned planned task
    const totalRemaining = unassignedRemaining + autoSplitRemaining;
    if (totalRemaining > 0) {
      await client.query(
        "INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [crypto.randomUUID(), `${operation.code}-REM`, operation.order_code, operation.plan_code, operation.stage, 'PLANNED', totalRemaining, operation.unit]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ 
      success: true, 
      assignedTarget: targetToAssign,
      remainingQuantity: totalRemaining
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Assign machine error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  } finally {
    client.release();
  }
}
