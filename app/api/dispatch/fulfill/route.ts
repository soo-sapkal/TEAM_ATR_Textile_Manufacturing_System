import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import Decimal from "decimal.js";

export async function POST(req: Request) {
  try {
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

    // 1. Fetch rolls to calculate total quantity
    const { data: rollsData, error: rollsErr } = await supabase
      .from("fabric_rolls")
      .select("*")
      .in("id", rollIds);

    if (rollsErr || !rollsData) throw new Error("Failed to fetch rolls");

    const totalQty = rollsData.reduce((sum, r) => sum.plus(new Decimal(r.qty || 0)), new Decimal(0));
    const rollsCount = rollsData.length;
    const unit = rollsData[0]?.unit || "M";

    // 2. Insert into shipments
    const { error: shipmentErr } = await supabase.from("shipments").insert({
      id: shipmentId,
      code: shipmentCode,
      order_code: orderCode,
      buyer: buyer,
      status: "DISPATCHED",
      rolls: rollsCount,
      qty: totalQty.toNumber(),
      unit: unit,
      vehicle: licensePlate || vehicle,
      driver_name: driverName,
      license_plate: licensePlate,
      transport_agency: transportAgency,
      eway_bill_number: ewayBillNumber,
      planned_at: plannedAt,
      invoice: invoice,
      amount: parseFloat(amount)
    });

    if (shipmentErr) throw shipmentErr;

    // 3. Update fabric_rolls
    const { error: rollUpdateErr } = await supabase
      .from("fabric_rolls")
      .update({
        status: "DISPATCHED",
        location: `In Transit (${licensePlate})`,
        shipment_id: shipmentId,
        shipment_code: shipmentCode
      })
      .in("id", rollIds);

    if (rollUpdateErr) throw rollUpdateErr;

    // 4. Update order
    const { data: orderData, error: orderFetchErr } = await supabase
      .from("orders")
      .select("*")
      .eq("code", orderCode)
      .single();

    if (orderFetchErr || !orderData) throw new Error("Failed to fetch order");

    const newDispatched = new Decimal(orderData.dispatched || 0).plus(totalQty);
    const remaining = Decimal.max(0, new Decimal(orderData.ordered || 0).minus(newDispatched));
    const displayStatus = remaining.eq(0) ? "COMPLETED" : "PARTIALLY_DISPATCHED";

    const { error: orderUpdateErr } = await supabase
      .from("orders")
      .update({
        dispatched: newDispatched.toNumber(),
        remaining: remaining.toNumber(),
        display_status: displayStatus
      })
      .eq("code", orderCode);

    if (orderUpdateErr) throw orderUpdateErr;

    // 5. Insert dispatch_event
    await supabase.from("dispatch_events").insert({
      id: crypto.randomUUID(),
      code: `EVT-DSP-${Math.floor(Date.now() / 1000)}`,
      action: "CONFIRMED",
      shipment_id: shipmentId,
      shipment_code: shipmentCode,
      order_code: orderCode,
      roll_ids: rollIds,
      quantity: totalQty.toNumber(),
      unit: unit,
      actor: actor || "System",
      recorded_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, shipment: { id: shipmentId, code: shipmentCode } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
