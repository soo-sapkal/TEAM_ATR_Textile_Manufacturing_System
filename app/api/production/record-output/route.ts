import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import Decimal from "decimal.js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { operationId, good, waste, reject, rollQty, actor } = body;

    const { data: operation, error: opErr } = await supabase
      .from("operations")
      .select("*")
      .eq("id", operationId)
      .single();

    if (opErr || !operation) throw new Error("Operation not found");

    const parsedGood = new Decimal(good || 0);
    const parsedWaste = new Decimal(waste || 0);
    const parsedReject = new Decimal(reject || 0);
    
    // Create output event
    const { error: eventErr } = await supabase.from("output_events").insert({
      id: crypto.randomUUID(),
      code: `OUT-EVT-${Math.floor(Date.now() / 1000)}`,
      operation_id: operationId,
      kind: "GOOD",
      quantity: parsedGood.toNumber(),
      unit: operation.unit,
      actor: actor || "System",
      recorded_at: new Date().toISOString()
    });
    
    if (eventErr) throw eventErr;

    if (parsedWaste.gt(0)) {
      await supabase.from("output_events").insert({
        id: crypto.randomUUID(),
        code: `OUT-WST-${Math.floor(Date.now() / 1000)}`,
        operation_id: operationId,
        kind: "WASTE",
        quantity: parsedWaste.toNumber(),
        unit: operation.unit,
        actor: actor || "System",
        recorded_at: new Date().toISOString()
      });
    }

    if (parsedReject.gt(0)) {
      await supabase.from("output_events").insert({
        id: crypto.randomUUID(),
        code: `OUT-REJ-${Math.floor(Date.now() / 1000)}`,
        operation_id: operationId,
        kind: "REJECT",
        quantity: parsedReject.toNumber(),
        unit: operation.unit,
        actor: actor || "System",
        recorded_at: new Date().toISOString()
      });
    }

    // Optionally update operation produced stats if you added columns for that (not strictly required if derived)

    // Handle roll creation if rollQty is provided and operation is WEAVING
    if (rollQty && operation.stage === "WEAVING" && parsedGood.gt(0)) {
      await supabase.from("fabric_rolls").insert({
        id: crypto.randomUUID(),
        code: `ROLL-W-${Math.floor(Math.random() * 10000)}`,
        order_code: operation.order_code,
        product_code: "P-W-FABRIC",
        colour: "Raw",
        dye_lot: "N/A",
        qty: parsedGood.toNumber(),
        unit: "M",
        location: "Finished Goods Bay A",
        status: "PENDING_INSPECTION",
        machine_code: operation.machine_code,
        recorded_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
