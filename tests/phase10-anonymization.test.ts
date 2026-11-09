import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnonymizationService } from "../src/services/anonymization.service";
import { GoogleSheetsAdapter } from "../src/lib/google-sheets/adapter";
import { Student, Tutor } from "../src/types/entities";

vi.mock("../src/lib/activity-log/activity-logger", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/lib/cloudinary/signed-urls", () => ({
  deleteCloudinaryFile: vi.fn().mockResolvedValue({ result: "ok" }),
}));

describe("Anonymization Service (Section 24 - DPDP & Data Retention)", () => {
  let mockAdapter: any;
  let service: AnonymizationService;

  const mockStudents: Student[] = [
    {
      student_id: "STU-2611-0001",
      parent_name: "Rajesh Kumar",
      student_name: "Aarav Kumar",
      phone: "+919876543210",
      whatsapp: "+919876543210",
      email: "rajesh@example.com",
      class: "10",
      board: "CBSE",
      subjects: "Mathematics|Science",
      locality: "Kankarbagh",
      tuition_type: "HOME",
      tutor_gender_preference: "ANY",
      preferred_timing: "EVENING",
      lead_status: "NEW",
      lead_source: "WEBSITE",
      consent_at: "2026-11-01T10:00:00Z",
      consent_version: "v1.0",
      archived: false,
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-01T10:00:00Z",
    },
  ];

  const mockTutors: Tutor[] = [
    {
      tutor_id: "TUT-2611-0001",
      full_name: "Amit Sharma",
      phone: "+919811122233",
      whatsapp: "+919811122233",
      email: "amit.sharma@example.com",
      gender: "MALE",
      current_city: "Patna",
      address: "123 Main St, Boring Road",
      highest_qualification: "M.Sc Physics",
      subjects: "Physics|Mathematics",
      classes: "11|12",
      boards: "CBSE",
      experience_years: 5,
      teaching_mode: "HOME",
      localities: "Boring Road|Kankarbagh",
      expected_fee: 6000,
      photo_file_id: "tutors/photo_123",
      id_proof_file_id: "tutors/aadhaar_456",
      id_type: "AADHAAR",
      id_number: "XXXX-XXXX-1234",
      background_check_status: "VERIFIED",
      verification_status: "VERIFIED",
      availability_status: "ACTIVE",
      lead_source: "WEBSITE",
      consent_at: "2026-11-01T10:00:00Z",
      consent_version: "v1.0",
      archived: false,
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-01T10:00:00Z",
    },
  ];

  beforeEach(() => {
    mockAdapter = {
      readTab: vi.fn().mockImplementation((tab: string) => {
        if (tab === "Students") return Promise.resolve([...mockStudents]);
        if (tab === "Tutors") return Promise.resolve([...mockTutors]);
        return Promise.resolve([]);
      }),
      updateRecord: vi.fn().mockResolvedValue({}),
    };
    service = new AnonymizationService(mockAdapter as unknown as GoogleSheetsAdapter);
  });

  it("anonymizes student PII while preserving academic & report fields", async () => {
    const result = await service.anonymizeStudent("STU-2611-0001", "Parent request");

    expect(result.success).toBe(true);
    expect(mockAdapter.updateRecord).toHaveBeenCalledWith(
      "Students",
      "student_id",
      "STU-2611-0001",
      expect.objectContaining({
        parent_name: "[ANONYMIZED]",
        student_name: "[ANONYMIZED]",
        phone: "+910000000000",
        email: "",
        archived: true,
      }),
      "2026-11-01T10:00:00Z"
    );
  });

  it("anonymizes tutor PII and deletes associated Cloudinary files", async () => {
    const { deleteCloudinaryFile } = await import("../src/lib/cloudinary/signed-urls");
    const result = await service.anonymizeTutor("TUT-2611-0001", "Right to be forgotten");

    expect(result.success).toBe(true);
    expect(result.deletedFilesCount).toBe(2);
    expect(deleteCloudinaryFile).toHaveBeenCalledWith("tutors/photo_123");
    expect(deleteCloudinaryFile).toHaveBeenCalledWith("tutors/aadhaar_456");

    expect(mockAdapter.updateRecord).toHaveBeenCalledWith(
      "Tutors",
      "tutor_id",
      "TUT-2611-0001",
      expect.objectContaining({
        full_name: "[ANONYMIZED]",
        phone: "+910000000000",
        photo_file_id: "",
        id_proof_file_id: "",
        archived: true,
      }),
      "2026-11-01T10:00:00Z"
    );
  });

  it("throws error when record to anonymize is not found", async () => {
    await expect(
      service.anonymizeStudent("STU-NONEXISTENT", "Test")
    ).rejects.toThrow("Student STU-NONEXISTENT not found");
  });
});
