import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: Request) {
  const body = await request.json();
  const { orderId, buyerName, amountDue, dueDate } = body;

  if (!orderId || !buyerName || amountDue === undefined || !dueDate) {
    return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "Required fields missing" } }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert([{
      order_id: orderId,
      buyer_name: buyerName,
      amount_due: amountDue,
      due_date: dueDate,
      status: "PENDING"
    }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data: data });
}
