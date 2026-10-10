import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { snakeToCamel } from "@/lib/supabase/adapter";

export async function GET() {
  const [qualityInspectionsRes, reworkEventsRes, rollsRes] = await Promise.all([
    supabase.from("quality_inspections").select("*").order("recorded_at", { ascending: false }),
    supabase.from("rework_events").select("*").order("recorded_at", { ascending: false }),
    supabase.from("fabric_rolls").select("*")
  ]);

  if (qualityInspectionsRes.error || reworkEventsRes.error || rollsRes.error) {
    return NextResponse.json({ success: false, error: "Failed to fetch quality data" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      inspectionEvents: snakeToCamel(qualityInspectionsRes.data),
      reworkEvents: snakeToCamel(reworkEventsRes.data),
      rolls: snakeToCamel(rollsRes.data)
    }
  });
}
