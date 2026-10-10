import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
});

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const { rows } = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.email = $1
    `, [email.trim().toLowerCase()]);
    const user = rows[0];

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const resolvedRole = user.role_name || user.role || 'GUEST';

    // Fetch permissions from role_permissions
    let permissions: string[] = [];
    if (user.role_id) {
      const permRows = await pool.query(`
        SELECT p.action 
        FROM role_permissions rp 
        JOIN permissions p ON rp.permission_id = p.id 
        WHERE rp.role_id = $1
      `, [user.role_id]);
      permissions = permRows.rows.map(r => r.action);
    }

    if (permissions.length === 0) {
      // Fallback to static permissions if DB permissions are not configured yet
      const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
      permissions = ROLE_PERMISSIONS[resolvedRole] || [];
    }

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: resolvedRole,
      permissions
    });

    const response = NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        roles: [resolvedRole],
        permissions 
      } 
    });
    
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
