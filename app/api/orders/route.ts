import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { snakeToCamel } from "@/lib/supabase/adapter";

export async function GET() {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, data: snakeToCamel(data) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Generate a code if not provided
    const code = body.code || `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    const { data, error } = await supabase.from("orders").insert({
      code,
      buyer: body.buyer,
      buyer_id: body.buyer.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      product: body.product,
      colour: body.colour,
      due: body.due,
      priority: body.priority || "NORMAL",
      unit: body.unit || "M",
      ordered: parseFloat(body.quantity),
      remaining: parseFloat(body.quantity),
      status: "DRAFT",
      display_status: "DRAFT",
      currency: "INR",
      revenue: parseFloat(body.quantity) * 250, // rough dummy calculation
    }).select("*").single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: snakeToCamel(data) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
