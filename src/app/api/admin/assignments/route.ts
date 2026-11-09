import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  listAssignments,
  createAssignment,
  CreateAssignmentInput,
} from "@/features/assignments/assignments-service";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Student, Tutor } from "@/types/entities";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || undefined;
    const tutorId = searchParams.get("tutorId") || undefined;
    const status = searchParams.get("status") || undefined;
    const demoDate = searchParams.get("demoDate") || undefined;
    const includeArchived = searchParams.get("archived") === "true";

    const assignments = await listAssignments({
      studentId,
      tutorId,
      status,
      demoDate,
      includeArchived,
    });

    // Optional metadata enrichment when available
    let enrichedAssignments = assignments;
    try {
      const adapter = new GoogleSheetsAdapter();
      const [students, tutors] = await Promise.all([
        adapter.readTab<Student>("Students").catch(() => []),
        adapter.readTab<Tutor>("Tutors").catch(() => []),
      ]);

      const studentMap = new Map(students.map((s) => [s.student_id, s]));
      const tutorMap = new Map(tutors.map((t) => [t.tutor_id, t]));

      enrichedAssignments = assignments.map((a) => {
        const student = studentMap.get(a.student_id);
        const tutor = tutorMap.get(a.tutor_id);
        return {
          ...a,
          student_name: student?.student_name,
          parent_name: student?.parent_name,
          student_phone: student?.phone,
          student_class: student?.class,
          tutor_name: tutor?.full_name,
          tutor_phone: tutor?.phone,
        };
      });
    } catch {
      // Fallback to base assignments if enrichment fails
    }

    return NextResponse.json({
      success: true,
      assignments: enrichedAssignments,
      count: enrichedAssignments.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load assignments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.student_id || !body.student_id.trim()) {
      return NextResponse.json(
        { success: false, message: "student_id is required" },
        { status: 400 }
      );
    }

    if (!body.tutor_id || !body.tutor_id.trim()) {
      return NextResponse.json(
        { success: false, message: "tutor_id is required" },
        { status: 400 }
      );
    }

    if (!body.subjects || (Array.isArray(body.subjects) && body.subjects.length === 0)) {
      return NextResponse.json(
        { success: false, message: "At least one subject is required" },
        { status: 400 }
      );
    }

    const input: CreateAssignmentInput = {
      student_id: body.student_id.trim(),
      tutor_id: body.tutor_id.trim(),
      subjects: body.subjects,
      agreed_fee: body.agreed_fee,
      demo_at: body.demo_at,
      demo_status: body.demo_status,
      start_date: body.start_date,
      end_date: body.end_date,
      assignment_status: body.assignment_status,
      admin_notes: body.admin_notes,
      created_by: body.created_by || "admin",
      force: Boolean(body.force),
    };

    const assignment = await createAssignment(input);

    return NextResponse.json(
      {
        success: true,
        assignment,
        message: "Assignment created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    const msg = error.message || "Failed to create assignment";
    let statusCode = 500;

    if (msg.includes("does not exist")) {
      statusCode = 404;
    } else if (msg.includes("already exists")) {
      statusCode = 409;
    } else if (msg.includes("required") || msg.includes("Invalid")) {
      statusCode = 400;
    }

    return NextResponse.json(
      { success: false, message: msg },
      { status: statusCode }
    );
  }
}
