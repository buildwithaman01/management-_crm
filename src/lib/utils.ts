import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Split multi-value string separated by '|' into an array of trimmed strings
 */
export function splitMulti(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Join an array of strings into a '|' separated string
 */
export function joinMulti(values: (string | undefined | null)[]): string {
  if (!values || !Array.isArray(values)) return "";
  return values
    .map((v) => (v ? v.trim() : ""))
    .filter((v) => v.length > 0)
    .join("|");
}

/**
 * Clean phone number to E.164-like standard without spaces, dashes or parens.
 * Returns in format: +919876543210
 */
export function normalizePhone(phone: string, defaultCountryCode = "+91"): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    cleaned = `${defaultCountryCode}${cleaned}`;
  }
  return cleaned;
}

/**
 * For wa.me links use digits only (no +, no spaces) - Section 7.5
 */
export function cleanPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "";
  const normalized = normalizePhone(phone);
  return normalized.replace(/\D/g, "");
}

export function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "";
  return normalizePhone(phone);
}

/**
 * Validate phone number (must be 10 digits for Indian numbers after +91)
 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Default India format check: +91 followed by 10 digits starting with 6-9
  return /^\+91[6-9]\d{9}$/.test(normalized);
}

/**
 * Format date for display in client's timezone (default Asia/Kolkata)
 */
export function formatDate(
  isoDate: string | Date | undefined | null,
  timezone = "Asia/Kolkata",
  includeTime = false
): string {
  if (!isoDate) return "—";
  try {
    const d = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
    if (isNaN(d.getTime())) return "Invalid Date";
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(includeTime
        ? {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        : {}),
    };
    return new Intl.DateTimeFormat("en-IN", options).format(d);
  } catch {
    return String(isoDate);
  }
}

/**
 * Format currency with symbol (default ₹)
 */
export function formatCurrency(amount: number | string | undefined | null, symbol = "₹"): string {
  if (amount === undefined || amount === null || amount === "") return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return `${symbol} ${num.toLocaleString("en-IN")}`;
}

/**
 * Neutralizes formula injection vulnerabilities in CSV exports (Section 11.3)
 * Prefixes cells starting with '=', '+', '-', '@' with an apostrophe.
 */
export function sanitizeCsvFormula(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
