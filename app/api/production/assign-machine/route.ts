import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { operationId, machineId, shift, operator, actor } = body;

    const { data: operation, error: opErr } = await supabase
      .from("operations")
      .select("*")
      .eq("id", operationId)
      .single();

    if (opErr || !operation) throw new Error("Operation not found");

    const { error: updateOpErr } = await supabase
      .from("operations")
      .update({ 
        machine_code: machineId,
        shift: shift,
        operators: [operator]
      })
      .eq("id", operationId);

    if (updateOpErr) throw updateOpErr;

    // Optional: Also update machine to show it's assigned to this operation
    const { error: updateMachineErr } = await supabase
      .from("machines")
      .update({
        operation_id: operationId,
        order_code: operation.order_code
      })
      .eq("code", machineId);
      
    if (updateMachineErr) throw updateMachineErr;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
