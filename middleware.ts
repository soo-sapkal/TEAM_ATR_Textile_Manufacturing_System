import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname === "/" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = (payload as any).role;
  const targetRole = pathname.split('/')[1]; // e.g. "supervisor" from "/supervisor/dashboard"

  if (targetRole && ["owner", "supervisor", "operator", "quality", "dispatch", "buyer"].includes(targetRole)) {
    // Only allow if their role matches the folder
    // Note: Operator folder is 'operator', role is 'MACHINE_OPERATOR'
    // Quality folder is 'quality', role is 'QUALITY_INSPECTOR'
    // Dispatch folder is 'dispatch', role is 'DISPATCH_OFFICER'
    const roleMap: Record<string, string> = {
      "OWNER": "owner",
      "SUPERVISOR": "supervisor",
      "MACHINE_OPERATOR": "operator",
      "QUALITY_INSPECTOR": "quality",
      "DISPATCH_OFFICER": "dispatch",
      "BUYER": "buyer"
    };

    if (roleMap[role] !== targetRole) {
      // Prevent access to other roles' pages
      return NextResponse.redirect(new URL(`/${roleMap[role]}/dashboard`, request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-name", (payload as any).name);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
