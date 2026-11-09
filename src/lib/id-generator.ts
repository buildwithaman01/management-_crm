/**
 * ID generator adhering to Section 7.4 of the spec:
 * Format: PREFIX-YYMM-XXXX
 * XXXX is 4 random characters from ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no confusing 0, O, 1, I).
 */

const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type IdPrefix = "STU" | "TUT" | "ASN" | "ASG" | "FUP" | "FOL" | "PAY" | "ACT";

export function generateId(prefix: IdPrefix, date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");

  let xxxx = "";
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * ID_CHARS.length);
    xxxx += ID_CHARS[randomIndex];
  }

  return `${prefix}-${yy}${mm}-${xxxx}`;
}

export function isValidId(id: string, prefix?: IdPrefix): boolean {
  const regex = prefix
    ? new RegExp(`^${prefix}-\\d{4}-[A-HJ-NP-Z2-9]{4}$`)
    : /^[A-Z]{3}-\\d{4}-[A-HJ-NP-Z2-9]{4}$/;
  return regex.test(id);
}
