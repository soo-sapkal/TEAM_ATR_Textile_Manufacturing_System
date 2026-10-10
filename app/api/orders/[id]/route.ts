import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { snakeToCamel } from "@/lib/supabase/adapter";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    
    // Construct updates object by mapping camelCase to snake_case if necessary
    // Here we support explicit keys: status, display_status, stage
    const updates: any = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.displayStatus !== undefined) updates.display_status = body.displayStatus;
    if (body.stage !== undefined) updates.stage = body.stage;
    if (body.revenue !== undefined) updates.revenue = body.revenue;
    if (body.recordedCost !== undefined) updates.recorded_cost = body.recordedCost;
    if (body.estimatedCost !== undefined) updates.estimated_cost = body.estimatedCost;

    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: snakeToCamel(data) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
