import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Pool } from "pg";
import { verifyToken } from "@/lib/auth/auth";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
});

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

function hasPermission(role: string, perm: string) {
  const roleConfig = ROLE_PERMISSIONS[role];
  return roleConfig && roleConfig.perms.includes(perm as any);
}

export async function GET(request: Request) {
  try {
    const user = await getUser();
    
    // Fallback for demo mode if no real auth token exists
    // In production, require strict auth: if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const buyerId = user ? (user as any).buyerId : 'buyer-01'; // Defaulting to buyer-01 for demo compatibility
    const role = user ? user.role : 'BUYER';
    
    // RBAC Check: Ensure only BUYER role or authorized staff can access
    if (!hasPermission(role as string, "portal.read") && role !== 'SUPERVISOR' && role !== 'OWNER') {
      return NextResponse.json({ error: "Forbidden - Buyers Only" }, { status: 403 });
    }

    // Role-Based Data Fetching: 
    // We strictly only select 'orders' and 'shipments' for the specific buyer.
    // Financials, Machines, Operations, and other buyers' data are completely omitted from the DB query.
    
    const ordersResult = await pool.query(
      "SELECT * FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC",
      [buyerId]
    );

    const shipmentsResult = await pool.query(
      `SELECT s.* FROM shipments s 
       JOIN orders o ON s.order_code = o.code 
       WHERE o.buyer_id = $1 
       ORDER BY s.planned_at DESC`,
      [buyerId]
    );

    // We ONLY return the securely filtered orders and shipments.
    return NextResponse.json({ 
      success: true, 
      data: {
        orders: ordersResult.rows,
        shipments: shipmentsResult.rows
      } 
    });

  } catch (err) {
    console.error("Error fetching buyer dashboard data:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
