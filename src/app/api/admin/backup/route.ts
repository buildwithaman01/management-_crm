import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { logActivity } from "@/lib/activity-log/activity-logger";
import {
  fetchAllTabsData,
  createZipBuffer,
} from "@/lib/backup/backup-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "zip").toLowerCase();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const nowIso = new Date().toISOString();

    const { tabs, csvMap } = await fetchAllTabsData();

    // Log Activity as EXPORT (Section 25)
    await logActivity({
      adminId: "admin",
      entityType: "SETTINGS",
      entityId: "BACKUP",
      action: "BACKUP_EXPORT",
      description: `Full data backup export generated (format: ${format})`,
    });

    // Update last_backup_at in Google Sheets if available
    if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const adapter = new GoogleSheetsAdapter();
        await adapter.appendRecord("Settings", {
          key: "last_backup_at",
          value: nowIso,
        });
      } catch (err) {
        console.warn("[Backup API] Could not record last_backup_at in Settings tab:", err);
      }
    }

    if (format === "zip") {
      const filesToZip = Object.entries(csvMap).map(([tabName, csvContent]) => ({
        name: `${tabName}.csv`,
        content: csvContent,
      }));

      // Add a metadata summary README.txt to the backup archive
      filesToZip.push({
        name: "BACKUP_INFO.txt",
        content: `Tuition Bureau CRM - Full Data Backup
Generated At: ${nowIso}
Tabs Included (${filesToZip.length}): ${Object.keys(csvMap).join(", ")}
Formula Injection Sanitization: Applied to all CSV text cells.
Restore Instructions: Refer to docs/BACKUP-RESTORE.md
`,
      });

      const zipBuffer = await createZipBuffer(filesToZip);
      const filename = `tuition-bureau-backup-${today}.zip`;

      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Default or format=json
    const filename = `tuition-bureau-backup-${today}.json`;
    return new NextResponse(
      JSON.stringify(
        {
          success: true,
          exportedAt: nowIso,
          totalTabs: Object.keys(tabs).length,
          tabs,
          csv: csvMap,
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("[Backup Export Error]", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to generate backup export",
      },
      { status: 500 }
    );
  }
}
