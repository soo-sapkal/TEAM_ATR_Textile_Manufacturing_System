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

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    // Join with yarn_items to return full details
    const { rows } = await pool.query(
      `SELECT b.*, y.code as yarn_code, y.description as yarn_name 
       FROM bill_of_materials b 
       JOIN yarn_items y ON b.yarn_item_id = y.id 
       WHERE b.product_id = $1 
       ORDER BY b.created_at ASC`,
      [id]
    );
    
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUser();
    if (!user || !hasPermission(user.role as string, "master.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { yarn_item_id, quantity_required, unit, notes } = body;

    if (!yarn_item_id || !quantity_required) {
      return NextResponse.json({ error: "Yarn ID and quantity are required" }, { status: 400 });
    }

    const { rows } = await pool.query(
      "INSERT INTO bill_of_materials (product_id, yarn_item_id, quantity_required, unit, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [id, yarn_item_id, quantity_required, unit || 'KG', notes]
    );

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: "This yarn is already in the BOM for this product" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUser();
    if (!user || !hasPermission(user.role as string, "master.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const yarn_item_id = url.searchParams.get("yarn_item_id");
    
    if (!yarn_item_id) {
      return NextResponse.json({ error: "yarn_item_id query param required" }, { status: 400 });
    }

    const { rowCount } = await pool.query(
      "DELETE FROM bill_of_materials WHERE product_id = $1 AND yarn_item_id = $2", 
      [id, yarn_item_id]
    );

    if (rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
