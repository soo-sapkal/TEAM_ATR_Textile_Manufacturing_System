import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { snakeToCamel } from "@/lib/supabase/adapter";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (invoicesError) {
    return NextResponse.json({ error: { code: invoicesError.code, message: invoicesError.message } }, { status: 500 });
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });

  if (paymentsError) {
    return NextResponse.json({ error: { code: paymentsError.code, message: paymentsError.message } }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      invoices: invoices.map(snakeToCamel),
      payments: payments.map(snakeToCamel),
    }
  });
}
