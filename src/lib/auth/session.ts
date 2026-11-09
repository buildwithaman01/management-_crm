import { SignJWT, jwtVerify } from "jose";

/**
 * Session Security & JWT Configuration (Section 11.1)
 * Uses HS256 with SESSION_SECRET.
 * Sessions expire in 7 days.
 */

export const SESSION_COOKIE_NAME = "tb_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds (604,800)

/**
 * Retrieves the cryptographic key for HS256 signing and verification.
 * In production, strictly requires SESSION_SECRET of suitable length.
 */
function getSessionSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: SESSION_SECRET is not set in environment."
      );
    }
    // Fallback key for test and development environments (minimum 256 bits)
    return new TextEncoder().encode(
      "tuition-bureau-crm-dev-session-secret-key-32-chars-minimum-hash"
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Creates a signed JWT session token for the authenticated admin.
 * Uses HS256 algorithm with 7-day expiration.
 *
 * @param adminUsername Admin username to encode in the token payload
 * @param expiresIn Optional expiration duration (defaults to "7d")
 */
export async function createSessionToken(
  adminUsername: string,
  expiresIn = "7d"
): Promise<string> {
  if (!adminUsername || typeof adminUsername !== "string") {
    throw new Error("Admin username is required to create a session token.");
  }

  const secret = getSessionSecretKey();

  return new SignJWT({ username: adminUsername })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminUsername)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verifies a signed JWT session token.
 * Returns { username: string } on valid, unexpired token.
 * Returns null if the token is tampered, invalid, expired, or missing.
 *
 * @param token JWT string to verify
 */
export async function verifySessionToken(
  token: string
): Promise<{ username: string } | null> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return null;
  }

  try {
    const secret = getSessionSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    const username = (payload.username || payload.sub) as string | undefined;
    if (!username || typeof username !== "string") {
      return null;
    }

    return { username };
  } catch {
    // Gracefully catch JWTExpired, JWSSignatureVerificationFailed, JWSInvalid, etc.
    return null;
  }
}

/**
 * Cookie options adhering to Section 11.1:
 * - HTTP-only: inaccessible to client-side scripts
 * - Secure: true in production (HTTPS only)
 * - SameSite=Lax: protects against CSRF while allowing top-level navigation
 * - Max-Age: 7 days (604,800 seconds)
 */
export interface SessionCookieOptions {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  maxAge: number;
  path: string;
}

/**
 * Returns standard cookie configuration for admin sessions.
 */
export function getSessionCookieOptions(
  overrides?: Partial<SessionCookieOptions>
): SessionCookieOptions {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    ...overrides,
  };
}

/**
 * Builds the Set-Cookie string for setting the session cookie.
 */
export function createSessionCookieHeader(token: string): string {
  const options = getSessionCookieOptions();
  let header = `${options.name}=${token}; Path=${options.path}; Max-Age=${options.maxAge}; HttpOnly; SameSite=Lax`;
  if (options.secure) {
    header += "; Secure";
  }
  return header;
}

/**
 * Builds the Set-Cookie string for clearing the session cookie upon logout.
 */
export function createClearSessionCookieHeader(): string {
  const options = getSessionCookieOptions();
  let header = `${options.name}=; Path=${options.path}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`;
  if (options.secure) {
    header += "; Secure";
  }
  return header;
}

/**
 * Sets the session cookie on a Next.js cookie store (e.g. cookies() from next/headers).
 */
export function setSessionCookie(
  cookieStore: { set: (name: string, value: string, options: any) => void },
  token: string
): void {
  const { name, ...options } = getSessionCookieOptions();
  cookieStore.set(name, token, options);
}

/**
 * Clears the session cookie on a Next.js cookie store (e.g. cookies() from next/headers).
 */
export function clearSessionCookie(
  cookieStore: {
    delete?: (name: string) => void;
    set?: (name: string, value: string, options: any) => void;
  }
): void {
  if (typeof cookieStore.delete === "function") {
    cookieStore.delete(SESSION_COOKIE_NAME);
  } else if (typeof cookieStore.set === "function") {
    const { name, ...options } = getSessionCookieOptions();
    cookieStore.set(name, "", { ...options, maxAge: 0 });
  }
}

/**
 * Extracts the session token from a Cookie header string or Request.
 */
export function extractSessionToken(
  cookieHeaderOrRequest: string | Headers | Request | null | undefined
): string | null {
  if (!cookieHeaderOrRequest) return null;

  let cookieString = "";
  if (typeof cookieHeaderOrRequest === "string") {
    cookieString = cookieHeaderOrRequest;
  } else if ("headers" in cookieHeaderOrRequest && cookieHeaderOrRequest.headers) {
    cookieString = cookieHeaderOrRequest.headers.get("cookie") || "";
  } else if (cookieHeaderOrRequest instanceof Headers) {
    cookieString = cookieHeaderOrRequest.get("cookie") || "";
  }

  if (!cookieString) return null;

  const cookies = cookieString.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      const val = cookie.substring(SESSION_COOKIE_NAME.length + 1);
      return val ? decodeURIComponent(val) : null;
    }
  }

  return null;
}
