import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { Student, Tutor } from "@/types/entities";
import { logActivity } from "@/lib/activity-log/activity-logger";
import { deleteCloudinaryFile } from "@/lib/cloudinary/signed-urls";

export interface AnonymizeResult {
  success: boolean;
  entityType: "STUDENT" | "TUTOR";
  id: string;
  message?: string;
  deletedFilesCount?: number;
}

export class AnonymizationService {
  private adapter: GoogleSheetsAdapter;

  constructor(adapter?: GoogleSheetsAdapter) {
    this.adapter = adapter || new GoogleSheetsAdapter();
  }

  async anonymizeStudent(
    studentId: string,
    reason: string,
    adminId = "ADMIN"
  ): Promise<AnonymizeResult> {
    const students = await this.adapter.readTab<Student>("Students", {
      includeArchived: true,
      skipCache: true,
    });
    const student = students.find((s) => s.student_id === studentId);

    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    const patch: Partial<Student> = {
      parent_name: "[ANONYMIZED]",
      student_name: "[ANONYMIZED]",
      phone: "+910000000000",
      whatsapp: "",
      email: "",
      school_name: "",
      academic_requirements: "",
      other_requirements: "",
      admin_notes: `[ANONYMIZED] Reason: ${reason}`,
      submission_key: "",
      archived: true,
    };

    await this.adapter.updateRecord<Student>(
      "Students",
      "student_id",
      studentId,
      patch,
      student.updated_at
    );

    await logActivity({
      adminId,
      entityType: "STUDENT",
      entityId: studentId,
      action: "ANONYMIZED",
      description: `Student anonymized per DPDP request. Reason: ${reason}`,
      changes: {
        reason: [null, reason],
        previous_name: [student.student_name, "[ANONYMIZED]"],
      },
    });

    return {
      success: true,
      entityType: "STUDENT",
      id: studentId,
      message: `Student ${studentId} anonymized successfully`,
    };
  }

  async anonymizeTutor(
    tutorId: string,
    reason: string,
    adminId = "ADMIN"
  ): Promise<AnonymizeResult> {
    const tutors = await this.adapter.readTab<Tutor>("Tutors", {
      includeArchived: true,
      skipCache: true,
    });
    const tutor = tutors.find((t) => t.tutor_id === tutorId);

    if (!tutor) {
      throw new Error(`Tutor ${tutorId} not found`);
    }

    // Identify Cloudinary files to delete
    const fileIdsToDelete: string[] = [
      tutor.photo_file_id,
      tutor.id_proof_file_id,
      tutor.address_proof_file_id,
      tutor.degree_proof_file_id,
      tutor.resume_file_id,
    ].filter((f): f is string => Boolean(f && f.trim() !== ""));

    let deletedCount = 0;
    for (const fileId of fileIdsToDelete) {
      try {
        await deleteCloudinaryFile(fileId);
        deletedCount++;
      } catch (err) {
        console.warn(`Failed to delete Cloudinary asset ${fileId}`, err);
      }
    }

    const patch: Partial<Tutor> = {
      full_name: "[ANONYMIZED]",
      phone: "+910000000000",
      whatsapp: "",
      email: "",
      address: "",
      dob: "",
      postal_code: "",
      university: "",
      course: "",
      certifications: "",
      introduction: "",
      linkedin_url: "",
      resume_file_id: "",
      photo_file_id: "",
      qualification_file_ids: "",
      id_number: "",
      id_proof_file_id: "",
      address_proof_file_id: "",
      degree_proof_file_id: "",
      reference_name: "",
      reference_contact: "",
      admin_notes: `[ANONYMIZED] Reason: ${reason}`,
      archived: true,
    };

    await this.adapter.updateRecord<Tutor>(
      "Tutors",
      "tutor_id",
      tutorId,
      patch,
      tutor.updated_at
    );

    await logActivity({
      adminId,
      entityType: "TUTOR",
      entityId: tutorId,
      action: "ANONYMIZED",
      description: `Tutor anonymized and files deleted per DPDP request. Reason: ${reason}`,
      changes: {
        reason: [null, reason],
        previous_name: [tutor.full_name, "[ANONYMIZED]"],
        deleted_files: [fileIdsToDelete.join(","), "DELETED"],
      },
    });

    return {
      success: true,
      entityType: "TUTOR",
      id: tutorId,
      deletedFilesCount: deletedCount,
      message: `Tutor ${tutorId} anonymized and ${deletedCount} document(s) deleted`,
    };
  }

  async findRecordsForRetentionReview(retentionMonths = 24): Promise<{
    students: Student[];
    tutors: Tutor[];
  }> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
    const cutoffIso = cutoffDate.toISOString();

    const students = await this.adapter.readTab<Student>("Students", {
      includeArchived: true,
    });
    const tutors = await this.adapter.readTab<Tutor>("Tutors", {
      includeArchived: true,
    });

    const retentionStudents = students.filter(
      (s) =>
        s.created_at < cutoffIso &&
        (s.lead_status === "LOST" || s.archived) &&
        s.student_name !== "[ANONYMIZED]"
    );

    const retentionTutors = tutors.filter(
      (t) =>
        t.created_at < cutoffIso &&
        (t.verification_status === "REJECTED" ||
          t.verification_status === "BLACKLISTED" ||
          t.archived) &&
        t.full_name !== "[ANONYMIZED]"
    );

    return {
      students: retentionStudents,
      tutors: retentionTutors,
    };
  }
}
