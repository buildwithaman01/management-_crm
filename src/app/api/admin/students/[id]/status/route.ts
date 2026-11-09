import { NextRequest, NextResponse } from "next/server";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Student } from "@/types/entities";
import { logActivity } from "@/lib/activity-log/activity-logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const body = await req.json();
    const newStatus = body.status;

    if (!newStatus) {
      return NextResponse.json(
        { success: false, message: "New status is required" },
        { status: 400 }
      );
    }

    if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      const adapter = new GoogleSheetsAdapter();
      const existingList = await adapter.readTab<Student>("Students", {
        skipCache: true,
        includeArchived: true,
      });

      const existing = existingList.find((s) => s.student_id === studentId);
      if (!existing) {
        return NextResponse.json(
          { success: false, message: "Student not found" },
          { status: 404 }
        );
      }

      const updated = await adapter.updateRecord<Student>(
        "Students",
        "student_id",
        studentId,
        { lead_status: newStatus },
        existing.updated_at
      );

      await logActivity({
        adminId: "admin",
        entityType: "STUDENT",
        entityId: studentId,
        action: "UPDATE_STATUS",
        description: `Student status updated to ${newStatus}`,
        changes: { lead_status: [existing.lead_status, newStatus] },
        sheetsAdapter: adapter,
      });

      return NextResponse.json({ success: true, student: updated });
    }

    return NextResponse.json({ success: true, message: "Updated in mock mode" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update status" },
      { status: 500 }
    );
  }
}
