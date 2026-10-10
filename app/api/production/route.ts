import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { snakeToCamel } from "@/lib/supabase/adapter";

export async function GET() {
  const [machinesRes, opsRes, outputEventsRes, machineEventsRes] = await Promise.all([
    supabase.from("machines").select("*"),
    supabase.from("operations").select("*").order("created_at", { ascending: false }),
    supabase.from("output_events").select("*").order("recorded_at", { ascending: false }),
    supabase.from("machine_events").select("*").order("recorded_at", { ascending: false })
  ]);

  if (machinesRes.error || opsRes.error || outputEventsRes.error || machineEventsRes.error) {
    return NextResponse.json({ success: false, error: "Failed to fetch production data" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      machines: snakeToCamel(machinesRes.data),
      operations: snakeToCamel(opsRes.data),
      outputEvents: snakeToCamel(outputEventsRes.data),
      machineEvents: snakeToCamel(machineEventsRes.data)
    }
  });
}
