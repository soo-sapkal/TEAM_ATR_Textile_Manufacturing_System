import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: Request) {
  const body = await request.json();
  const { supplierName, amountDue, dueDate, referenceBatchId } = body;

  if (!supplierName || amountDue === undefined || !dueDate) {
    return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "Required fields missing" } }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("supplier_bills")
    .insert([{
      supplier_name: supplierName,
      amount_due: amountDue,
      due_date: dueDate,
      reference_batch_id: referenceBatchId || null,
      status: "PENDING"
    }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data: data });
}
