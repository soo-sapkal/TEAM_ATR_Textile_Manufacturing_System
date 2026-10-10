import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const { itemCode, delta, reason, actor } = await req.json();

    const amount = parseFloat(delta);
    if (isNaN(amount) || amount === 0) throw new Error("Invalid delta");

    // Fetch the item
    const { data: itemData, error: fetchErr } = await supabase.from("yarn_items").select("*").eq("code", itemCode).single();
    if (fetchErr || !itemData) throw new Error("Yarn item not found");

    const currentOnHand = parseFloat(itemData.on_hand || 0);
    const currentAvailable = parseFloat(itemData.available || 0);

    const newOnHand = currentOnHand + amount;
    const newAvailable = currentAvailable + amount;

    if (newAvailable < 0) throw new Error("Cannot adjust below reserved stock");

    // Update item
    const { error: updateErr } = await supabase.from("yarn_items").update({
      on_hand: newOnHand,
      available: newAvailable
    }).eq("code", itemCode);
    
    if (updateErr) throw updateErr;

    // Create a movement record
    await supabase.from("yarn_movements").insert({
      id: crypto.randomUUID(),
      code: `MOV-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`,
      kind: "ADJUSTMENT",
      item_code: itemCode,
      quantity: amount.toFixed(3),
      unit: itemData.unit,
      reference: reason,
      actor: actor || "System",
      recorded_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
