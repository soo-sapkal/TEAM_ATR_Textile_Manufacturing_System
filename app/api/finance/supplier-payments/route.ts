import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: Request) {
  const body = await request.json();
  const { billId, amountPaid, paymentMethod, referenceNo } = body;

  if (!billId || !amountPaid || !paymentMethod) {
    return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "Required fields missing" } }, { status: 400 });
  }

  // Insert payment
  const { data: paymentData, error: paymentError } = await supabase
    .from("supplier_payments")
    .insert([{
      bill_id: billId,
      amount_paid: amountPaid,
      payment_method: paymentMethod,
      reference_no: referenceNo || null
    }])
    .select()
    .single();

  if (paymentError) {
    return NextResponse.json({ error: { code: paymentError.code, message: paymentError.message } }, { status: 500 });
  }

  // Recalculate bill status
  const { data: allPayments } = await supabase
    .from("supplier_payments")
    .select("amount_paid")
    .eq("bill_id", billId);

  const totalPaid = allPayments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;

  const { data: bill } = await supabase
    .from("supplier_bills")
    .select("amount_due")
    .eq("id", billId)
    .single();

  if (bill) {
    let newStatus = "PENDING";
    if (totalPaid >= bill.amount_due) {
      newStatus = "PAID";
    } else if (totalPaid > 0) {
      newStatus = "PARTIAL";
    }

    await supabase
      .from("supplier_bills")
      .update({ status: newStatus })
      .eq("id", billId);
  }

  return NextResponse.json({ data: paymentData });
}
