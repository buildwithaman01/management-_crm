import { describe, it, expect, beforeEach, vi } from "vitest";
import { TAB_COLUMNS } from "@/lib/google-sheets/schema";
import {
  checkTabHeaders,
  rowToRecord,
  recordToRow,
} from "@/lib/google-sheets/header-mapping";
import {
  sheetCache,
  writeMutex,
  withRetries,
} from "@/lib/google-sheets/cache-and-lock";
import { sanitizeChanges } from "@/lib/activity-log/activity-logger";

describe("Phase 1 — Database Foundation & Header Mapping Tests", () => {
  describe("Header Health Check & Reordering", () => {
    it("passes when all headers match expected columns in order", () => {
      const headers = [...TAB_COLUMNS.Students];
      const result = checkTabHeaders("Students", headers);
      expect(result.ok).toBe(true);
      expect(result.missingHeaders.length).toBe(0);
      expect(result.headerIndexMap.get("student_id")).toBe(0);
    });

    it("passes and builds correct map even when columns are reordered (Section 6.1)", () => {
      // Reversed headers
      const reversed = [...TAB_COLUMNS.Students].reverse();
      const result = checkTabHeaders("Students", reversed);
      expect(result.ok).toBe(true);
      expect(result.missingHeaders.length).toBe(0);
      expect(result.headerIndexMap.get("student_id")).toBe(reversed.length - 1);
    });

    it("detects missing or renamed headers and reports them accurately", () => {
      const brokenHeaders = [...TAB_COLUMNS.Students].filter(
        (h) => h !== "phone" && h !== "lead_status"
      );
      const result = checkTabHeaders("Students", brokenHeaders);
      expect(result.ok).toBe(false);
      expect(result.missingHeaders).toContain("phone");
      expect(result.missingHeaders).toContain("lead_status");
    });

    it("ignores extra unexpected columns added by the owner", () => {
      const extendedHeaders = [...TAB_COLUMNS.Students, "custom_notes_from_owner"];
      const result = checkTabHeaders("Students", extendedHeaders);
      expect(result.ok).toBe(true);
      expect(result.extraHeaders).toContain("custom_notes_from_owner");
    });
  });

  describe("Row Serialization & Deserialization", () => {
    it("maps row values to record keys based on header mapping", () => {
      const headers = ["student_id", "student_name", "phone", "archived"];
      const headerMap = new Map<string, number>();
      headers.forEach((h, i) => headerMap.set(h, i));

      const rowValues = ["STU-2611-ABCD", "Rahul Sharma", "+919876543210", "TRUE"];
      const record = rowToRecord(rowValues, headerMap, "Students");

      expect(record.student_id).toBe("STU-2611-ABCD");
      expect(record.student_name).toBe("Rahul Sharma");
      expect(record.phone).toBe("+919876543210");
      expect(record.archived).toBe(true);
    });

    it("serializes record to row array adhering to actual column positions", () => {
      const headerMap = new Map<string, number>([
        ["phone", 0],
        ["student_id", 1],
        ["student_name", 2],
      ]);

      const record = {
        student_id: "STU-1",
        student_name: "Anita",
        phone: "+919876543210",
      };

      const row = recordToRow(record, headerMap);
      expect(row[0]).toBe("+919876543210");
      expect(row[1]).toBe("STU-1");
      expect(row[2]).toBe("Anita");
    });
  });

  describe("Cache & Concurrency Write Lock", () => {
    beforeEach(() => {
      sheetCache.clear();
    });

    it("caches values and invalidates by prefix", () => {
      sheetCache.set("tab:test-sheet:Students", [{ id: 1 }], 30);
      expect(sheetCache.get("tab:test-sheet:Students")).toBeDefined();

      sheetCache.invalidate("tab:test-sheet:Students");
      expect(sheetCache.get("tab:test-sheet:Students")).toBeNull();
    });

    it("serializes writes using writeMutex to prevent collisions", async () => {
      const executionOrder: number[] = [];

      const p1 = (async () => {
        const release = await writeMutex.acquire("sheet-1");
        await new Promise((r) => setTimeout(r, 30));
        executionOrder.push(1);
        release();
      })();

      const p2 = (async () => {
        const release = await writeMutex.acquire("sheet-1");
        executionOrder.push(2);
        release();
      })();

      await Promise.all([p1, p2]);
      expect(executionOrder).toEqual([1, 2]);
    });

    it("retries on HTTP 429 rate limit with exponential backoff", async () => {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        if (callCount < 3) {
          const err: any = new Error("Rate limit exceeded");
          err.status = 429;
          throw err;
        }
        return "SUCCESS";
      });

      const result = await withRetries(fn, 4, 10);
      expect(result).toBe("SUCCESS");
      expect(callCount).toBe(3);
    });
  });

  describe("Activity Log Sanitization", () => {
    it("redacts sensitive fields like phone, id_number, password from changes", () => {
      const changes: Record<string, [unknown, unknown]> = {
        lead_status: ["NEW", "CONTACTED"],
        phone: ["+919876543210", "+919999999999"],
        id_number: ["123456789012", "999988887777"],
      };

      const sanitizedJson = sanitizeChanges(changes);
      const parsed = JSON.parse(sanitizedJson);

      expect(parsed.lead_status).toEqual(["NEW", "CONTACTED"]);
      expect(parsed.phone).toEqual(["[REDACTED]", "[REDACTED]"]);
      expect(parsed.id_number).toEqual(["[REDACTED]", "[REDACTED]"]);
    });
  });
});
