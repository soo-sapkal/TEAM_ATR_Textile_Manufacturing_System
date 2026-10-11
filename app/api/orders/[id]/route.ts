import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { snakeToCamel } from "@/lib/supabase/adapter";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const body = await req.json();
    
    await client.query('BEGIN');

    // 1. Fetch current order
    const orderRes = await client.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [id]);
    const order = orderRes.rows[0];
    if (!order) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.status !== undefined) { updates.push(`status = $${idx++}`); values.push(body.status); }
    if (body.displayStatus !== undefined) { updates.push(`display_status = $${idx++}`); values.push(body.displayStatus); }
    if (body.stage !== undefined) { updates.push(`stage = $${idx++}`); values.push(body.stage); }
    if (body.revenue !== undefined) { updates.push(`revenue = $${idx++}`); values.push(body.revenue); }
    if (body.recordedCost !== undefined) { updates.push(`recorded_cost = $${idx++}`); values.push(body.recordedCost); }
    if (body.estimatedCost !== undefined) { updates.push(`estimated_cost = $${idx++}`); values.push(body.estimatedCost); }
    if (body.productId !== undefined || body.product_id !== undefined) {
      updates.push(`product_id = $${idx++}`);
      values.push(body.productId || body.product_id);
    }

    let updatedOrder = order;
    if (updates.length > 0) {
      values.push(id);
      const updateRes = await client.query(
        `UPDATE orders SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
      );
      updatedOrder = updateRes.rows[0];
    }

    // 2. If released to production ("IN_PRODUCTION" or stage "SPINNING"), generate standard operations if not already created
    const newStatus = body.status || order.status;
    const newStage = body.stage || order.stage;
    if (newStatus === "IN_PRODUCTION" || newStage === "SPINNING") {
      const existingOps = await client.query(
        "SELECT id FROM operations WHERE order_code = $1",
        [order.code]
      );
      if (existingOps.rows.length === 0) {
        // Resolve BOM yield
        let prodId = updatedOrder.product_id;
        if (!prodId) {
          const prodLookup = await client.query("SELECT id FROM products WHERE name = $1 OR code = $1", [order.product]);
          if (prodLookup.rows.length === 1) prodId = prodLookup.rows[0].id;
        }

        const bomRes = await client.query(
          `SELECT COALESCE(SUM(b.quantity_required), 0) as total_ratio 
           FROM bill_of_materials b 
           JOIN products p ON b.product_id = p.id 
           WHERE p.id = $1 OR p.name = $2 OR p.code = $2`,
          [prodId, order.product]
        );
        const bomRatio = parseFloat(bomRes.rows[0]?.total_ratio || 0);
        const orderOrdered = parseFloat(order.ordered || 0);
        const spinTarget = bomRatio > 0 ? orderOrdered * bomRatio : orderOrdered;
        const planCode = `PLN-${order.code}`;

        await client.query(
          `INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit, operators)
           VALUES 
           ($1, $2, $3, $4, 'SPINNING', 'PLANNED', $5, 'KG', '[]'::jsonb),
           ($6, $7, $3, $4, 'WEAVING', 'PLANNED', $8, $9, '[]'::jsonb),
           ($10, $11, $3, $4, 'DYEING', 'PLANNED', $8, $9, '[]'::jsonb)`,
          [
            crypto.randomUUID(), `OP-${order.code}-SPIN`, order.code, planCode, spinTarget,
            crypto.randomUUID(), `OP-${order.code}-WEAV`, orderOrdered, order.unit || 'M',
            crypto.randomUUID(), `OP-${order.code}-DYE`
          ]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, data: snakeToCamel(updatedOrder) });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Order PATCH error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  } finally {
    client.release();
  }
}
