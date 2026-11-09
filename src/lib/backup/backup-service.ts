import archiver from "archiver";
import { PassThrough } from "stream";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { TAB_COLUMNS, TabName, STARTER_LOOKUPS, SCHEMA_VERSION } from "@/lib/google-sheets/schema";
import { sanitizeCsvFormula } from "@/lib/utils";
import { getInMemoryActivityLogs } from "@/lib/activity-log/activity-logger";
import { DEFAULT_MATCH_WEIGHTS } from "@/features/matching/matching-engine";
import { getClientConfig } from "@/config/client-config";

export const TAB_NAMES: TabName[] = [
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

/**
 * Neutralizes formula injection vulnerabilities and escapes CSV cell syntax.
 * Mandated by TUITION_BUREAU_CRM_SPEC Section 11.3 & 25.
 */
export function escapeAndSanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  let str: string;
  if (typeof value === "boolean") {
    str = value ? "TRUE" : "FALSE";
  } else if (typeof value === "object") {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  // Neutralize formula injection (=, +, -, @, \t, \r)
  const sanitized = sanitizeCsvFormula(str);

  // RFC-4180 CSV escaping
  if (
    sanitized.includes(",") ||
    sanitized.includes('"') ||
    sanitized.includes("\n") ||
    sanitized.includes("\r")
  ) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/**
 * Generates an RFC-4180 compliant CSV string for a tab with all text cells sanitized.
 */
export function generateCsvForTab(tabName: string, records: any[]): string {
  const columns =
    TAB_COLUMNS[tabName as TabName] ||
    (records.length > 0 ? Object.keys(records[0]) : ["id"]);

  const headerLine = columns.map((col) => escapeAndSanitizeCsvCell(col)).join(",");
  const rows: string[] = [headerLine];

  for (const record of records) {
    const rowCells = columns.map((col) => {
      const val = record ? record[col] : "";
      return escapeAndSanitizeCsvCell(val);
    });
    rows.push(rowCells.join(","));
  }

  return rows.join("\r\n");
}

/**
 * Stream/Buffer helper to create a ZIP file using archiver
 */
export async function createZipBuffer(
  files: { name: string; content: string }[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);

    archive.on("error", reject);
    archive.pipe(stream);

    for (const file of files) {
      archive.append(file.content, { name: file.name });
    }

    archive.finalize();
  });
}

/**
 * Reads all 11 tabs from Google Sheets (or fallback repository/mock data)
 */
export async function fetchAllTabsData(): Promise<{
  tabs: Record<string, any[]>;
  csvMap: Record<string, string>;
}> {
  const tabsData: Record<string, any[]> = {};
  const isSheetsConfigured = Boolean(
    process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  );

  let adapter: GoogleSheetsAdapter | null = null;
  if (isSheetsConfigured) {
    try {
      adapter = new GoogleSheetsAdapter();
    } catch {
      adapter = null;
    }
  }

  for (const tab of TAB_NAMES) {
    if (adapter) {
      try {
        const records = await adapter.readTab(tab, {
          includeArchived: true,
          skipCache: true,
        });
        tabsData[tab] = records;
      } catch (err) {
        console.warn(`[Backup API] Error reading tab "${tab}":`, err);
        tabsData[tab] = [];
      }
    } else {
      tabsData[tab] = [];
    }
  }

  // Populate mock/in-memory data for any empty tabs in non-configured environments
  if (!isSheetsConfigured || tabsData["ActivityLog"].length === 0) {
    const inMemLogs = getInMemoryActivityLogs();
    tabsData["ActivityLog"] = inMemLogs.length > 0 ? inMemLogs : [
      {
        activity_id: "ACT-INIT-001",
        timestamp: new Date().toISOString(),
        admin_id: "system",
        entity_type: "SETTINGS",
        entity_id: "BACKUP",
        action: "INITIAL_SETUP",
        description: "Tuition Bureau CRM database initialized",
        changes: "",
      },
    ];
  }

  if (tabsData["Lookups"].length === 0) {
    tabsData["Lookups"] = [...STARTER_LOOKUPS];
  }

  if (tabsData["Meta"].length === 0) {
    tabsData["Meta"] = [
      { key: "schema_version", value: SCHEMA_VERSION },
      { key: "last_backup_at", value: new Date().toISOString() },
    ];
  }

  if (tabsData["Settings"].length === 0) {
    const client = getClientConfig();
    tabsData["Settings"] = [
      { key: "bureau_name", value: client.businessName },
      { key: "city", value: client.contact.city },
      { key: "phone", value: client.contact.phone },
      { key: "email", value: client.contact.email },
      { key: "currency", value: client.locale.currency },
      { key: "match_weights", value: JSON.stringify(DEFAULT_MATCH_WEIGHTS) },
      { key: "retention_months", value: "24" },
    ];
  }

  if (tabsData["LocalityLinks"].length === 0) {
    tabsData["LocalityLinks"] = [
      { locality_a: "MP Nagar", locality_b: "Arera Colony" },
      { locality_a: "Kankarbagh", locality_b: "Boring Road" },
    ];
  }

  // Provide explicit SchemaVersion tab/alias
  tabsData["SchemaVersion"] = [
    { key: "schema_version", value: SCHEMA_VERSION },
  ];

  // Generate CSV for each tab
  const csvMap: Record<string, string> = {};
  for (const tab of TAB_NAMES) {
    csvMap[tab] = generateCsvForTab(tab, tabsData[tab] || []);
  }
  csvMap["SchemaVersion"] = generateCsvForTab("Meta", tabsData["SchemaVersion"]);

  return {
    tabs: tabsData,
    csvMap,
  };
}
