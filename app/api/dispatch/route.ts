import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { snakeToCamel } from "@/lib/supabase/adapter";

export async function GET() {
  const [shipmentsRes, eventsRes, rollsRes] = await Promise.all([
    supabase.from("shipments").select("*").order("created_at", { ascending: false }),
    supabase.from("dispatch_events").select("*").order("recorded_at", { ascending: false }),
    supabase.from("fabric_rolls").select("*").order("recorded_at", { ascending: false })
  ]);

  if (shipmentsRes.error || eventsRes.error || rollsRes.error) {
    return NextResponse.json({ success: false, error: "Failed to fetch dispatch data" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      shipments: snakeToCamel(shipmentsRes.data),
      dispatchEvents: snakeToCamel(eventsRes.data),
      rolls: snakeToCamel(rollsRes.data) // Fabric rolls need to be loaded so they can be assigned to shipments
    }
  });
}
