import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db/pool";
import { verifyToken } from "@/lib/auth/auth";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";

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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { rows } = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user || !hasPermission(user.role as string, "master.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, description, category } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    const { rows } = await pool.query(
      "INSERT INTO products (code, name, description, category) VALUES ($1, $2, $3, $4) RETURNING *",
      [code, name, description, category]
    );

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err: any) {
    console.error(err);
    if (err.code === '23505') {
      return NextResponse.json({ error: "Product code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
