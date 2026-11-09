import { NextRequest, NextResponse } from "next/server";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Student } from "@/types/entities";
import { logActivity } from "@/lib/activity-log/activity-logger";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const adapter = new GoogleSheetsAdapter();
    const students = await adapter.readTab<Student>("Students", {
      includeArchived: true,
    });

    const student = students.find((s) => s.student_id === studentId);
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch student" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const body = await req.json();
    const adapter = new GoogleSheetsAdapter();

    const students = await adapter.readTab<Student>("Students", {
      includeArchived: true,
    });
    const existing = students.find((s) => s.student_id === studentId);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // Allowed updatable fields
    const patchableFields: (keyof Student)[] = [
      "parent_name",
      "student_name",
      "phone",
      "whatsapp",
      "email",
      "class",
      "board",
      "subjects",
      "tuition_type",
      "locality",
      "tutor_gender_preference",
      "preferred_timing",
      "budget",
      "classes_per_week",
      "academic_requirements",
      "admin_notes",
      "lead_status",
    ];

    const patch: Partial<Student> = {};
    for (const field of patchableFields) {
      if (body[field] !== undefined) {
        (patch as any)[field] = body[field];
      }
    }

    const updated = await adapter.updateRecord<Student>(
      "Students",
      "student_id",
      studentId,
      patch,
      existing.updated_at
    );

    await logActivity({
      adminId: "admin",
      entityType: "STUDENT",
      entityId: studentId,
      action: "UPDATE_DETAILS",
      description: `Updated student record for ${updated.student_name}`,
      changes: JSON.stringify(patch),
      sheetsAdapter: adapter,
    });

    return NextResponse.json({
      success: true,
      message: "Student record updated successfully",
      student: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update student" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const adapter = new GoogleSheetsAdapter();

    const students = await adapter.readTab<Student>("Students", {
      includeArchived: true,
    });
    const existing = students.find((s) => s.student_id === studentId);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    await adapter.deleteRecord("Students", "student_id", studentId);

    await logActivity({
      adminId: "admin",
      entityType: "STUDENT",
      entityId: studentId,
      action: "DELETE_STUDENT",
      description: `Deleted student record ${existing.student_name} (${studentId})`,
      sheetsAdapter: adapter,
    });

    return NextResponse.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete student" },
      { status: 500 }
    );
  }
}
