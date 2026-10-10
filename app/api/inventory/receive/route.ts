import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supplier, supplierLot, location, orderCode, receivedAt, notes, lines, actor } = body;

    for (const line of lines) {
      const accepted = parseFloat(line.accepted) || 0;
      const held = parseFloat(line.held) || 0;
      const damaged = parseFloat(line.damaged) || 0;
      const putAway = accepted + held;

      if (putAway === 0 && damaged === 0) continue;

      const batchId = crypto.randomUUID();
      const batchCode = `YB-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`;

      // 1. Insert Batch
      const { error: batchErr } = await supabase.from("yarn_batches").insert({
        id: batchId,
        code: batchCode,
        item_code: line.itemCode,
        supplier,
        supplier_lot: supplierLot,
        received_at: new Date(receivedAt).toISOString(),
        on_hand: putAway,
        reserved: 0,
        available: accepted,
        held: held,
        unit: "KG",
        unit_cost: line.unitCost || null,
        location,
        status: held > 0 ? "QUARANTINED" : "AVAILABLE",
        order_code: orderCode || null,
        notes: notes || null
      });

      if (batchErr) throw batchErr;

      // 2. Insert Movement
      const { error: movErr } = await supabase.from("yarn_movements").insert({
        id: crypto.randomUUID(),
        code: `MOV-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`,
        kind: "RECEIPT",
        batch_id: batchId,
        batch_code: batchCode,
        item_code: line.itemCode,
        quantity: putAway,
        unit: "KG",
        reference: `${supplier} - lot ${supplierLot}`,
        actor: actor || "System",
        recorded_at: new Date().toISOString()
      });

      if (movErr) throw movErr;

      // 3. Update Yarn Item (increment available, on_hand, held)
      // Since supabase JS client doesn't support easy increment without RPC, we'll fetch and update
      const { data: itemData, error: fetchErr } = await supabase.from("yarn_items").select("*").eq("code", line.itemCode).single();
      if (!fetchErr && itemData) {
        await supabase.from("yarn_items").update({
          on_hand: parseFloat(itemData.on_hand || 0) + putAway,
          available: parseFloat(itemData.available || 0) + accepted,
          held: parseFloat(itemData.held || 0) + held
        }).eq("code", line.itemCode);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
