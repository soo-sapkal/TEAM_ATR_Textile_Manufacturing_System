import { supabase } from "@/lib/supabase/client";
import type { DemoData, Order, YarnItem, YarnBatch, Machine, FabricRoll, Shipment, Operation } from "@/lib/domain/types";

export async function fetchSupabaseData(): Promise<Partial<DemoData>> {
  try {
    const [ordersRes, machinesRes, rollsRes, shipmentsRes, opsRes, yarnItemsRes, yarnBatchesRes] = await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("machines").select("*"),
      supabase.from("fabric_rolls").select("*"),
      supabase.from("shipments").select("*"),
      supabase.from("operations").select("*"),
      supabase.from("yarn_items").select("*"),
      supabase.from("yarn_batches").select("*"),
    ]);

    return {
      orders: (ordersRes.data as Order[]) || [],
      machines: (machinesRes.data as Machine[]) || [],
      rolls: (rollsRes.data as FabricRoll[]) || [],
      shipments: (shipmentsRes.data as Shipment[]) || [],
      operations: (opsRes.data as Operation[]) || [],
      yarnItems: (yarnItemsRes.data as YarnItem[]) || [],
      yarnBatches: (yarnBatchesRes.data as YarnBatch[]) || [],
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
