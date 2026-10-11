import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db/pool";
import { verifyToken } from "@/lib/auth/auth";
import Decimal from "decimal.js";

export async function POST(req: Request) {
  let client;
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

    if (!Array.isArray(rollIds) || rollIds.length === 0) {
      return NextResponse.json({ success: false, error: "Validation failed: No roll IDs provided" }, { status: 400 });
    }
    
    const uniqueRollIds = [...new Set(rollIds)];
    if (uniqueRollIds.length !== rollIds.length) {
      return NextResponse.json({ success: false, error: "Validation failed: Duplicate roll IDs provided" }, { status: 400 });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    // Lock the order for update to prevent concurrent modifications
    const orderRes = await client.query("SELECT * FROM orders WHERE code = $1 FOR UPDATE", [orderCode]);
    const orderData = orderRes.rows[0];

    if (!orderData) {
      throw new Error("Validation failed: Order does not exist");
    }
    if (orderData.status === "CANCELLED") {
      throw new Error("Validation failed: Cannot dispatch a cancelled order");
    }

    // Lock the rolls for update
    const rollsRes = await client.query("SELECT * FROM fabric_rolls WHERE id = ANY($1::uuid[]) FOR UPDATE", [uniqueRollIds]);
    const rollsData = rollsRes.rows;

    if (rollsData.length !== uniqueRollIds.length) {
      throw new Error("Validation failed: One or more requested rolls could not be found");
    }

    // Validate rolls
    for (const roll of rollsData) {
      if (roll.order_code !== orderCode) {
        throw new Error(`Validation failed: Roll ${roll.code} does not belong to order ${orderCode}`);
      }
      if (roll.status !== "ACCEPTED") {
        throw new Error(`Validation failed: Roll ${roll.code} is not eligible for dispatch. Status must be ACCEPTED, but is ${roll.status}`);
      }
      if (roll.section !== "FINISHED_GOODS") {
        throw new Error(`Validation failed: Roll ${roll.code} is not in final goods inventory (finished goods). Current section is ${roll.section}`);
      }
    }

    const totalQty = rollsData.reduce((sum, r) => sum.plus(new Decimal(r.qty || 0)), new Decimal(0));
    const remaining = new Decimal(orderData.remaining || 0);

    if (totalQty.lte(0)) {
      throw new Error("Validation failed: Total dispatch quantity must be greater than zero");
    }
    if (totalQty.gt(remaining)) {
      throw new Error(`Validation failed: Total dispatch quantity (${totalQty.toNumber()}) exceeds remaining order quantity (${remaining.toNumber()})`);
    }

    const rollsCount = rollsData.length;
    const unit = rollsData[0]?.unit || "M";

    const ratePerMeter = new Decimal(orderData.revenue || 0).div(new Decimal(orderData.ordered || 1));
    const subtotal = totalQty.mul(ratePerMeter);
    const taxCgst = subtotal.mul(0.025);
    const taxSgst = subtotal.mul(0.025);
    const totalInvoiceAmount = subtotal.plus(taxCgst).plus(taxSgst);

    const shipmentId = crypto.randomUUID();
    const shipmentCode = `SHP-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`;

    await client.query(
      `INSERT INTO shipments (id, code, order_code, buyer, status, rolls, qty, unit, vehicle, driver_name, license_plate, transport_agency, eway_bill_number, planned_at, invoice, amount) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        shipmentId, shipmentCode, orderCode, buyer, "DISPATCHED", rollsCount, totalQty.toNumber(), unit,
        licensePlate || vehicle, driverName, licensePlate, transportAgency, ewayBillNumber, plannedAt, invoice, totalInvoiceAmount.toNumber()
      ]
    );

    await client.query(
      "UPDATE fabric_rolls SET status = $1, location = $2, shipment_id = $3, shipment_code = $4 WHERE id = ANY($5::uuid[])",
      ["DISPATCHED", `In Transit (${licensePlate || vehicle || 'Unknown'})`, shipmentId, shipmentCode, uniqueRollIds]
    );

    // Create Invoice Record
    const invoiceId = crypto.randomUUID();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Net 30 Terms
    
    await client.query(
      `INSERT INTO invoices (id, code, shipment_id, order_code, buyer_name, subtotal, tax_cgst, tax_sgst, amount_due, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
       [invoiceId, invoice, shipmentId, orderCode, buyer, subtotal.toNumber(), taxCgst.toNumber(), taxSgst.toNumber(), totalInvoiceAmount.toNumber(), dueDate.toISOString().split('T')[0], 'PENDING']
    );

    await client.query(
      `INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit, unit_rate, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
       [crypto.randomUUID(), invoiceId, `${orderData.product} - ${orderData.colour}`, totalQty.toNumber(), unit, ratePerMeter.toNumber(), subtotal.toNumber()]
    );

    const newDispatched = new Decimal(orderData.dispatched || 0).plus(totalQty);
    const newRemaining = remaining.minus(totalQty);
    const displayStatus = newRemaining.eq(0) ? "COMPLETED" : "PARTIALLY_DISPATCHED";

    // Update order. If it's totally done, you could also update status="DISPATCHED" if appropriate.
    // The previous implementation didn't change the main status field, only display_status.
    // Let's preserve that logic, but update status if fully dispatched.
    const mainStatus = newRemaining.eq(0) ? "DISPATCHED" : (orderData.status === "DISPATCHED" ? "DISPATCHED" : "PARTIALLY_DISPATCHED");

    await client.query(
      "UPDATE orders SET dispatched = $1, remaining = $2, display_status = $3, status = $4 WHERE code = $5",
      [newDispatched.toNumber(), newRemaining.toNumber(), displayStatus, mainStatus, orderCode]
    );

    await client.query(
      `INSERT INTO dispatch_events (id, code, action, shipment_id, shipment_code, order_code, roll_ids, quantity, unit, actor, recorded_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        crypto.randomUUID(), 
        `EVT-DSP-${Math.floor(Date.now() / 1000)}`, 
        "CONFIRMED", 
        shipmentId, 
        shipmentCode, 
        orderCode, 
        JSON.stringify(uniqueRollIds), 
        totalQty.toNumber(), 
        unit, 
        actor || payload.name || "System", 
        new Date().toISOString()
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true, shipment: { id: shipmentId, code: shipmentCode } });
  } catch (error: any) {
    if (client) await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  } finally {
    if (client) client.release();
  }
}
