import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import Decimal from "decimal.js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shipmentId, actor } = body;

    // 1. Fetch shipment and rolls
    const { data: shipment, error: shipmentErr } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipmentId)
      .single();

    if (shipmentErr || !shipment) throw new Error("Shipment not found");
    if (shipment.status === "DISPATCHED") return NextResponse.json({ success: true });

    const { data: rollsData, error: rollsErr } = await supabase
      .from("fabric_rolls")
      .select("*")
      .eq("shipment_id", shipmentId);

    if (rollsErr || !rollsData) throw new Error("Failed to fetch rolls");

    // Generate pseudo-invoice number for demo
    const invoice = `INV-2026-${String(Math.floor(40 + Math.random() * 60)).padStart(4, "0")}`;

    // 2. Update shipments to DISPATCHED
    const { error: updateShipmentErr } = await supabase
      .from("shipments")
      .update({
        status: "DISPATCHED",
        invoice: invoice
      })
      .eq("id", shipmentId);

    if (updateShipmentErr) throw updateShipmentErr;

    // 3. Update rolls to DISPATCHED
    const { error: rollUpdateErr } = await supabase
      .from("fabric_rolls")
      .update({
        status: "DISPATCHED",
        location: `In Transit (${shipment.vehicle || 'Unknown'})`
      })
      .eq("shipment_id", shipmentId);

    if (rollUpdateErr) throw rollUpdateErr;

    // 4. Update order
    const { data: orderData, error: orderFetchErr } = await supabase
      .from("orders")
      .select("*")
      .eq("code", shipment.order_code)
      .single();

    if (!orderFetchErr && orderData) {
      const newDispatched = new Decimal(orderData.dispatched || 0).plus(shipment.qty || 0);
      const remaining = Decimal.max(0, new Decimal(orderData.ordered || 0).minus(newDispatched));
      const displayStatus = remaining.eq(0) ? "COMPLETED" : "PARTIALLY_DISPATCHED";

      await supabase
        .from("orders")
        .update({
          dispatched: newDispatched.toNumber(),
          remaining: remaining.toNumber(),
          display_status: displayStatus
        })
        .eq("code", shipment.order_code);
    }

    // 5. Insert dispatch event
    await supabase.from("dispatch_events").insert({
      id: crypto.randomUUID(),
      code: `EVT-DSP-${Math.floor(Date.now() / 1000)}`,
      action: "CONFIRMED",
      shipment_id: shipmentId,
      shipment_code: shipment.code,
      order_code: shipment.order_code,
      roll_ids: rollsData.map(r => r.id),
      quantity: shipment.qty,
      unit: shipment.unit,
      actor: actor || "System",
      recorded_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
