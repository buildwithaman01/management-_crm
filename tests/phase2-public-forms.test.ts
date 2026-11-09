import { describe, it, expect, beforeEach } from "vitest";
import { StudentFormSchema } from "@/lib/validation/student-form.schema";
import { TutorFormSchema } from "@/lib/validation/tutor-form.schema";
import { StudentSubmissionService } from "@/services/student-submission.service";
import { TutorSubmissionService } from "@/services/tutor-submission.service";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { checkHoneypot, checkRateLimit } from "@/lib/security/anti-spam";

describe("Phase 2 — Public Forms Validation & Submission Tests", () => {
  describe("Student Form Validation", () => {
    it("validates a complete student requirement form successfully", () => {
      const valid = {
        parent_name: "Sunita Devi",
        student_name: "Aman Sharma",
        phone: "9876543210",
        whatsapp: "9876543210",
        class: "CLASS_10",
        board: "CBSE",
        subjects: ["MATHEMATICS", "SCIENCE"],
        tuition_type: "HOME",
        locality: "Kankarbagh",
        tutor_gender_preference: "ANY",
        preferred_timing: "EVENING",
        budget: 4500,
        classes_per_week: 3,
        consent: true,
      };

      const result = StudentFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("requires locality when tuition_type is HOME or BOTH, but not ONLINE", () => {
      const homeWithoutLocality = {
        parent_name: "Sunita Devi",
        student_name: "Aman Sharma",
        phone: "9876543210",
        class: "CLASS_10",
        board: "CBSE",
        subjects: ["MATHEMATICS"],
        tuition_type: "HOME",
        locality: "", // missing!
        tutor_gender_preference: "ANY",
        preferred_timing: "EVENING",
        budget: 4000,
        consent: true,
      };

      const failResult = StudentFormSchema.safeParse(homeWithoutLocality);
      expect(failResult.success).toBe(false);

      // Now set to ONLINE -> locality not required
      const onlineWithoutLocality = {
        ...homeWithoutLocality,
        tuition_type: "ONLINE",
      };
      const passResult = StudentFormSchema.safeParse(onlineWithoutLocality);
      expect(passResult.success).toBe(true);
    });

    it("rejects invalid Indian mobile numbers", () => {
      const invalidPhone = {
        parent_name: "Sunita Devi",
        student_name: "Aman Sharma",
        phone: "12345", // too short!
        class: "CLASS_10",
        board: "CBSE",
        subjects: ["MATHEMATICS"],
        tuition_type: "ONLINE",
        tutor_gender_preference: "ANY",
        preferred_timing: "EVENING",
        budget: 4000,
        consent: true,
      };

      const result = StudentFormSchema.safeParse(invalidPhone);
      expect(result.success).toBe(false);
    });
  });

  describe("Tutor Form Validation & Document Requirements", () => {
    it("mandates profile photo, ID type, ID number, and ID proof copy (Section 8.3 & 10.2)", () => {
      const missingPhotoAndId = {
        full_name: "Prakash Jha",
        phone: "9876543210",
        gender: "MALE",
        current_city: "Patna",
        highest_qualification: "MASTERS",
        subjects: ["PHYSICS"],
        classes: ["CLASS_11", "CLASS_12"],
        teaching_mode: "HOME",
        localities: ["Boring Road"],
        expected_fee: 6000,
        experience_years: 5,
        consent: true,
        // photo_file_id, id_number, id_proof_file_id missing!
      };

      const result = TutorFormSchema.safeParse(missingPhotoAndId);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.format();
        expect(errors.photo_file_id).toBeDefined();
        expect(errors.id_number).toBeDefined();
        expect(errors.id_proof_file_id).toBeDefined();
      }
    });

    it("passes when all mandatory verification documents are provided", () => {
      const validTutor = {
        full_name: "Prakash Jha",
        phone: "9876543210",
        gender: "MALE",
        current_city: "Patna",
        highest_qualification: "MASTERS",
        subjects: ["PHYSICS"],
        classes: ["CLASS_11", "CLASS_12"],
        teaching_mode: "HOME",
        localities: ["Boring Road"],
        expected_fee: 6000,
        experience_years: 5,
        photo_file_id: "cld_photo_99182",
        id_type: "AADHAAR",
        id_number: "2234-5567-8899",
        id_proof_file_id: "cld_aadhaar_8821",
        consent: true,
      };

      const result = TutorFormSchema.safeParse(validTutor);
      expect(result.success).toBe(true);
    });
  });

  describe("Honeypot & Rate Limiting", () => {
    it("detects and flags honeypot bot submissions", () => {
      expect(checkHoneypot("")).toBe(false);
      expect(checkHoneypot(undefined)).toBe(false);
      expect(checkHoneypot("bot-spam-content")).toBe(true);
    });

    it("throttles excessive submissions from the same IP (max 5 per 10 mins)", () => {
      const testIp = "192.168.1.100";
      for (let i = 0; i < 5; i++) {
        const check = checkRateLimit(testIp, "student");
        expect(check.allowed).toBe(true);
      }

      // 6th attempt must be rejected
      const sixth = checkRateLimit(testIp, "student");
      expect(sixth.allowed).toBe(false);
      expect(sixth.remaining).toBe(0);
    });
  });
});
