import { TutorFormInput } from "@/lib/validation/tutor-form.schema";
import { checkHoneypot, checkRateLimit } from "@/lib/security/anti-spam";
import { normalizePhone, joinMulti } from "@/lib/utils";
import { generateId } from "@/lib/id-generator";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Tutor } from "@/types/entities";
import { logActivity } from "@/lib/activity-log/activity-logger";

export interface TutorSubmissionResult {
  success: boolean;
  message?: string;
  tutorId?: string;
  isExisting?: boolean;
}

export class TutorSubmissionService {
  private adapter: GoogleSheetsAdapter;

  constructor(adapter?: GoogleSheetsAdapter) {
    this.adapter = adapter || new GoogleSheetsAdapter();
  }

  async registerTutor(
    input: TutorFormInput,
    clientIp = "127.0.0.1"
  ): Promise<TutorSubmissionResult> {
    // 1. Honeypot check
    if (checkHoneypot(input.honeypot)) {
      return {
        success: true,
        tutorId: "TUT-SPAM-BOT",
      };
    }

    // 2. Rate limiting
    const rateCheck = checkRateLimit(clientIp, "tutor");
    if (!rateCheck.allowed) {
      throw new Error("Too many submissions from this connection. Please try again in 10 minutes.");
    }

    const normalizedPhone = normalizePhone(input.phone);
    const normalizedWhatsApp = input.whatsapp
      ? normalizePhone(input.whatsapp)
      : normalizedPhone;

    // 3. Fetch existing tutors
    let existingTutors: Tutor[] = [];
    try {
      existingTutors = await this.adapter.readTab<Tutor>("Tutors", {
        skipCache: true,
        includeArchived: true,
      });
    } catch {
      existingTutors = [];
    }

    // 4. Idempotency check: submission_key (Section 9)
    if (input.submission_key) {
      const matchKey = existingTutors.find(
        (t) => t.submission_key === input.submission_key
      );
      if (matchKey) {
        return {
          success: true,
          tutorId: matchKey.tutor_id,
        };
      }
    }

    // 5. Tutor duplicate check (Section 9):
    // same normalized phone OR same email (if given)
    const duplicateMatch = existingTutors.find((t) => {
      const samePhone = normalizePhone(t.phone) === normalizedPhone;
      const sameEmail =
        input.email &&
        t.email &&
        t.email.trim().toLowerCase() === input.email.trim().toLowerCase();
      return samePhone || Boolean(sameEmail);
    });

    if (duplicateMatch) {
      // Do not create a second record. Show friendly message (Section 9)
      return {
        success: true,
        isExisting: true,
        message: "You are already registered with us. Our team will contact you.",
      };
    }

    const now = new Date();
    const tutorId = generateId("TUT");

    const subjectsStr = Array.isArray(input.subjects)
      ? joinMulti(input.subjects)
      : input.subjects;
    const secondarySubjectsStr = Array.isArray(input.secondary_subjects)
      ? joinMulti(input.secondary_subjects)
      : input.secondary_subjects || "";
    const classesStr = Array.isArray(input.classes)
      ? joinMulti(input.classes)
      : input.classes;
    const boardsStr = Array.isArray(input.boards)
      ? joinMulti(input.boards)
      : input.boards || "";
    const localitiesStr = Array.isArray(input.localities)
      ? joinMulti(input.localities)
      : input.localities;
    const timingsStr = Array.isArray(input.available_timings)
      ? joinMulti(input.available_timings)
      : input.available_timings || "";
    const daysStr = Array.isArray(input.available_days)
      ? joinMulti(input.available_days)
      : input.available_days || "";
    const qualDocsStr = Array.isArray(input.qualification_file_ids)
      ? joinMulti(input.qualification_file_ids)
      : input.qualification_file_ids || "";

    const tutorRecord: Tutor = {
      tutor_id: tutorId,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      full_name: input.full_name,
      phone: normalizedPhone,
      whatsapp: normalizedWhatsApp,
      email: input.email || "",
      gender: input.gender,
      current_city: input.current_city,
      current_locality: input.current_locality || "",
      highest_qualification: input.highest_qualification,
      specialization: input.specialization || "",
      university: input.university || "",
      course: input.course || "",
      subjects: subjectsStr,
      secondary_subjects: secondarySubjectsStr,
      classes: classesStr,
      boards: boardsStr,
      experience_years: input.experience_years,
      teaching_mode: input.teaching_mode,
      localities: localitiesStr,
      expected_fee: input.expected_fee,
      available_timings: timingsStr,
      available_days: daysStr,
      introduction: input.introduction || "",
      photo_file_id: input.photo_file_id,
      id_type: input.id_type || "AADHAAR",
      id_number: input.id_number,
      id_proof_file_id: input.id_proof_file_id,
      address_proof_file_id: input.id_proof_back_file_id || "",
      resume_file_id: input.resume_file_id || "",
      qualification_file_ids: qualDocsStr,
      background_check_status: "NOT_STARTED",
      verification_status: "PENDING",
      availability_status: "ACTIVE",
      lead_source: "WEBSITE",
      consent_at: now.toISOString(),
      consent_version: "1.0",
      submission_key: input.submission_key || "",
      last_confirmed_at: now.toISOString(),
      archived: false,
    };

    // 6. Save to database (Google Sheets or Local Store fallback)
    await this.adapter.appendRecord("Tutors", tutorRecord);

    // 7. Log activity
    try {
      await logActivity({
        adminId: "public_form",
        entityType: "TUTOR",
        entityId: tutorId,
        action: "TUTOR_REGISTRATION",
        description: `New tutor registered online: ${tutorRecord.full_name} (${tutorRecord.highest_qualification})`,
        sheetsAdapter: this.adapter,
      });
    } catch {
      // In testing or when Google Sheets is unconfigured, proceed gracefully
    }

    return {
      success: true,
      tutorId,
    };
  }
}
