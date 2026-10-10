import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { machineId, category, durationMinutes, reason, actor } = body;

    const { data: machine, error: machineErr } = await supabase
      .from("machines")
      .select("*")
      .eq("id", machineId)
      .single();

    if (machineErr || !machine) throw new Error("Machine not found");

    // Add downtime to machine
    const newDowntime = (machine.downtime_minutes || 0) + parseInt(durationMinutes || 0);

    const { error: updateMachineErr } = await supabase
      .from("machines")
      .update({ downtime_minutes: newDowntime, status: "BREAKDOWN" })
      .eq("id", machineId);

    if (updateMachineErr) throw updateMachineErr;

    // Record machine event
    await supabase.from("machine_events").insert({
      id: crypto.randomUUID(),
      machine_code: machine.code,
      event_type: "DOWNTIME_LOGGED",
      description: `[${category}] ${reason}`,
      downtime_minutes: parseInt(durationMinutes || 0),
      actor: actor || "System",
      recorded_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, downtimeMinutes: newDowntime });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
