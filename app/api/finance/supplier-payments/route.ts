import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { billId, amountPaid, paymentMethod, referenceNo } = body;

    if (!billId || !amountPaid || !paymentMethod) {
      return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "Required fields missing" } }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insert payment
      const paymentRes = await client.query(`
        INSERT INTO supplier_payments (bill_id, amount_paid, payment_method, reference_no)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [billId, amountPaid, paymentMethod, referenceNo || null]);

      // Recalculate bill status
      const sumRes = await client.query(
        "SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM supplier_payments WHERE bill_id = $1",
        [billId]
      );
      const totalPaid = Number(sumRes.rows[0].total_paid);

      const billRes = await client.query("SELECT amount_due FROM supplier_bills WHERE id = $1", [billId]);
      if (billRes.rows.length > 0) {
        const amountDue = Number(billRes.rows[0].amount_due);
        let newStatus = "PENDING";
        if (totalPaid >= amountDue) {
          newStatus = "PAID";
        } else if (totalPaid > 0) {
          newStatus = "PARTIAL";
        }

        await client.query("UPDATE supplier_bills SET status = $1 WHERE id = $2", [newStatus, billId]);
      }

      await client.query("COMMIT");
      return NextResponse.json({ data: paymentRes.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  }
}
