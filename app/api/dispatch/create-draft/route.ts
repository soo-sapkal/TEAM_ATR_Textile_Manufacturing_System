import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import Decimal from "decimal.js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderCode, rollIds, vehicle, plannedAt, actor } = body;

    const shipmentId = crypto.randomUUID();
    const shipmentCode = `SHP-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`;

    // 1. Fetch rolls and order
    const [{ data: rollsData, error: rollsErr }, { data: orderData, error: orderErr }] = await Promise.all([
      supabase.from("fabric_rolls").select("*").in("id", rollIds),
      supabase.from("orders").select("*").eq("code", orderCode).single()
    ]);

    if (rollsErr || !rollsData) throw new Error("Failed to fetch rolls");
    if (orderErr || !orderData) throw new Error("Failed to fetch order");

    const totalQty = rollsData.reduce((sum, r) => sum.plus(new Decimal(r.qty || 0)), new Decimal(0));
    const rollsCount = rollsData.length;
    const unit = rollsData[0]?.unit || "M";

    // 2. Insert into shipments as DRAFT
    const { error: shipmentErr } = await supabase.from("shipments").insert({
      id: shipmentId,
      code: shipmentCode,
      order_code: orderCode,
      buyer: orderData.buyer,
      status: "DRAFT",
      rolls: rollsCount,
      qty: totalQty.toNumber(),
      unit: unit,
      vehicle: vehicle,
      planned_at: plannedAt,
    });

    if (shipmentErr) throw shipmentErr;

    // 3. Update fabric_rolls to RESERVED
    const { error: rollUpdateErr } = await supabase
      .from("fabric_rolls")
      .update({
        status: "RESERVED",
        shipment_id: shipmentId,
        shipment_code: shipmentCode
      })
      .in("id", rollIds);

    if (rollUpdateErr) throw rollUpdateErr;

    return NextResponse.json({ success: true, reference: shipmentCode });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
