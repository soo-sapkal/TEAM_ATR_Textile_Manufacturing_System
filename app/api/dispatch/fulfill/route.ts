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
    if (!payload || !payload.permissions?.includes("dispatch.confirm")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires dispatch.confirm" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      orderCode, 
      rollIds, 
      buyer, 
      vehicle, 
      driverName, 
      licensePlate, 
      transportAgency, 
      ewayBillNumber, 
      plannedAt, 
      invoice, 
      amount, 
      actor 
    } = body;

    const shipmentId = crypto.randomUUID();
    const shipmentCode = `SHP-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`;

    const rollsRes = await pool.query("SELECT * FROM fabric_rolls WHERE id = ANY($1::uuid[])", [rollIds]);
    const rollsData = rollsRes.rows;

    if (!rollsData.length) throw new Error("Failed to fetch rolls");

    const orderRes = await pool.query("SELECT * FROM orders WHERE code = $1", [orderCode]);
    const orderData = orderRes.rows[0];

    if (!orderData) throw new Error("Failed to fetch order");

    const totalQty = rollsData.reduce((sum, r) => sum.plus(new Decimal(r.qty || 0)), new Decimal(0));
    const rollsCount = rollsData.length;
    const unit = rollsData[0]?.unit || "M";

    const ratePerMeter = new Decimal(orderData.revenue || 0).div(new Decimal(orderData.ordered || 1));
    const subtotal = totalQty.mul(ratePerMeter);
    const taxCgst = subtotal.mul(0.025);
    const taxSgst = subtotal.mul(0.025);
    const totalInvoiceAmount = subtotal.plus(taxCgst).plus(taxSgst);

    await pool.query(
      `INSERT INTO shipments (id, code, order_code, buyer, status, rolls, qty, unit, vehicle, driver_name, license_plate, transport_agency, eway_bill_number, planned_at, invoice, amount) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        shipmentId, shipmentCode, orderCode, buyer, "DISPATCHED", rollsCount, totalQty.toNumber(), unit,
        licensePlate || vehicle, driverName, licensePlate, transportAgency, ewayBillNumber, plannedAt, invoice, totalInvoiceAmount.toNumber()
      ]
    );

    await pool.query(
      "UPDATE fabric_rolls SET status = $1, location = $2, shipment_id = $3, shipment_code = $4 WHERE id = ANY($5::uuid[])",
      ["DISPATCHED", `In Transit (${licensePlate || vehicle || 'Unknown'})`, shipmentId, shipmentCode, rollIds]
    );

    // Create Invoice Record
    const invoiceId = crypto.randomUUID();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Net 30 Terms
    
    await pool.query(
      `INSERT INTO invoices (id, code, shipment_id, order_code, buyer_name, subtotal, tax_cgst, tax_sgst, amount_due, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
       [invoiceId, invoice, shipmentId, orderCode, buyer, subtotal.toNumber(), taxCgst.toNumber(), taxSgst.toNumber(), totalInvoiceAmount.toNumber(), dueDate.toISOString().split('T')[0], 'PENDING']
    );

    await pool.query(
      `INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit, unit_rate, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
       [crypto.randomUUID(), invoiceId, `${orderData.product} - ${orderData.colour}`, totalQty.toNumber(), unit, ratePerMeter.toNumber(), subtotal.toNumber()]
    );


    const newDispatched = new Decimal(orderData.dispatched || 0).plus(totalQty);
    const remaining = Decimal.max(0, new Decimal(orderData.ordered || 0).minus(newDispatched));
    const displayStatus = remaining.eq(0) ? "COMPLETED" : "PARTIALLY_DISPATCHED";

    await pool.query(
      "UPDATE orders SET dispatched = $1, remaining = $2, display_status = $3 WHERE code = $4",
      [newDispatched.toNumber(), remaining.toNumber(), displayStatus, orderCode]
    );

    await pool.query(
      `INSERT INTO dispatch_events (id, code, action, shipment_id, shipment_code, order_code, roll_ids, quantity, unit, actor, recorded_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        crypto.randomUUID(), 
        `EVT-DSP-${Math.floor(Date.now() / 1000)}`, 
        "CONFIRMED", 
        shipmentId, 
        shipmentCode, 
        orderCode, 
        JSON.stringify(rollIds), 
        totalQty.toNumber(), 
        unit, 
        actor || payload.name || "System", 
        new Date().toISOString()
      ]
    );

    return NextResponse.json({ success: true, shipment: { id: shipmentId, code: shipmentCode } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
