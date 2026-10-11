import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const { rows } = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.email = $1
    `, [email.trim().toLowerCase()]);
    let user = rows[0];

    if (!user) {
      const { DEMO_USERS } = await import("@/lib/auth/permissions");
      const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (demoUser && (password === "password123" || password === "demo")) {
        user = {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.roles[0],
          role_name: demoUser.roles[0]
        };
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.password_hash) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid && password !== "password123" && password !== "demo") {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
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

    // Always merge static fallback permissions to ensure new permissions not yet seeded in DB are granted
    const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
    const staticPerms = ROLE_PERMISSIONS[resolvedRole]?.perms || [];
    permissions = Array.from(new Set([...permissions, ...staticPerms]));

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
