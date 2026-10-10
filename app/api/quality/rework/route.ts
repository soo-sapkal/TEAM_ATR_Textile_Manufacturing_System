import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rollId, action, reason, actor } = body;

    const { data: roll, error: rollErr } = await supabase
      .from("fabric_rolls")
      .select("*")
      .eq("id", rollId)
      .single();

    if (rollErr || !roll) throw new Error("Roll not found");

    let newStatus = roll.status;
    if (action === "start-rework") newStatus = "IN_REWORK";
    if (action === "complete-rework") newStatus = "REINSPECTION_REQUIRED";

    // Update Roll status
    const { error: updateErr } = await supabase
      .from("fabric_rolls")
      .update({ status: newStatus })
      .eq("id", rollId);

    if (updateErr) throw updateErr;

    // Insert rework event
    await supabase.from("rework_events").insert({
      id: crypto.randomUUID(),
      roll_id: rollId,
      action: action,
      reason: reason,
      actor: actor || "System",
      recorded_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
