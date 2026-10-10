import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, orderCode, buyerName, amountDue, dueDate } = body;

    const finalOrderCode = orderCode || orderId;

    if (!finalOrderCode || !buyerName || amountDue === undefined || !dueDate) {
      return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "Required fields missing" } }, { status: 400 });
    }

    const code = `INV-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`;

    const res = await pool.query(`
      INSERT INTO invoices (code, order_code, buyer_name, amount_due, due_date, status)
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
      RETURNING *
    `, [code, finalOrderCode, buyerName, amountDue, dueDate]);

    return NextResponse.json({ data: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  }
}
