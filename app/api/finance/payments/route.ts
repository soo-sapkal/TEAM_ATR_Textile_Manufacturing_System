import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: Request) {
  const body = await request.json();
  const { invoiceId, amountPaid, paymentMethod, referenceNo } = body;

  if (!invoiceId || !amountPaid || !paymentMethod) {
    return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "Required fields missing" } }, { status: 400 });
  }

  // Insert payment
  const { data: paymentData, error: paymentError } = await supabase
    .from("payments")
    .insert([{
      invoice_id: invoiceId,
      amount_paid: amountPaid,
      payment_method: paymentMethod,
      reference_no: referenceNo || null
    }])
    .select()
    .single();

  if (paymentError) {
    return NextResponse.json({ error: { code: paymentError.code, message: paymentError.message } }, { status: 500 });
  }

  // Recalculate invoice status
  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount_paid")
    .eq("invoice_id", invoiceId);

  const totalPaid = allPayments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("amount_due")
    .eq("id", invoiceId)
    .single();

  if (invoice) {
    let newStatus = "PENDING";
    if (totalPaid >= invoice.amount_due) {
      newStatus = "PAID";
    } else if (totalPaid > 0) {
      newStatus = "PARTIAL";
    }

    await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoiceId);
  }

  return NextResponse.json({ data: paymentData });
}
