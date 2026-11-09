import { ActivityLog } from "@/types/entities";
import { generateId } from "@/lib/id-generator";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";

const SENSITIVE_CHANGE_KEYS = new Set([
  "phone",
  "whatsapp",
  "email",
  "id_number",
  "aadhaar",
  "address",
  "password",
  "hash",
]);

const inMemoryLogs: ActivityLog[] = [];

export function getInMemoryActivityLogs(): ActivityLog[] {
  return [...inMemoryLogs];
}

export function clearInMemoryActivityLogs(): void {
  inMemoryLogs.length = 0;
}

/**
 * Filter out sensitive values from changes object before logging
 */
export function sanitizeChanges(
  changes?: Record<string, [unknown, unknown]> | string
): string {
  if (!changes) return "";
  if (typeof changes === "string") return changes;
  if (Object.keys(changes).length === 0) return "";

  const safe: Record<string, [unknown, unknown]> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (SENSITIVE_CHANGE_KEYS.has(key.toLowerCase())) {
      safe[key] = ["[REDACTED]", "[REDACTED]"];
    } else {
      safe[key] = value;
    }
  }

  return JSON.stringify(safe);
}

export async function logActivity(params: {
  adminId: string;
  entityType: ActivityLog["entity_type"];
  entityId: string;
  action: string;
  description: string;
  changes?: Record<string, [unknown, unknown]> | string;
  sheetsAdapter?: GoogleSheetsAdapter;
}): Promise<void> {
  const logEntry: ActivityLog = {
    activity_id: generateId("ACT"),
    timestamp: new Date().toISOString(),
    admin_id: params.adminId || "system",
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    description: params.description,
    changes: sanitizeChanges(params.changes),
  };

  // Always keep in-memory buffer for testing and mock mode
  inMemoryLogs.unshift(logEntry);
  if (inMemoryLogs.length > 500) {
    inMemoryLogs.pop();
  }

  try {
    if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      const adapter = params.sheetsAdapter || new GoogleSheetsAdapter();
      await adapter.appendRecord("ActivityLog", logEntry);
    } else {
      // In development/test without credentials, log to server console
      console.log("[ActivityLog]", JSON.stringify(logEntry));
    }
  } catch (err) {
    // Non-blocking fallback as mandated by Section 6.3:
    // Never lose the main record if ActivityLog fails
    console.error("[ActivityLog Error] Failed to write activity log:", err);
  }
}

export const recordActivity = logActivity;

