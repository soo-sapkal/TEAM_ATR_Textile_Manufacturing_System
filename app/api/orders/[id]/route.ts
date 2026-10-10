import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { snakeToCamel } from "@/lib/supabase/adapter";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: Record<string, string> = {
      status: "status",
      displayStatus: "display_status",
      stage: "stage",
      revenue: "revenue",
      recordedCost: "recorded_cost",
      estimatedCost: "estimated_cost"
    };

    for (const [key, column] of Object.entries(fields)) {
      if (body[key] !== undefined) {
        setClauses.push(`${column} = $${paramIndex++}`);
        values.push(body[key]);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: true, message: "No updates provided" });
    }

    values.push(id);
    const query = `
      UPDATE orders
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: snakeToCamel(result.rows[0]) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
