import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplierName, amountDue, dueDate, referenceBatchId } = body;

    if (!supplierName || amountDue === undefined || !dueDate) {
      return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "Required fields missing" } }, { status: 400 });
    }

    const res = await pool.query(`
      INSERT INTO supplier_bills (supplier_name, amount_due, due_date, reference_batch_id, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
      RETURNING *
    `, [supplierName, amountDue, dueDate, referenceBatchId || null]);

    return NextResponse.json({ data: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  }
}
