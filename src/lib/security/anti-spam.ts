/**
 * Anti-spam, Rate Limiting, and Bot Protection for Public Forms (Section 10.4)
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipSubmissionTracker = new Map<string, RateLimitRecord>();

/**
 * In-memory rate limiting per IP: max 5 submissions per 10 minutes per form
 */
export function checkRateLimit(
  ip: string,
  formType: "student" | "tutor",
  maxSubmissions = 5,
  windowMs = 10 * 60 * 1000
): { allowed: boolean; remaining: number } {
  const key = `${formType}:${ip || "unknown"}`;
  const now = Date.now();
  const record = ipSubmissionTracker.get(key);

  if (!record || now > record.resetAt) {
    ipSubmissionTracker.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxSubmissions - 1 };
  }

  if (record.count >= maxSubmissions) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxSubmissions - record.count };
}

/**
 * Honeypot check: If the hidden honeypot field has any value, bot detected.
 */
export function checkHoneypot(honeypotValue?: string | null): boolean {
  return typeof honeypotValue === "string" && honeypotValue.trim().length > 0;
}

/**
 * Optional Cloudflare Turnstile token validation
 */
export async function verifyTurnstile(
  token?: string | null,
  ip?: string
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // If not configured, bypass
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip) formData.append("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );
    const data = (await res.json()) as { success: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}
