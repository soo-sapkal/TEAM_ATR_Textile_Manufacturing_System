import { pool } from "@/lib/db";
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
      pool.query("SELECT * FROM orders"),
      pool.query("SELECT * FROM machines"),
      pool.query("SELECT * FROM fabric_rolls"),
      pool.query("SELECT * FROM shipments"),
      pool.query("SELECT * FROM operations"),
      pool.query("SELECT * FROM yarn_items"),
      pool.query("SELECT * FROM yarn_batches"),
      pool.query("SELECT * FROM yarn_movements"),
      pool.query("SELECT * FROM output_events"),
      pool.query("SELECT * FROM quality_inspections"),
      pool.query("SELECT * FROM rework_events"),
      pool.query("SELECT * FROM dispatch_events"),
      pool.query("SELECT * FROM machine_events"),
    ]);

    return {
      orders: snakeToCamel(ordersRes.rows || []) as Order[],
      machines: snakeToCamel(machinesRes.rows || []) as Machine[],
      rolls: snakeToCamel(rollsRes.rows || []) as FabricRoll[],
      shipments: snakeToCamel(shipmentsRes.rows || []) as Shipment[],
      operations: snakeToCamel(opsRes.rows || []) as Operation[],
      yarnItems: snakeToCamel(yarnItemsRes.rows || []) as YarnItem[],
      yarnBatches: snakeToCamel(yarnBatchesRes.rows || []) as YarnBatch[],
      yarnMovements: snakeToCamel(yarnMovementsRes.rows || []) as YarnMovement[],
      outputEvents: snakeToCamel(outputEventsRes.rows || []) as OutputEvent[],
      inspectionEvents: snakeToCamel(qualityInspectionsRes.rows || []) as InspectionEvent[],
      reworkEvents: snakeToCamel(reworkEventsRes.rows || []) as ReworkEvent[],
      dispatchEvents: snakeToCamel(dispatchEventsRes.rows || []) as DispatchEvent[],
      machineEvents: snakeToCamel(machineEventsRes.rows || []) as MachineEvent[],
    };
  } catch (error) {
    console.error("Error fetching data from PostgreSQL:", error);
    return {};
  }
}

export async function createOrderInSupabase(orderData: Partial<Order>) {
  const keys = Object.keys(orderData);
  const snakeKeys = keys.map(k => k.replace(/([A-Z])/g, "_$1").toLowerCase());
  const values = Object.values(orderData);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

  const query = `
    INSERT INTO orders (${snakeKeys.join(", ")})
    VALUES (${placeholders})
    RETURNING *
  `;
  const res = await pool.query(query, values);
  return snakeToCamel(res.rows[0]);
}

export async function updateMachineStatusInSupabase(code: string, status: string) {
  const res = await pool.query(
    "UPDATE machines SET status = $1 WHERE code = $2 RETURNING *",
    [status, code]
  );
  return snakeToCamel(res.rows[0]);
}

export async function updateRollStatusInSupabase(code: string, status: string, location?: string) {
  let query = "UPDATE fabric_rolls SET status = $1";
  const params: any[] = [status];
  if (location) {
    query += ", location = $2 WHERE code = $3 RETURNING *";
    params.push(location, code);
  } else {
    query += " WHERE code = $2 RETURNING *";
    params.push(code);
  }
  const res = await pool.query(query, params);
  return snakeToCamel(res.rows[0]);
}
