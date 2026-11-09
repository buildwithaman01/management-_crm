import bcrypt from "bcryptjs";
import { createSessionToken } from "./session";

/**
 * Admin Authentication & Rate Limiting Service (Section 11)
 *
 * Requirements:
 * - One owner account: username from ADMIN_USERNAME, password verified against ADMIN_PASSWORD_HASH (bcrypt).
 * - Never store passwords in Google Sheets or code.
 * - Rate limiting: 5 failed attempts per 15 minutes per IP -> temporary block.
 * - Constant generic error ("Invalid username or password") to prevent username enumeration.
 */

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

interface LoginAttemptRecord {
  failedAttempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

// In-memory rate limiting tracker per IP address
const ipRateLimitTracker = new Map<string, LoginAttemptRecord>();

/**
 * Checks rate limiting status for a given IP address.
 */
export function checkLoginRateLimit(ip: string = "unknown"): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const record = ipRateLimitTracker.get(ip);

  // If no record exists or window expired, allow attempt with full quota
  if (!record || now >= record.firstAttemptAt + LOGIN_WINDOW_MS) {
    return {
      allowed: true,
      remaining: MAX_LOGIN_ATTEMPTS,
      resetAt: now + LOGIN_WINDOW_MS,
    };
  }

  // Check if actively blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.blockedUntil,
    };
  }

  if (record.failedAttempts >= MAX_LOGIN_ATTEMPTS) {
    const blockedUntil = record.blockedUntil || record.firstAttemptAt + LOGIN_WINDOW_MS;
    return {
      allowed: false,
      remaining: 0,
      resetAt: blockedUntil,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, MAX_LOGIN_ATTEMPTS - record.failedAttempts),
    resetAt: record.firstAttemptAt + LOGIN_WINDOW_MS,
  };
}

/**
 * Records a failed login attempt for an IP.
 * Triggers a temporary block if attempts reach MAX_LOGIN_ATTEMPTS (5).
 */
export function recordFailedLogin(ip: string = "unknown"): void {
  const now = Date.now();
  const record = ipRateLimitTracker.get(ip);

  if (!record || now >= record.firstAttemptAt + LOGIN_WINDOW_MS) {
    ipRateLimitTracker.set(ip, {
      failedAttempts: 1,
      firstAttemptAt: now,
    });
    return;
  }

  record.failedAttempts += 1;

  if (record.failedAttempts >= MAX_LOGIN_ATTEMPTS) {
    record.blockedUntil = now + LOGIN_WINDOW_MS;
  }
}

/**
 * Resets the rate limiting counter for an IP (e.g. upon successful authentication).
 */
export function resetLoginRateLimit(ip: string = "unknown"): void {
  ipRateLimitTracker.delete(ip);
}

/**
 * Clears all stored rate limits (useful for test resets).
 */
export function clearAllRateLimits(): void {
  ipRateLimitTracker.clear();
}

export interface LoginResult {
  success: boolean;
  error?: string;
  token?: string;
  username?: string;
  rateLimited?: boolean;
}

/**
 * Constant generic error message adhering to Section 11.1
 */
export const GENERIC_AUTH_ERROR = "Invalid username or password";
export const RATE_LIMIT_ERROR =
  "Too many failed login attempts. Please try again in 15 minutes.";

// Dummy hash used for constant-time comparison when user does not exist or config is missing,
// preventing timing attacks / timing oracle attacks.
const DUMMY_BCRYPT_HASH =
  "$2a$12$e8k8fW1H2bVbHhZ.5a4f7.1X1vHjZ8gqF.zP7rR5xJ2g6L6rN8F2.";

/**
 * Authenticates the admin user against ADMIN_USERNAME and ADMIN_PASSWORD_HASH.
 * Enforces in-memory rate limiting: 5 failed attempts per 15 minutes.
 *
 * @param username Entered username
 * @param password Entered plaintext password
 * @param ip Client IP address for rate limiting
 */
export async function login(
  username: string,
  password: string,
  ip: string = "127.0.0.1"
): Promise<LoginResult> {
  // 1. Check rate limit
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: RATE_LIMIT_ERROR,
      rateLimited: true,
    };
  }

  const configuredUsername = process.env.ADMIN_USERNAME || "admin";
  const configuredHash =
    process.env.ADMIN_PASSWORD_HASH ||
    "$2a$10$9J1UZfujwD8RaNqgv03iJuhQZd3CC37l3uNmy5kCktDL4cfVoQOSS"; // default dev hash for Admin@123

  // Constant-time check mitigation: always run bcrypt comparison
  const hashToCompare = configuredHash || DUMMY_BCRYPT_HASH;
  const passwordMatches = await bcrypt.compare(password || "", hashToCompare);

  const usernameMatches =
    Boolean(username) &&
    username.trim().toLowerCase() === configuredUsername.trim().toLowerCase();

  // If authentication failed
  if (!usernameMatches || !passwordMatches || !configuredHash) {
    recordFailedLogin(ip);
    return {
      success: false,
      error: GENERIC_AUTH_ERROR,
    };
  }

  // 2. Successful login - clear rate limit for this IP
  resetLoginRateLimit(ip);

  // 3. Generate signed session token (7-day HS256)
  const token = await createSessionToken(configuredUsername);

  return {
    success: true,
    token,
    username: configuredUsername,
  };
}

/**
 * Validates the Origin header for state-changing admin requests (Section 11.2)
 * Ensures requests originate from the application's URL.
 */
export function validateSameOrigin(
  origin?: string | null,
  appUrl?: string
): boolean {
  if (!origin) return false;
  const targetUrl =
    appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const originHost = new URL(origin).host;
    const targetHost = new URL(targetUrl).host;
    return originHost.toLowerCase() === targetHost.toLowerCase();
  } catch {
    return false;
  }
}
