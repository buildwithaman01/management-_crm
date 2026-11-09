import { StudentFormInput } from "@/lib/validation/student-form.schema";
import { checkHoneypot, checkRateLimit } from "@/lib/security/anti-spam";
import { normalizePhone, joinMulti } from "@/lib/utils";
import { generateId } from "@/lib/id-generator";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Student } from "@/types/entities";
import { logActivity } from "@/lib/activity-log/activity-logger";

export interface StudentSubmissionResult {
  success: boolean;
  message?: string;
  studentId?: string;
  isDuplicate?: boolean;
}

export class StudentSubmissionService {
  private adapter: GoogleSheetsAdapter;

  constructor(adapter?: GoogleSheetsAdapter) {
    this.adapter = adapter || new GoogleSheetsAdapter();
  }

  async submitRequirement(
    input: StudentFormInput,
    clientIp = "127.0.0.1"
  ): Promise<StudentSubmissionResult> {
    // 1. Honeypot check (Section 10.4)
    if (checkHoneypot(input.honeypot)) {
      // Silently return success to fool bot
      return { success: true, studentId: "STU-SPAM-BOT" };
    }

    // 2. Rate limit check (Section 10.4)
    const rateCheck = checkRateLimit(clientIp, "student");
    if (!rateCheck.allowed) {
      throw new Error("Too many submissions from this connection. Please try again in 10 minutes.");
    }

    const normalizedPhone = normalizePhone(input.phone);
    const normalizedWhatsApp = input.whatsapp
      ? normalizePhone(input.whatsapp)
      : normalizedPhone;

    // 3. Fetch existing students for idempotency and duplicate checking
    let existingStudents: Student[] = [];
    try {
      existingStudents = await this.adapter.readTab<Student>("Students", {
        skipCache: true,
        includeArchived: true,
      });
    } catch {
      // In testing or when empty, proceed
      existingStudents = [];
    }

    // 4. Idempotency check: submission_key (Section 9)
    if (input.submission_key) {
      const matchKey = existingStudents.find(
        (s) => s.submission_key === input.submission_key
      );
      if (matchKey) {
        return {
          success: true,
          studentId: matchKey.student_id,
        };
      }
    }

    // 5. Duplicate check (Section 9):
    // same normalized phone + same student_name (case-insensitive) + same class within 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const duplicateMatch = existingStudents.find((s) => {
      const isSamePhone = normalizePhone(s.phone) === normalizedPhone;
      const isSameName =
        s.student_name.trim().toLowerCase() ===
        input.student_name.trim().toLowerCase();
      const isSameClass = s.class === input.class;
      const createdAt = new Date(s.created_at);
      const isRecent = createdAt >= thirtyDaysAgo;

      return isSamePhone && isSameName && isSameClass && isRecent;
    });

    const studentId = generateId("STU");
    const subjectsStr = Array.isArray(input.subjects)
      ? joinMulti(input.subjects)
      : input.subjects;

    const studentRecord: Student = {
      student_id: studentId,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      parent_name: input.parent_name,
      student_name: input.student_name,
      phone: normalizedPhone,
      whatsapp: normalizedWhatsApp,
      email: input.email || "",
      class: input.class,
      board: input.board,
      subjects: subjectsStr,
      school_name: input.school_name || "",
      tuition_type: input.tuition_type,
      locality: input.locality || "",
      tutor_gender_preference: input.tutor_gender_preference,
      preferred_timing: input.preferred_timing,
      budget: input.budget,
      classes_per_week: input.classes_per_week,
      academic_requirements: input.academic_requirements || "",
      other_requirements: input.other_requirements || "",
      lead_status: "NEW",
      lead_source: "WEBSITE",
      admin_notes: duplicateMatch
        ? `[SYSTEM AUTO-FLAG] Potential duplicate of ${duplicateMatch.student_id}`
        : "",
      consent_at: now.toISOString(),
      consent_version: "1.0",
      submission_key: input.submission_key || "",
      duplicate_of: duplicateMatch ? duplicateMatch.student_id : "",
      archived: false,
    };

    // 6. Save to database (Google Sheets or Local Store fallback)
    await this.adapter.appendRecord("Students", studentRecord);

    // 7. Log activity
    try {
      await logActivity({
        adminId: "public_form",
        entityType: "STUDENT",
        entityId: studentId,
        action: "STUDENT_REGISTRATION",
        description: `New student registration submitted online for ${studentRecord.student_name}`,
        sheetsAdapter: this.adapter,
      });
    } catch {
      // In testing or when Google Sheets is unconfigured, proceed gracefully
    }

    return {
      success: true,
      studentId,
      isDuplicate: Boolean(duplicateMatch),
    };
  }
}
