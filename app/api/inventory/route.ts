import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { snakeToCamel } from "@/lib/supabase/adapter";

export async function GET() {
  const [itemsRes, batchesRes, movementsRes] = await Promise.all([
    supabase.from("yarn_items").select("*").order("code"),
    supabase.from("yarn_batches").select("*").order("received_at", { ascending: false }),
    supabase.from("yarn_movements").select("*").order("recorded_at", { ascending: false })
  ]);

  if (itemsRes.error || batchesRes.error || movementsRes.error) {
    return NextResponse.json({ success: false, error: "Failed to fetch inventory" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      yarnItems: snakeToCamel(itemsRes.data),
      yarnBatches: snakeToCamel(batchesRes.data),
      yarnMovements: snakeToCamel(movementsRes.data)
    }
  });
}
