import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Student, Tutor, LocalityLink, Assignment } from "@/types/entities";
import {
  matchTutors,
  matchTutorsWithExcluded,
  VerificationPolicy,
  MatchWeights,
} from "@/features/matching/matching-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const policy = (searchParams.get("policy") as VerificationPolicy) || "VERIFIED_ONLY";
    const includeUnverified = searchParams.get("includeUnverified") === "true";
    const minScore = searchParams.get("minScore") ? Number(searchParams.get("minScore")) : 30;
    const includeExcluded = searchParams.get("includeExcluded") === "true";

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: "studentId is required" },
        { status: 400 }
      );
    }

    let students: Student[] = [];
    let tutors: Tutor[] = [];
    let localityLinks: LocalityLink[] = [];
    let assignments: Assignment[] = [];

    const adapter = new GoogleSheetsAdapter();
    try {
      students = await adapter.readTab<Student>("Students");
    } catch {
      students = [];
    }
    try {
      tutors = await adapter.readTab<Tutor>("Tutors");
    } catch {
      tutors = [];
    }
    try {
      localityLinks = await adapter.readTab<LocalityLink>("LocalityLinks" as any);
    } catch {
      localityLinks = [];
    }
    try {
      assignments = await adapter.readTab<Assignment>("Assignments");
    } catch {
      assignments = [];
    }

    let student = students.find((s) => s.student_id === studentId);
    if (!student && students.length === 0) {
      // Fallback demo student & tutors for local evaluation when Google Sheets credentials are not yet set
      student = {
        student_id: studentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_name: "Ramesh Sharma",
        student_name: "Aarav Sharma",
        phone: "+919876500001",
        whatsapp: "+919876500001",
        email: "ramesh@example.com",
        class: "10",
        board: "CBSE",
        subjects: "Mathematics|Science",
        tuition_type: "HOME",
        locality: "Boring Road",
        budget: 6000,
        preferred_timing: "EVENING",
        tutor_gender_preference: "ANY",
        lead_status: "NEW",
        lead_source: "WEBSITE",
        consent_at: new Date().toISOString(),
        consent_version: "v1.0",
        archived: false,
      };

      if (tutors.length === 0) {
        tutors = [
          {
            tutor_id: "TUT-DEMO-001",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            full_name: "Pooja Verma",
            phone: "+919811100002",
            whatsapp: "+919811100002",
            email: "pooja.verma@example.com",
            gender: "FEMALE",
            current_city: "Patna",
            current_locality: "Boring Road",
            address: "House 45, Boring Road",
            highest_qualification: "M.Sc Mathematics",
            subjects: "Mathematics|Science",
            classes: "9|10|11",
            boards: "CBSE|ICSE",
            experience_years: 4,
            teaching_mode: "HOME",
            localities: "Boring Road|Kankarbagh",
            expected_fee: 5500,
            photo_file_id: "demo/photo_pooja",
            id_proof_file_id: "demo/id_pooja",
            id_type: "AADHAAR",
            id_number: "XXXX-XXXX-9988",
            background_check_status: "VERIFIED",
            verification_status: "VERIFIED",
            availability_status: "ACTIVE",
            lead_source: "WEBSITE",
            consent_at: new Date().toISOString(),
            consent_version: "v1.0",
            archived: false,
          },
        ];
      }
    }

    if (!student) {
      return NextResponse.json(
        { success: false, message: `Student ${studentId} not found` },
        { status: 404 }
      );
    }

    const matchOptions = {
      verificationPolicy: policy,
      include_unverified: includeUnverified,
      match_min_score: minScore,
      match_use_nearby: true,
      activeAssignmentsMap: undefined,
    };

    if (includeExcluded) {
      const matchData = matchTutorsWithExcluded(student, tutors, localityLinks, matchOptions);
      return NextResponse.json({
        success: true,
        student,
        results: matchData.matches,
        excluded: matchData.excluded,
      });
    }

    const results = matchTutors(student, tutors, localityLinks, matchOptions);

    return NextResponse.json({
      success: true,
      student,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to execute tutor matching" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studentId,
      policy = "VERIFIED_ONLY",
      includeUnverified = false,
      minScore = 30,
      customWeights,
      includeExcluded = false,
    } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: "studentId is required" },
        { status: 400 }
      );
    }

    let students: Student[] = [];
    let tutors: Tutor[] = [];
    let localityLinks: LocalityLink[] = [];
    let assignments: Assignment[] = [];

    const adapter = new GoogleSheetsAdapter();
    try {
      students = await adapter.readTab<Student>("Students");
    } catch {
      students = [];
    }
    try {
      tutors = await adapter.readTab<Tutor>("Tutors");
    } catch {
      tutors = [];
    }
    try {
      localityLinks = await adapter.readTab<LocalityLink>("LocalityLinks" as any);
    } catch {
      localityLinks = [];
    }
    try {
      assignments = await adapter.readTab<Assignment>("Assignments");
    } catch {
      assignments = [];
    }

    let student = students.find((s) => s.student_id === studentId);
    if (!student && students.length === 0) {
      // Fallback demo student & tutors for local evaluation when Google Sheets credentials are not yet set
      student = {
        student_id: studentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_name: "Ramesh Sharma",
        student_name: "Aarav Sharma",
        phone: "+919876500001",
        whatsapp: "+919876500001",
        email: "ramesh@example.com",
        class: "10",
        board: "CBSE",
        subjects: "Mathematics|Science",
        tuition_type: "HOME",
        locality: "Boring Road",
        budget: 6000,
        preferred_timing: "EVENING",
        tutor_gender_preference: "ANY",
        lead_status: "NEW",
        lead_source: "WEBSITE",
        consent_at: new Date().toISOString(),
        consent_version: "v1.0",
        archived: false,
      };

      if (tutors.length === 0) {
        tutors = [
          {
            tutor_id: "TUT-DEMO-001",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            full_name: "Pooja Verma",
            phone: "+919811100002",
            whatsapp: "+919811100002",
            email: "pooja.verma@example.com",
            gender: "FEMALE",
            current_city: "Patna",
            current_locality: "Boring Road",
            address: "House 45, Boring Road",
            highest_qualification: "M.Sc Mathematics",
            subjects: "Mathematics|Science",
            classes: "9|10|11",
            boards: "CBSE|ICSE",
            experience_years: 4,
            teaching_mode: "HOME",
            localities: "Boring Road|Kankarbagh",
            expected_fee: 5500,
            photo_file_id: "demo/photo_pooja",
            id_proof_file_id: "demo/id_pooja",
            id_type: "AADHAAR",
            id_number: "XXXX-XXXX-9988",
            background_check_status: "VERIFIED",
            verification_status: "VERIFIED",
            availability_status: "ACTIVE",
            lead_source: "WEBSITE",
            consent_at: new Date().toISOString(),
            consent_version: "v1.0",
            archived: false,
          },
        ];
      }
    }

    if (!student) {
      return NextResponse.json(
        { success: false, message: `Student ${studentId} not found` },
        { status: 404 }
      );
    }

    const matchOptions = {
      verificationPolicy: policy as VerificationPolicy,
      include_unverified: Boolean(includeUnverified),
      match_min_score: Number(minScore),
      weights: customWeights as Partial<MatchWeights> | undefined,
      match_use_nearby: true,
    };

    if (includeExcluded) {
      const matchData = matchTutorsWithExcluded(student, tutors, localityLinks, matchOptions);
      return NextResponse.json({
        success: true,
        student,
        results: matchData.matches,
        excluded: matchData.excluded,
      });
    }

    const results = matchTutors(student, tutors, localityLinks, matchOptions);

    return NextResponse.json({
      success: true,
      student,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to execute tutor matching" },
      { status: 500 }
    );
  }
}
