import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { operationId, action, reason, actor } = body;

    const { data: operation, error: opErr } = await supabase
      .from("operations")
      .select("*")
      .eq("id", operationId)
      .single();

    if (opErr || !operation) throw new Error("Operation not found");

    let newState = operation.status;
    let machineState = null;

    if (action === "start") {
      newState = "IN_PROGRESS";
      machineState = "RUNNING";
    } else if (action === "pause") {
      newState = "PAUSED";
      machineState = "IDLE";
    } else if (action === "resume") {
      newState = "IN_PROGRESS";
      machineState = "RUNNING";
    } else if (action === "complete") {
      newState = "COMPLETED";
      machineState = "IDLE";
    } else if (action === "cancel") {
      newState = "CANCELLED";
      machineState = "IDLE";
    }

    // Update Operation
    const { error: updateOpErr } = await supabase
      .from("operations")
      .update({ status: newState })
      .eq("id", operationId);

    if (updateOpErr) throw updateOpErr;

    // Update Machine if assigned
    if (operation.machine_code && machineState) {
      const { error: updateMachineErr } = await supabase
        .from("machines")
        .update({ status: machineState })
        .eq("code", operation.machine_code);
        
      if (updateMachineErr) throw updateMachineErr;
    }

    return NextResponse.json({ success: true, status: newState });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
