import { supabase } from "@/lib/supabase/client";
import type { DemoData, Order, YarnItem, YarnBatch, Machine, FabricRoll, Shipment, Operation, YarnMovement, OutputEvent, InspectionEvent, ReworkEvent, DispatchEvent, MachineEvent } from "@/lib/domain/types";

export function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => snakeToCamel(v));
  } else if (obj !== null && typeof obj === "object" && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/([-_][a-z])/g, (group) =>
        group.toUpperCase().replace("-", "").replace("_", "")
      );
      result[camelKey] = snakeToCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export async function fetchSupabaseData(): Promise<Partial<DemoData>> {
  try {
    const [
      ordersRes, machinesRes, rollsRes, shipmentsRes, opsRes, yarnItemsRes, yarnBatchesRes,
      yarnMovementsRes, outputEventsRes, qualityInspectionsRes, reworkEventsRes, dispatchEventsRes, machineEventsRes
    ] = await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("machines").select("*"),
      supabase.from("fabric_rolls").select("*"),
      supabase.from("shipments").select("*"),
      supabase.from("operations").select("*"),
      supabase.from("yarn_items").select("*"),
      supabase.from("yarn_batches").select("*"),
      supabase.from("yarn_movements").select("*"),
      supabase.from("output_events").select("*"),
      supabase.from("quality_inspections").select("*"),
      supabase.from("rework_events").select("*"),
      supabase.from("dispatch_events").select("*"),
      supabase.from("machine_events").select("*"),
    ]);

    return {
      orders: snakeToCamel(ordersRes.data || []) as Order[],
      machines: snakeToCamel(machinesRes.data || []) as Machine[],
      rolls: snakeToCamel(rollsRes.data || []) as FabricRoll[],
      shipments: snakeToCamel(shipmentsRes.data || []) as Shipment[],
      operations: snakeToCamel(opsRes.data || []) as Operation[],
      yarnItems: snakeToCamel(yarnItemsRes.data || []) as YarnItem[],
      yarnBatches: snakeToCamel(yarnBatchesRes.data || []) as YarnBatch[],
      yarnMovements: snakeToCamel(yarnMovementsRes.data || []) as YarnMovement[],
      outputEvents: snakeToCamel(outputEventsRes.data || []) as OutputEvent[],
      inspectionEvents: snakeToCamel(qualityInspectionsRes.data || []) as InspectionEvent[],
      reworkEvents: snakeToCamel(reworkEventsRes.data || []) as ReworkEvent[],
      dispatchEvents: snakeToCamel(dispatchEventsRes.data || []) as DispatchEvent[],
      machineEvents: snakeToCamel(machineEventsRes.data || []) as MachineEvent[],
    };
  } catch (error) {
    console.error("Error fetching data from Supabase:", error);
    return {};
  }
}

export async function createOrderInSupabase(orderData: Partial<Order>) {
  const { data, error } = await supabase.from("orders").insert([orderData]).select().single();
  if (error) throw error;
  return data;
}

export async function updateMachineStatusInSupabase(code: string, status: string) {
  const { data, error } = await supabase.from("machines").update({ status }).eq("code", code).select().single();
  if (error) throw error;
  return data;
}

export async function updateRollStatusInSupabase(code: string, status: string, location?: string) {
  const updateData: Record<string, unknown> = { status };
  if (location) updateData.location = location;
  const { data, error } = await supabase.from("fabric_rolls").update(updateData).eq("code", code).select().single();
  if (error) throw error;
  return data;
}
