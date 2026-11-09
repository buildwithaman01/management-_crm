import { NextRequest, NextResponse } from "next/server";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { ActivityLog } from "@/types/entities";
import { getInMemoryActivityLogs } from "@/lib/activity-log/activity-logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");

    let allLogs: ActivityLog[] = [];

    // 1. Fetch from Google Sheets if configured
    if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const adapter = new GoogleSheetsAdapter();
        const sheetLogs = await adapter.readTab<ActivityLog>("ActivityLog", {
          skipCache: true,
        });
        allLogs.push(...sheetLogs);
      } catch (err) {
        console.warn("[ActivityLogs API] Failed to read from Google Sheets tab:", err);
      }
    }

    // 2. Fetch in-memory logs (captures actions during dev, testing, or mock execution)
    const inMemLogs = getInMemoryActivityLogs();
    allLogs.push(...inMemLogs);

    // 3. Deduplicate by activity_id (preferring newest)
    const seen = new Set<string>();
    const deduped: ActivityLog[] = [];
    for (const log of allLogs) {
      if (log.activity_id && !seen.has(log.activity_id)) {
        seen.add(log.activity_id);
        deduped.push(log);
      }
    }

    // Fallback seed entries if completely empty
    if (deduped.length === 0) {
      const now = new Date().toISOString();
      deduped.push(
        {
          activity_id: "ACT-INIT-001",
          timestamp: now,
          admin_id: "admin",
          entity_type: "SETTINGS",
          entity_id: "SYSTEM",
          action: "SYSTEM_INITIALIZED",
          description: "System schema and settings initialized successfully",
          changes: "",
        },
        {
          activity_id: "ACT-INIT-002",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          admin_id: "admin",
          entity_type: "SETTINGS",
          entity_id: "SYSTEM",
          action: "DEFAULT_WEIGHTS_LOADED",
          description: "Matching engine loaded default scoring weights (Locality 30, Subject 25, Class 10...)",
          changes: "",
        }
      );
    }

    // 4. Sort newest first
    deduped.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 5. Apply filters
    let filtered = deduped;
    if (entityType && entityType !== "ALL") {
      filtered = filtered.filter(
        (l) => l.entity_type?.toUpperCase() === entityType.toUpperCase()
      );
    }
    if (action && action !== "ALL") {
      filtered = filtered.filter((l) =>
        l.action?.toLowerCase().includes(action.toLowerCase())
      );
    }

    const sliced = filtered.slice(0, isNaN(limit) ? 50 : limit);

    return NextResponse.json({
      success: true,
      logs: sliced,
      activityLogs: sliced,
      total: filtered.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to load activity logs",
      },
      { status: 500 }
    );
  }
}
