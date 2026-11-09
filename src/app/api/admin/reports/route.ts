import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Student, Tutor, Assignment, Payment } from "@/types/entities";
import { extractSessionToken, verifySessionToken } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity-log/activity-logger";
import {
  calculateFunnel,
  calculateSubjectDemandSupply,
  calculateLocalityDistribution,
  calculateRevenueSummary,
  filterByPeriod,
  generateReportsSummaryCsv,
  ReportsData,
} from "@/features/analytics/reports-engine";

export async function GET(req: NextRequest) {
  try {
    // 1. Mandatory Admin Authentication Check (Section 11.2)
    const token = extractSessionToken(req);
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as "all" | "this_month" | "last_30_days") || "all";
    const format = searchParams.get("format") || "json";

    // 2. Fetch raw data from Google Sheets (Students, Tutors, Assignments, Payments)
    let rawStudents: Student[] = [];
    let rawTutors: Tutor[] = [];
    let rawAssignments: Assignment[] = [];
    let rawPayments: Payment[] = [];

    if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      const adapter = new GoogleSheetsAdapter();

      try {
        rawStudents = await adapter.readTab<Student>("Students", { includeArchived: false });
      } catch (err) {
        console.warn("[Reports API] Could not load Students tab:", err);
        rawStudents = [];
      }

      try {
        rawTutors = await adapter.readTab<Tutor>("Tutors", { includeArchived: false });
      } catch (err) {
        console.warn("[Reports API] Could not load Tutors tab:", err);
        rawTutors = [];
      }

      try {
        rawAssignments = await adapter.readTab<Assignment>("Assignments");
      } catch (err) {
        console.warn("[Reports API] Could not load Assignments tab:", err);
        rawAssignments = [];
      }

      try {
        rawPayments = await adapter.readTab<Payment>("Payments");
      } catch (err) {
        console.warn("[Reports API] Could not load Payments tab:", err);
        rawPayments = [];
      }
    }

    // 3. Period-filter datasets if requested
    const filteredStudents = filterByPeriod(rawStudents, period);
    const filteredAssignments = filterByPeriod(rawAssignments, period);
    const filteredPayments = filterByPeriod(rawPayments, period);

    // 4. Calculate all analytical dimensions using pure calculation engine
    const funnel = calculateFunnel(filteredStudents, filteredAssignments);
    const subjectDemandSupply = calculateSubjectDemandSupply(filteredStudents, rawTutors);
    const localityDistribution = calculateLocalityDistribution(filteredStudents, rawTutors);
    const revenueSummary = calculateRevenueSummary(
      period === "all" ? rawAssignments : filteredAssignments,
      filteredPayments
    );

    const reportsData: ReportsData = {
      period,
      generatedAt: new Date().toISOString(),
      funnel,
      subjectDemandSupply,
      localityDistribution,
      revenueSummary,
      meta: {
        totalStudents: filteredStudents.length,
        totalTutors: rawTutors.length,
        totalAssignments: filteredAssignments.length,
        totalPayments: filteredPayments.length,
      },
    };

    // 5. Handle CSV Export if requested
    if (format === "csv") {
      const csvContent = generateReportsSummaryCsv(reportsData);

      // Log export action in ActivityLog (Section 22)
      await logActivity({
        adminId: session.username,
        entityType: "SETTINGS",
        entityId: "REPORTS",
        action: "EXPORT",
        description: `Exported bureau reports & analytics summary CSV (${period})`,
      });

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="bureau-analytics-summary-${period}.csv"`,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // 6. Return JSON response
    return NextResponse.json({
      success: true,
      data: reportsData,
    });
  } catch (error: any) {
    console.error("[Reports API Error]", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "An unexpected error occurred while generating reports.",
      },
      { status: 500 }
    );
  }
}
