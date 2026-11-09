import { describe, it, expect, beforeEach } from "vitest";
import { sanitizeCsvFormula } from "@/lib/utils";
import {
  escapeAndSanitizeCsvCell,
  generateCsvForTab,
  createZipBuffer,
  fetchAllTabsData,
  TAB_NAMES,
} from "@/lib/backup/backup-service";
import { GET as backupGetHandler } from "@/app/api/admin/backup/route";
import {
  buildDefaultSettings,
  resetInMemorySettingsStore,
} from "@/lib/settings/settings-service";
import {
  GET as settingsGetHandler,
  POST as settingsPostHandler,
} from "@/app/api/admin/settings/route";
import { GET as activityLogsGetHandler } from "@/app/api/admin/activity-logs/route";
import {
  logActivity,
  getInMemoryActivityLogs,
  clearInMemoryActivityLogs,
} from "@/lib/activity-log/activity-logger";
import { DEFAULT_MATCH_WEIGHTS } from "@/features/matching/matching-engine";
import { TAB_COLUMNS } from "@/lib/google-sheets/schema";
import { NextRequest } from "next/server";

describe("Phase 10 — Settings, Backup & Activity Logs (Sections 21, 23, 28)", () => {
  beforeEach(() => {
    clearInMemoryActivityLogs();
    resetInMemorySettingsStore();
  });

  // =========================================================================
  // 1. CSV Sanitization & Formula Injection Neutralization Tests (Section 11.3)
  // =========================================================================
  describe("CSV Formula Injection Neutralization (sanitizeCsvFormula)", () => {
    it("neutralizes dangerous formula prefixes (=, +, -, @, \\t, \\r)", () => {
      expect(sanitizeCsvFormula("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvFormula("+12345")).toBe("'+12345");
      expect(sanitizeCsvFormula("-COMMAND")).toBe("'-COMMAND");
      expect(sanitizeCsvFormula("@EVIL_URL")).toBe("'@EVIL_URL");
      expect(sanitizeCsvFormula("\tTAB_INJECTION")).toBe("'\tTAB_INJECTION");
      expect(sanitizeCsvFormula("\rRETURN_INJECTION")).toBe("'\rRETURN_INJECTION");
    });

    it("leaves benign text, numbers, and strings unmodified", () => {
      expect(sanitizeCsvFormula("Mathematics")).toBe("Mathematics");
      expect(sanitizeCsvFormula("Class 10")).toBe("Class 10");
      expect(sanitizeCsvFormula("Rahul Sharma")).toBe("Rahul Sharma");
      expect(sanitizeCsvFormula("9876543210")).toBe("9876543210");
      expect(sanitizeCsvFormula("")).toBe("");
      expect(sanitizeCsvFormula(null)).toBe("");
      expect(sanitizeCsvFormula(undefined)).toBe("");
    });

    it("escapeAndSanitizeCsvCell safely escapes CSV delimiter characters while neutralizing formulas", () => {
      // Formula with comma
      const formulaWithComma = '=1+2, "malicious"';
      const escaped = escapeAndSanitizeCsvCell(formulaWithComma);
      expect(escaped).toBe('"\'=1+2, ""malicious"""');

      // Command with DDE payload
      const ddeAttack = '=cmd|\' /C calc\'!A0';
      expect(escapeAndSanitizeCsvCell(ddeAttack)).toBe("'=cmd|' /C calc'!A0");

      // Boolean values
      expect(escapeAndSanitizeCsvCell(true)).toBe("TRUE");
      expect(escapeAndSanitizeCsvCell(false)).toBe("FALSE");

      // Regular string with comma
      expect(escapeAndSanitizeCsvCell("Bhopal, MP")).toBe('"Bhopal, MP"');
    });
  });

  // =========================================================================
  // 2. Tab CSV Generation & Backup Export Tests (Section 25)
  // =========================================================================
  describe("Backup Export & 11 Tabs Generation", () => {
    it("fetchAllTabsData retrieves all 11 tabs specified in the CRM architecture", async () => {
      const { tabs, csvMap } = await fetchAllTabsData();

      // Mandated tabs from schema
      const expectedTabs = [
        "Students",
        "Tutors",
        "Assignments",
        "FollowUps",
        "Payments",
        "ActivityLog",
        "Lookups",
        "LocalityLinks",
        "Settings",
        "MessageTemplates",
        "Meta",
      ];

      for (const tab of expectedTabs) {
        expect(tabs).toHaveProperty(tab);
        expect(Array.isArray(tabs[tab])).toBe(true);
        expect(csvMap).toHaveProperty(tab);
        expect(typeof csvMap[tab]).toBe("string");
      }

      // Also verifies SchemaVersion alias exists
      expect(tabs).toHaveProperty("SchemaVersion");
      expect(csvMap).toHaveProperty("SchemaVersion");
    });

    it("generateCsvForTab formats CSV rows and neutralizes dangerous values in student/tutor records", () => {
      const mockStudents = [
        {
          student_id: "STU-001",
          student_name: "=SUM(A1:B10)", // Malicious name
          parent_name: "+919876543210", // Plus prefix
          phone: "@EVIL_HANDLE",        // At prefix
          lead_status: "-DANGEROUS",     // Minus prefix
          locality: "Arera Colony, Bhopal", // Comma escaping
          archived: false,
        },
      ];

      const csv = generateCsvForTab("Students", mockStudents);
      const lines = csv.split("\r\n");

      // Header row
      expect(lines[0]).toContain("student_id");
      expect(lines[0]).toContain("student_name");
      expect(lines[0]).toContain("phone");

      // Data row with neutralized cells
      const dataRow = lines[1];
      expect(dataRow).toContain("'=SUM(A1:B10)");
      expect(dataRow).toContain("'+919876543210");
      expect(dataRow).toContain("'@EVIL_HANDLE");
      expect(dataRow).toContain("'-DANGEROUS");
      expect(dataRow).toContain('"Arera Colony, Bhopal"');
      expect(dataRow).toContain("FALSE");
    });

    it("createZipBuffer bundles CSV files into a valid ZIP archive", async () => {
      const files = [
        { name: "Students.csv", content: "student_id,name\r\nSTU-1,Aarav" },
        { name: "Tutors.csv", content: "tutor_id,name\r\nTUT-1,Sunil" },
      ];

      const zipBuffer = await createZipBuffer(files);
      expect(zipBuffer).toBeInstanceOf(Buffer);
      expect(zipBuffer.length).toBeGreaterThan(100);

      // Verify PK zip header signature
      expect(zipBuffer[0]).toBe(0x50); // 'P'
      expect(zipBuffer[1]).toBe(0x4b); // 'K'
    });

    it("GET /api/admin/backup supports format=zip and format=json with proper attachment headers", async () => {
      // Test ZIP format
      const zipReq = new NextRequest("http://localhost:3000/api/admin/backup?format=zip");
      const zipRes = await backupGetHandler(zipReq);
      expect(zipRes.status).toBe(200);
      expect(zipRes.headers.get("Content-Type")).toBe("application/zip");
      expect(zipRes.headers.get("Content-Disposition")).toMatch(
        /attachment; filename="tuition-bureau-backup-\d{4}-\d{2}-\d{2}\.zip"/
      );

      // Test JSON format
      const jsonReq = new NextRequest("http://localhost:3000/api/admin/backup?format=json");
      const jsonRes = await backupGetHandler(jsonReq);
      expect(jsonRes.status).toBe(200);
      expect(jsonRes.headers.get("Content-Type")).toBe("application/json");
      expect(jsonRes.headers.get("Content-Disposition")).toMatch(
        /attachment; filename="tuition-bureau-backup-\d{4}-\d{2}-\d{2}\.json"/
      );

      const jsonBody = await jsonRes.json();
      expect(jsonBody.success).toBe(true);
      expect(jsonBody.totalTabs).toBeGreaterThanOrEqual(11);
      expect(jsonBody.tabs).toHaveProperty("Students");
      expect(jsonBody.csv).toHaveProperty("Students");
    });
  });

  // =========================================================================
  // 3. Settings API & Dynamic Matching Weights Validation (Section 23)
  // =========================================================================
  describe("Settings API & Matching Weights (GET & POST /api/admin/settings)", () => {
    it("buildDefaultSettings initializes weights matching the spec exactly", () => {
      const defaults = buildDefaultSettings();

      // Spec Section 16.3 / Section 23 weights
      expect(defaults.matchingWeights.locality).toBe(30);
      expect(defaults.matchingWeights.subject).toBe(25);
      expect(defaults.matchingWeights.class).toBe(10);
      expect(defaults.matchingWeights.board).toBe(10);
      expect(defaults.matchingWeights.fee).toBe(10);
      expect(defaults.matchingWeights.timing).toBe(5);
      expect(defaults.matchingWeights.experience).toBe(5);
      expect(defaults.matchingWeights.freshness).toBe(5);

      const sum =
        defaults.matchingWeights.locality +
        defaults.matchingWeights.subject +
        defaults.matchingWeights.class +
        defaults.matchingWeights.board +
        defaults.matchingWeights.fee +
        defaults.matchingWeights.timing +
        defaults.matchingWeights.experience +
        defaults.matchingWeights.freshness;

      expect(sum).toBe(100);
      expect(defaults.matchingWeights.minScore).toBe(30);
    });

    it("GET /api/admin/settings returns default settings with branding, weights, and tutor fields", async () => {
      const res = await settingsGetHandler();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.settings.branding).toBeDefined();
      expect(data.settings.branding.currency).toBe("INR");
      expect(data.settings.matchingWeights.locality).toBe(30);
      expect(data.settings.tutorFields).toBeDefined();
      expect(data.settings.system.retentionMonths).toBe(24);
    });

    it("POST /api/admin/settings saves updated branding and matching weights", async () => {
      const updatePayload = {
        branding: {
          bureauName: "Central Academy Tuitions",
          city: "Indore",
          phone: "+919111222333",
          supportEmail: "info@centraltuitions.in",
          currency: "INR",
          currencySymbol: "₹",
        },
        matchingWeights: {
          locality: 35,
          subject: 25,
          class: 10,
          board: 10,
          fee: 10,
          timing: 5,
          experience: 5,
          freshness: 0,
          minScore: 35,
        },
      };

      const postReq = new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "POST",
        body: JSON.stringify(updatePayload),
      });

      const postRes = await settingsPostHandler(postReq);
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.success).toBe(true);

      // Verify changes persist in subsequent GET
      const getRes = await settingsGetHandler();
      const getData = await getRes.json();
      expect(getData.settings.branding.bureauName).toBe("Central Academy Tuitions");
      expect(getData.settings.branding.city).toBe("Indore");
      expect(getData.settings.matchingWeights.locality).toBe(35);
      expect(getData.settings.matchingWeights.freshness).toBe(0);
      expect(getData.settings.matchingWeights.minScore).toBe(35);
    });

    it("POST /api/admin/settings rejects invalid weight values (< 0 or > 100)", async () => {
      const invalidWeightReq = new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({
          matchingWeights: {
            locality: 150, // Invalid: exceeds 100
          },
        }),
      });

      const res = await settingsPostHandler(invalidWeightReq);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Weight "locality" must be a number between 0 and 100');
    });

    it("protects locked tutor fields from being disabled", async () => {
      const updatePayload = {
        tutorFields: {
          full_name: { enabled: false, requiredAt: "optional" }, // Locked field
          certifications: { enabled: false, requiredAt: "optional" }, // Optional field
        },
      };

      const postReq = new NextRequest("http://localhost:3000/api/admin/settings", {
        method: "POST",
        body: JSON.stringify(updatePayload),
      });

      const postRes = await settingsPostHandler(postReq);
      expect(postRes.status).toBe(200);

      const getRes = await settingsGetHandler();
      const getData = await getRes.json();

      // full_name is locked -> remains enabled: true
      expect(getData.settings.tutorFields.full_name.enabled).toBe(true);
      expect(getData.settings.tutorFields.full_name.isLocked).toBe(true);

      // certifications is optional -> can be disabled
      expect(getData.settings.tutorFields.certifications.enabled).toBe(false);
    });
  });

  // =========================================================================
  // 4. Activity Logs Audit Trail API Tests (Section 6.3 & 23)
  // =========================================================================
  describe("Activity Logs Audit Trail (GET /api/admin/activity-logs)", () => {
    it("returns newly logged actions in activity logs audit trail", async () => {
      await logActivity({
        adminId: "admin",
        entityType: "SETTINGS",
        entityId: "SYSTEM_SETTINGS",
        action: "UPDATE_MATCHING_WEIGHTS",
        description: "Admin modified locality weight to 35",
      });

      const req = new NextRequest("http://localhost:3000/api/admin/activity-logs?limit=10");
      const res = await activityLogsGetHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.logs.length).toBeGreaterThan(0);

      const found = data.logs.find((l: any) => l.action === "UPDATE_MATCHING_WEIGHTS");
      expect(found).toBeDefined();
      expect(found.description).toBe("Admin modified locality weight to 35");
    });

    it("filters activity logs by entityType", async () => {
      await logActivity({
        adminId: "admin",
        entityType: "SETTINGS",
        entityId: "SYS-1",
        action: "TEST_SETTINGS_ACTION",
        description: "Settings action",
      });

      await logActivity({
        adminId: "admin",
        entityType: "STUDENT",
        entityId: "STU-1",
        action: "TEST_STUDENT_ACTION",
        description: "Student action",
      });

      const req = new NextRequest("http://localhost:3000/api/admin/activity-logs?entityType=SETTINGS");
      const res = await activityLogsGetHandler(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      for (const log of data.logs) {
        expect(log.entity_type).toBe("SETTINGS");
      }
    });
  });
});
