import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/auth";
import Decimal from "decimal.js";


export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    
    const payload = await verifyToken(token) as any;
    if (!payload || !payload.permissions?.includes("dispatch.confirm")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires dispatch.confirm" }, { status: 403 });
    }

    const body = await req.json();
    const { shipmentId, actor } = body;

    const shipmentRes = await pool.query("SELECT * FROM shipments WHERE id = $1", [shipmentId]);
    const shipment = shipmentRes.rows[0];

    if (!shipment) throw new Error("Shipment not found");
    if (shipment.status === "DISPATCHED") return NextResponse.json({ success: true });

    const rollsRes = await pool.query("SELECT * FROM fabric_rolls WHERE shipment_id = $1", [shipmentId]);
    const rollsData = rollsRes.rows;

    if (!rollsData.length) throw new Error("Failed to fetch rolls");

    const invoice = `INV-2026-${String(Math.floor(40 + Math.random() * 60)).padStart(4, "0")}`;

    await pool.query(
      "UPDATE shipments SET status = $1, invoice = $2 WHERE id = $3",
      ["DISPATCHED", invoice, shipmentId]
    );

    await pool.query(
      "UPDATE fabric_rolls SET status = $1, location = $2 WHERE shipment_id = $3",
      ["DISPATCHED", `In Transit (${shipment.vehicle || 'Unknown'})`, shipmentId]
    );

    const orderRes = await pool.query("SELECT * FROM orders WHERE code = $1", [shipment.order_code]);
    const orderData = orderRes.rows[0];

    if (orderData) {
      const newDispatched = new Decimal(orderData.dispatched || 0).plus(shipment.qty || 0);
      const remaining = Decimal.max(0, new Decimal(orderData.ordered || 0).minus(newDispatched));
      const displayStatus = remaining.eq(0) ? "COMPLETED" : "PARTIALLY_DISPATCHED";

      await pool.query(
        "UPDATE orders SET dispatched = $1, remaining = $2, display_status = $3 WHERE code = $4",
        [newDispatched.toNumber(), remaining.toNumber(), displayStatus, shipment.order_code]
      );
    }

    await pool.query(
      `INSERT INTO dispatch_events (id, code, action, shipment_id, shipment_code, order_code, roll_ids, quantity, unit, actor, recorded_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        crypto.randomUUID(), 
        `EVT-DSP-${Math.floor(Date.now() / 1000)}`, 
        "CONFIRMED", 
        shipmentId, 
        shipment.code, 
        shipment.order_code, 
        JSON.stringify(rollsData.map(r => r.id)), 
        shipment.qty, 
        shipment.unit, 
        actor || payload.name || "System", 
        new Date().toISOString()
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
