import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invoiceId, amountPaid, paymentMethod, referenceNo } = body;

    if (!invoiceId || !amountPaid || !paymentMethod) {
      return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "Required fields missing" } }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insert payment
      const paymentRes = await client.query(`
        INSERT INTO payments (invoice_id, amount_paid, payment_method, reference_no)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [invoiceId, amountPaid, paymentMethod, referenceNo || null]);

      // Recalculate invoice status
      const sumRes = await client.query(
        "SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM payments WHERE invoice_id = $1",
        [invoiceId]
      );
      const totalPaid = Number(sumRes.rows[0].total_paid);

      const invRes = await client.query("SELECT amount_due FROM invoices WHERE id = $1", [invoiceId]);
      if (invRes.rows.length > 0) {
        const amountDue = Number(invRes.rows[0].amount_due);
        let newStatus = "PENDING";
        if (totalPaid >= amountDue) {
          newStatus = "PAID";
        } else if (totalPaid > 0) {
          newStatus = "PARTIAL";
        }

        await client.query("UPDATE invoices SET status = $1 WHERE id = $2", [newStatus, invoiceId]);
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
