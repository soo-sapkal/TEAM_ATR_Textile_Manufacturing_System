import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { machineId, status, reason, actor } = body;

    const { data: machine, error: machineErr } = await supabase
      .from("machines")
      .select("*")
      .eq("id", machineId)
      .single();

    if (machineErr || !machine) throw new Error("Machine not found");

    const { error: updateMachineErr } = await supabase
      .from("machines")
      .update({ status })
      .eq("id", machineId);

    if (updateMachineErr) throw updateMachineErr;

    // Record machine event
    await supabase.from("machine_events").insert({
      id: crypto.randomUUID(),
      machine_code: machine.code,
      event_type: "STATUS_CHANGE",
      description: `Status changed to ${status}. Reason: ${reason || 'N/A'}`,
      downtime_minutes: 0,
      actor: actor || "System",
      recorded_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
