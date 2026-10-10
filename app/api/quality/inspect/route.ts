import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rollId, result, defect, reason, location, evidenceCount, actor } = body;

    const { data: roll, error: rollErr } = await supabase
      .from("fabric_rolls")
      .select("*")
      .eq("id", rollId)
      .single();

    if (rollErr || !roll) throw new Error("Roll not found");

    // Update Roll status
    const { error: updateErr } = await supabase
      .from("fabric_rolls")
      .update({
        status: result,
        defect: defect || null,
        location: location || roll.location
      })
      .eq("id", rollId);

    if (updateErr) throw updateErr;

    // Insert inspection event
    await supabase.from("quality_inspections").insert({
      id: crypto.randomUUID(),
      roll_id: rollId,
      result: result,
      defect: defect || null,
      reason: reason || "",
      location: location || roll.location,
      evidence_count: parseInt(evidenceCount || 0),
      actor: actor || "System",
      recorded_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, status: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
