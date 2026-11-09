import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "tb_session";

function getSessionSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return new TextEncoder().encode(
      "tuition-bureau-crm-dev-session-secret-key-32-chars-minimum-hash"
    );
  }
  return new TextEncoder().encode(secret);
}

async function isValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const secret = getSessionSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return Boolean(payload.username || payload.sub);
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminApiRoute = pathname.startsWith("/api/admin");
  const isLoginPage = pathname === "/login";

  const authenticated = await isValidSession(req);

  // 1. If accessing login while already authenticated, redirect to /dashboard
  if (isLoginPage && authenticated) {
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 2. Protect dashboard page routes
  if (isDashboardRoute && !authenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Protect admin API routes
  if (isAdminApiRoute && !authenticated) {
    return NextResponse.json(
      { success: false, message: "Unauthorized. Admin authentication required." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/admin/:path*",
    "/login",
  ],
};
