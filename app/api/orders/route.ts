import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Pool } from "pg";
import { verifyToken } from "@/lib/auth/auth";
import { snakeToCamel } from "@/lib/supabase/adapter";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
});

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  
  const payload = await verifyToken(token) as any;
  let permissions = payload?.permissions || [];
  if (permissions.length === 0 && payload?.role) {
    const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
    permissions = ROLE_PERMISSIONS[payload.role]?.perms || [];
  }

  if (!payload || !permissions.includes("orders.read")) {
    return NextResponse.json({ success: false, error: "Forbidden: Requires orders.read permission" }, { status: 403 });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    return NextResponse.json({ success: true, data: snakeToCamel(rows) });
  } catch (error: any) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch orders data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    
    const payload = await verifyToken(token) as any;
    let permissions = payload?.permissions || [];
    if (permissions.length === 0 && payload?.role) {
      const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
      permissions = ROLE_PERMISSIONS[payload.role]?.perms || [];
    }

    if (!payload || !permissions.includes("orders.create")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires orders.create permission" }, { status: 403 });
    }

    const body = await req.json();
    const code = body.code || `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const buyerId = body.buyer.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const revenue = parseFloat(body.quantity) * 250;
    
    const { rows } = await pool.query(`
      INSERT INTO orders (
        code, buyer, buyer_id, product, colour, due, priority, unit, 
        ordered, remaining, status, display_status, currency, revenue
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      code, body.buyer, buyerId, body.product, body.colour, body.due, body.priority || "NORMAL", body.unit || "M",
      parseFloat(body.quantity), parseFloat(body.quantity), "DRAFT", "DRAFT", "INR", revenue
    ]);

    return NextResponse.json({ success: true, data: snakeToCamel(rows[0]) });
  } catch (error: any) {
    console.error("Orders POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
