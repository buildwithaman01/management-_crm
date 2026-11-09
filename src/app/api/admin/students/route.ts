import { NextRequest, NextResponse } from "next/server";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Student } from "@/types/entities";
import { generateId } from "@/lib/id-generator";
import { normalizePhone } from "@/lib/utils";
import { logActivity } from "@/lib/activity-log/activity-logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("archived") === "true";

    const adapter = new GoogleSheetsAdapter();
    const students = await adapter.readTab<Student>("Students", {
      includeArchived,
      skipCache: true,
    });

    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load students" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.student_name || !body.parent_name || !body.phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Student name, parent name, and phone number are required.",
        },
        { status: 400 }
      );
    }

    const adapter = new GoogleSheetsAdapter();
    const studentId = generateId("STU");
    const now = new Date().toISOString();
    const normalizedPhone = normalizePhone(body.phone);
    const normalizedWhatsApp = body.whatsapp
      ? normalizePhone(body.whatsapp)
      : normalizedPhone;

    const subjectsStr = Array.isArray(body.subjects)
      ? body.subjects.join("|")
      : body.subjects || "ALL_SUBJECTS";

    const studentRecord: Student = {
      student_id: studentId,
      created_at: now,
      updated_at: now,
      parent_name: body.parent_name.trim(),
      student_name: body.student_name.trim(),
      phone: normalizedPhone,
      whatsapp: normalizedWhatsApp,
      email: body.email?.trim() || "",
      class: body.class || "CLASS_10",
      board: body.board || "CBSE",
      subjects: subjectsStr,
      school_name: body.school_name?.trim() || "",
      tuition_type: body.tuition_type || "HOME",
      locality: body.locality?.trim() || "",
      tutor_gender_preference: body.tutor_gender_preference || "ANY",
      preferred_timing: body.preferred_timing || "EVENING",
      budget: Number(body.budget) || 0,
      classes_per_week: Number(body.classes_per_week) || 3,
      academic_requirements: body.academic_requirements?.trim() || "",
      other_requirements: body.other_requirements?.trim() || "",
      lead_status: "NEW",
      lead_source: body.lead_source || "ADMIN_PANEL",
      admin_notes: body.admin_notes?.trim() || "Created directly in Admin Panel",
      consent_at: now,
      consent_version: "1.0",
      submission_key: `ADMIN_${Date.now()}`,
      duplicate_of: "",
      archived: false,
    };

    await adapter.appendRecord("Students", studentRecord);

    try {
      await logActivity({
        adminId: "admin",
        entityType: "STUDENT",
        entityId: studentId,
        action: "CREATE_STUDENT",
        description: `Admin manually added student inquiry for ${studentRecord.student_name} (${studentRecord.class})`,
        sheetsAdapter: adapter,
      });
    } catch {
      // Activity logging optional in test environments
    }

    return NextResponse.json(
      {
        success: true,
        message: "Student inquiry created successfully.",
        student: studentRecord,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create student inquiry",
      },
      { status: 500 }
    );
  }
}
