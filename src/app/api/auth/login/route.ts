import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await login(username, password, ip);

    if (!result.success || !result.token) {
      return NextResponse.json(
        { success: false, message: result.error || "Invalid username or password" },
        { status: result.rateLimited ? 429 : 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      username: result.username,
      message: "Login successful",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
