import { NextResponse } from "next/server";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Student, Tutor, Assignment } from "@/types/entities";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    let students: Student[] = [];
    let tutors: Tutor[] = [];
    let assignments: Assignment[] = [];

    const adapter = new GoogleSheetsAdapter();
    try {
      students = await adapter.readTab<Student>("Students", { skipCache: true });
    } catch {
      students = [];
    }
    try {
      tutors = await adapter.readTab<Tutor>("Tutors", { skipCache: true });
    } catch {
      tutors = [];
    }
    try {
      assignments = await adapter.readTab<Assignment>("Assignments", { skipCache: true });
    } catch {
      assignments = [];
    }

    const totalStudents = students.length;
    const totalTutors = tutors.length;
    const verifiedTutors = tutors.filter((t) => t.verification_status === "VERIFIED").length;
    const pendingTutors = tutors.filter(
      (t) => t.verification_status === "PENDING" || t.verification_status === "UNDER_REVIEW"
    ).length;
    const newLeads = students.filter((s) => s.lead_status === "NEW").length;
    const activeAssignments = assignments.filter((a) => a.assignment_status === "ACTIVE").length;
    const scheduledDemos = assignments.filter(
      (a) => a.demo_status === "SCHEDULED" || a.assignment_status === "DEMO_SCHEDULED"
    ).length;

    // Sort newest first
    const recentStudents = [...students]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    const recentTutors = [...tutors]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    const recentAssignments = [...assignments]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return NextResponse.json(
      {
        success: true,
        data: {
          metrics: {
            totalStudents,
            totalTutors,
            verifiedTutors,
            pendingTutors,
            newLeads,
            activeAssignments,
            scheduledDemos,
          },
          recentStudents,
          recentTutors,
          recentAssignments,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load overview data" },
      { status: 500 }
    );
  }
}
