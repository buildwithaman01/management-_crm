import { describe, it, expect, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import {
  createSessionToken,
  verifySessionToken,
  getSessionCookieOptions,
  createSessionCookieHeader,
  createClearSessionCookieHeader,
  extractSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import {
  login,
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
  clearAllRateLimits,
  validateSameOrigin,
  MAX_LOGIN_ATTEMPTS,
  GENERIC_AUTH_ERROR,
  RATE_LIMIT_ERROR,
} from "@/lib/auth/auth-service";
import {
  generateUploadSignature,
  getSignedFileUrl,
  getSignedCdnUrl,
  isAllowedUploadFormat,
  validateFileSize,
  MAX_UPLOAD_SIZE_BYTES,
} from "@/lib/cloudinary/signed-urls";
import { sanitizeCsvFormula } from "@/lib/utils";

describe("Phase 3 — Admin Authentication, Security & Private Cloudinary Tests", () => {
  const originalEnv = { ...process.env };
  const TEST_PASSWORD = "CorrectAdminPassword123!";
  const TEST_USERNAME = "admin";
  let testPasswordHash: string;

  beforeEach(() => {
    testPasswordHash = bcrypt.hashSync(TEST_PASSWORD, 10);
    process.env.ADMIN_USERNAME = TEST_USERNAME;
    process.env.ADMIN_PASSWORD_HASH = testPasswordHash;
    process.env.SESSION_SECRET =
      "test-secret-key-that-is-at-least-32-chars-long-for-hs256";
    process.env.CLOUDINARY_CLOUD_NAME = "test-tuition-bureau";
    process.env.CLOUDINARY_API_KEY = "test-api-key-123456";
    process.env.CLOUDINARY_API_SECRET = "test-api-secret-key-abcdef987654";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    clearAllRateLimits();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    clearAllRateLimits();
  });

  // =========================================================================
  // 1. Session Token & Cookie Tests
  // =========================================================================
  describe("Session Management (session.ts)", () => {
    it("creates and verifies a valid HS256 session token", async () => {
      const token = await createSessionToken(TEST_USERNAME);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // Header.Payload.Signature

      const verified = await verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.username).toBe(TEST_USERNAME);
    });

    it("rejects a tampered session token", async () => {
      const validToken = await createSessionToken(TEST_USERNAME);
      const parts = validToken.split(".");
      
      // Tamper with the payload part
      const tamperedToken = `${parts[0]}.${parts[1]}tampered.${parts[2]}`;
      const result = await verifySessionToken(tamperedToken);
      expect(result).toBeNull();
    });

    it("rejects an expired session token", async () => {
      // Create a token expired 10 seconds ago
      const expiredToken = await createSessionToken(TEST_USERNAME, "-10s");
      const result = await verifySessionToken(expiredToken);
      expect(result).toBeNull();
    });

    it("rejects token signed with an invalid or different secret", async () => {
      const differentSecret = new TextEncoder().encode(
        "another-unrelated-secret-key-32-chars-minimum"
      );
      const foreignToken = await new SignJWT({ username: TEST_USERNAME })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(differentSecret);

      const result = await verifySessionToken(foreignToken);
      expect(result).toBeNull();
    });

    it("rejects empty, null, or malformed token strings", async () => {
      expect(await verifySessionToken("")).toBeNull();
      expect(await verifySessionToken("not-a-jwt")).toBeNull();
      expect(await verifySessionToken(null as any)).toBeNull();
      expect(await verifySessionToken(undefined as any)).toBeNull();
    });

    it("provides cookie options adhering to Section 11.1 (HTTP-only, Secure, SameSite=Lax, 7-day)", () => {
      const options = getSessionCookieOptions();
      expect(options.name).toBe(SESSION_COOKIE_NAME);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe("lax");
      expect(options.maxAge).toBe(SESSION_MAX_AGE_SECONDS);
      expect(options.maxAge).toBe(7 * 24 * 60 * 60); // 7 days
      expect(options.path).toBe("/");
    });

    it("formats correct Set-Cookie and Clear-Cookie headers", () => {
      const setHeader = createSessionCookieHeader("sample.test.token");
      expect(setHeader).toContain(`${SESSION_COOKIE_NAME}=sample.test.token`);
      expect(setHeader).toContain("HttpOnly");
      expect(setHeader).toContain("SameSite=Lax");
      expect(setHeader).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);

      const clearHeader = createClearSessionCookieHeader();
      expect(clearHeader).toContain(`${SESSION_COOKIE_NAME}=;`);
      expect(clearHeader).toContain("Max-Age=0");
    });

    it("extracts session token from cookie headers or requests", () => {
      const cookieStr = `other_cookie=xyz; ${SESSION_COOKIE_NAME}=my-session-jwt; ga=123`;
      const extracted = extractSessionToken(cookieStr);
      expect(extracted).toBe("my-session-jwt");

      expect(extractSessionToken("")).toBeNull();
      expect(extractSessionToken("unrelated=abc")).toBeNull();
    });
  });

  // =========================================================================
  // 2. Admin Authentication Service & Rate Limiting Tests
  // =========================================================================
  describe("Admin Authentication & Rate Limiting (auth-service.ts)", () => {
    it("successfully authenticates with valid credentials", async () => {
      const result = await login(TEST_USERNAME, TEST_PASSWORD, "192.168.1.1");
      expect(result.success).toBe(true);
      expect(result.username).toBe(TEST_USERNAME);
      expect(typeof result.token).toBe("string");

      // Verify returned token is a valid session
      const verified = await verifySessionToken(result.token!);
      expect(verified?.username).toBe(TEST_USERNAME);
    });

    it("rejects invalid password with generic error", async () => {
      const result = await login(TEST_USERNAME, "WrongPassword123!", "192.168.1.2");
      expect(result.success).toBe(false);
      expect(result.error).toBe(GENERIC_AUTH_ERROR);
      expect(result.token).toBeUndefined();
    });

    it("rejects non-existent username with identical generic error to prevent enumeration", async () => {
      const result = await login("intruder", TEST_PASSWORD, "192.168.1.3");
      expect(result.success).toBe(false);
      expect(result.error).toBe(GENERIC_AUTH_ERROR);
      expect(result.token).toBeUndefined();
    });

    it("enforces in-memory rate limiting: blocks after 5 failed attempts within 15 minutes", async () => {
      const testIp = "10.0.0.99";

      // Attempts 1 to 5: All fail with generic error
      for (let i = 1; i <= MAX_LOGIN_ATTEMPTS; i++) {
        const attempt = await login(TEST_USERNAME, "BadPassword", testIp);
        expect(attempt.success).toBe(false);
        expect(attempt.error).toBe(GENERIC_AUTH_ERROR);
      }

      // Attempt 6: Rate limit triggered
      const blockedAttempt = await login(TEST_USERNAME, TEST_PASSWORD, testIp);
      expect(blockedAttempt.success).toBe(false);
      expect(blockedAttempt.rateLimited).toBe(true);
      expect(blockedAttempt.error).toBe(RATE_LIMIT_ERROR);

      // Verify rate limit check directly
      const status = checkLoginRateLimit(testIp);
      expect(status.allowed).toBe(false);
      expect(status.remaining).toBe(0);
    });

    it("rate limiting is IP-scoped: blocking one IP does not block another IP", async () => {
      const badIp = "10.0.0.100";
      const goodIp = "10.0.0.101";

      // Exhaust attempts on badIp
      for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
        await login(TEST_USERNAME, "WrongPassword", badIp);
      }

      expect((await login(TEST_USERNAME, TEST_PASSWORD, badIp)).rateLimited).toBe(true);

      // goodIp can still successfully authenticate
      const goodAttempt = await login(TEST_USERNAME, TEST_PASSWORD, goodIp);
      expect(goodAttempt.success).toBe(true);
      expect(goodAttempt.token).toBeDefined();
    });

    it("successful login resets rate limit counter for that IP", async () => {
      const testIp = "10.0.0.105";

      // 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await login(TEST_USERNAME, "WrongPass", testIp);
      }
      expect(checkLoginRateLimit(testIp).remaining).toBe(2);

      // Succeeded on 4th attempt
      const success = await login(TEST_USERNAME, TEST_PASSWORD, testIp);
      expect(success.success).toBe(true);

      // Counter should be fully reset
      expect(checkLoginRateLimit(testIp).remaining).toBe(MAX_LOGIN_ATTEMPTS);
    });

    it("validates same-origin header to prevent CSRF on state changes (Section 11.2)", () => {
      expect(validateSameOrigin("http://localhost:3000", "http://localhost:3000")).toBe(true);
      expect(validateSameOrigin("https://tuitionbureau.com", "https://tuitionbureau.com")).toBe(true);
      expect(validateSameOrigin("http://attacker-site.com", "http://localhost:3000")).toBe(false);
      expect(validateSameOrigin(null, "http://localhost:3000")).toBe(false);
    });
  });

  // =========================================================================
  // 3. Cloudinary Private Storage & Signed URLs Tests
  // =========================================================================
  describe("Cloudinary Private Signed URLs (signed-urls.ts)", () => {
    it("generates an authenticated upload signature with required parameters", () => {
      const folder = "tutors/sub_2611_ABCD";
      const result = generateUploadSignature(folder);

      expect(result.folder).toBe(folder);
      expect(result.type).toBe("authenticated");
      expect(result.cloudName).toBe("test-tuition-bureau");
      expect(result.apiKey).toBe("test-api-key-123456");
      expect(typeof result.signature).toBe("string");
      expect(result.signature.length).toBeGreaterThan(10);
      expect(result.uploadUrl).toContain("test-tuition-bureau/auto/upload");
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it("generates signed time-limited file URLs with authenticated delivery type and expires timestamp", () => {
      const publicId = "tutors/sub_2611_ABCD/aadhaar_card";
      const expiresInSeconds = 600; // 10 minutes

      const signedUrl = getSignedFileUrl(publicId, expiresInSeconds);

      // Must be an authenticated delivery URL
      expect(signedUrl).toContain("authenticated");

      // Must contain expiration timestamp
      expect(signedUrl).toContain("expires_at=");

      // Must include signature and API key
      expect(signedUrl).toContain("signature=");
      expect(signedUrl).toContain("api_key=test-api-key-123456");

      // Must target the correct public_id
      expect(signedUrl).toContain(encodeURIComponent(publicId).replace(/%2F/g, "%2F"));

      // Verify expiration timestamp is approximately now + expiresInSeconds
      const urlObj = new URL(signedUrl);
      const expiresAtParam = parseInt(urlObj.searchParams.get("expires_at") || "0", 10);
      const expectedMinExpiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds - 5;
      const expectedMaxExpiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds + 5;
      expect(expiresAtParam).toBeGreaterThanOrEqual(expectedMinExpiresAt);
      expect(expiresAtParam).toBeLessThanOrEqual(expectedMaxExpiresAt);
    });

    it("generates signed CDN URLs with auth token", () => {
      const publicId = "tutors/sub_2611_ABCD/profile_photo";
      const cdnUrl = getSignedCdnUrl(publicId, 300);

      expect(cdnUrl).toContain("authenticated");
      expect(cdnUrl).toContain("__cld_token__=exp=");
    });

    it("enforces allowed upload formats (jpg, jpeg, png, pdf) per Section 12", () => {
      expect(isAllowedUploadFormat("photo.jpg")).toBe(true);
      expect(isAllowedUploadFormat("photo.JPEG")).toBe(true);
      expect(isAllowedUploadFormat("aadhaar.png")).toBe(true);
      expect(isAllowedUploadFormat("document.pdf")).toBe(true);

      // Dangerous or forbidden formats
      expect(isAllowedUploadFormat("malicious.exe")).toBe(false);
      expect(isAllowedUploadFormat("script.sh")).toBe(false);
      expect(isAllowedUploadFormat("page.html")).toBe(false);
      expect(isAllowedUploadFormat("payload.js")).toBe(false);
      expect(isAllowedUploadFormat("")).toBe(false);
    });

    it("enforces max file size limit of 5 MB per Section 12", () => {
      expect(validateFileSize(1024)).toBe(true); // 1 KB
      expect(validateFileSize(MAX_UPLOAD_SIZE_BYTES)).toBe(true); // Exactly 5 MB
      expect(validateFileSize(MAX_UPLOAD_SIZE_BYTES + 1)).toBe(false); // 5 MB + 1 byte
      expect(validateFileSize(10 * 1024 * 1024)).toBe(false); // 10 MB
      expect(validateFileSize(0)).toBe(false);
      expect(validateFileSize(-1)).toBe(false);
    });

    it("neutralizes formula injection characters for CSV data exports (Section 11.3 & Section 24)", () => {
      expect(sanitizeCsvFormula("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvFormula("+1234567890")).toBe("'+1234567890");
      expect(sanitizeCsvFormula("-cmd|' /C calc'!A0")).toBe("'-cmd|' /C calc'!A0");
      expect(sanitizeCsvFormula("@malicious_macro")).toBe("'@malicious_macro");
      expect(sanitizeCsvFormula("Normal Safe Text")).toBe("Normal Safe Text");
      expect(sanitizeCsvFormula(null)).toBe("");
      expect(sanitizeCsvFormula(undefined)).toBe("");
    });
  });
});
