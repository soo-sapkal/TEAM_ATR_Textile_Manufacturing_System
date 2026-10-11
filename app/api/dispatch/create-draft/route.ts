import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db/pool";
import { verifyToken } from "@/lib/auth/auth";
import Decimal from "decimal.js";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    
    const payload = await verifyToken(token) as any;
    if (!payload || !payload.permissions?.includes("dispatch.create")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires dispatch.create" }, { status: 403 });
    }

    const body = await req.json();
    const { orderCode, rollIds, vehicle, plannedAt, actor } = body;

    const shipmentId = crypto.randomUUID();
    const shipmentCode = `SHP-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`;

    const rollsRes = await pool.query("SELECT * FROM fabric_rolls WHERE id = ANY($1::uuid[])", [rollIds]);
    const orderRes = await pool.query("SELECT * FROM orders WHERE code = $1", [orderCode]);
    
    const rollsData = rollsRes.rows;
    const orderData = orderRes.rows[0];

    if (!rollsData.length) throw new Error("Failed to fetch rolls");
    if (!orderData) throw new Error("Failed to fetch order");

    const totalQty = rollsData.reduce((sum, r) => sum.plus(new Decimal(r.qty || 0)), new Decimal(0));
    const rollsCount = rollsData.length;
    const unit = rollsData[0]?.unit || "M";

    await pool.query(
      `INSERT INTO shipments (id, code, order_code, buyer, status, rolls, qty, unit, vehicle, planned_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [shipmentId, shipmentCode, orderCode, orderData.buyer, "DRAFT", rollsCount, totalQty.toNumber(), unit, vehicle, plannedAt]
    );

    await pool.query(
      `UPDATE fabric_rolls SET status = $1, shipment_id = $2, shipment_code = $3 WHERE id = ANY($4::uuid[])`,
      ["RESERVED", shipmentId, shipmentCode, rollIds]
    );

    return NextResponse.json({ success: true, reference: shipmentCode });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
