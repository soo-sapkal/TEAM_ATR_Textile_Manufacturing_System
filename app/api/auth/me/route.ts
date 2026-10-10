import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json({ user: null });
  }

  // To maintain compatibility with existing types, map role string back to roles array
  return NextResponse.json({
    user: {
      id: (payload as any).id,
      name: (payload as any).name,
      email: (payload as any).email,
      roles: [(payload as any).role],
      permissions: [] // or mock permissions if needed
    }
  });
}
