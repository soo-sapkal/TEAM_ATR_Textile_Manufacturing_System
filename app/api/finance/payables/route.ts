import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { snakeToCamel } from "@/lib/supabase/adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: bills, error: billsError } = await supabase
    .from("supplier_bills")
    .select("*")
    .order("created_at", { ascending: false });

  if (billsError) {
    return NextResponse.json({ error: { code: billsError.code, message: billsError.message } }, { status: 500 });
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("supplier_payments")
    .select("*")
    .order("created_at", { ascending: false });

  if (paymentsError) {
    return NextResponse.json({ error: { code: paymentsError.code, message: paymentsError.message } }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      supplierBills: bills.map(snakeToCamel),
      supplierPayments: payments.map(snakeToCamel),
    }
  });
}
