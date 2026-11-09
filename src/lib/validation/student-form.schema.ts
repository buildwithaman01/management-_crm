import { z } from "zod";
import { isValidPhone, normalizePhone } from "@/lib/utils";

export const StudentFormSchema = z
  .object({
    parent_name: z
      .string()
      .trim()
      .min(2, "Parent name must be at least 2 characters")
      .max(100, "Parent name cannot exceed 100 characters"),
    student_name: z
      .string()
      .trim()
      .min(2, "Student name must be at least 2 characters")
      .max(100, "Student name cannot exceed 100 characters"),
    phone: z
      .string()
      .trim()
      .refine((val) => isValidPhone(val), {
        message: "Please enter a valid 10-digit Indian mobile number",
      }),
    whatsapp: z.string().trim().optional().or(z.literal("")),
    email: z
      .string()
      .trim()
      .email("Please enter a valid email address")
      .optional()
      .or(z.literal("")),
    class: z.string().min(1, "Please select student's class"),
    board: z.string().min(1, "Please select education board"),
    subjects: z
      .array(z.string())
      .min(1, "Please select at least one subject")
      .or(z.string().min(1, "Please select subjects")),
    school_name: z.string().trim().max(150).optional().or(z.literal("")),
    academic_requirements: z
      .string()
      .trim()
      .max(1000, "Requirements cannot exceed 1000 characters")
      .optional()
      .or(z.literal("")),
    tuition_type: z.enum(["HOME", "ONLINE", "BOTH"], {
      required_error: "Please select tuition type",
    }),
    locality: z.string().trim().optional().or(z.literal("")),
    tutor_gender_preference: z.enum(["MALE", "FEMALE", "ANY"], {
      required_error: "Please select tutor gender preference",
    }),
    preferred_timing: z.enum(["MORNING", "AFTERNOON", "EVENING", "FLEXIBLE"], {
      required_error: "Please select preferred timing",
    }),
    budget: z.coerce
      .number({ invalid_type_error: "Budget must be a valid number" })
      .min(0, "Budget cannot be negative"),
    classes_per_week: z.coerce
      .number()
      .min(1, "Minimum 1 class per week")
      .max(7, "Maximum 7 classes per week")
      .default(3),
    other_requirements: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .or(z.literal("")),
    consent: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and consent" }),
    }),
    submission_key: z.string().optional(),
    honeypot: z.string().optional(),
  })
  .refine(
    (data) => {
      // Locality is required unless tuition_type is ONLINE (Section 10.1 #12)
      if (data.tuition_type !== "ONLINE") {
        return Boolean(data.locality && data.locality.trim().length > 0);
      }
      return true;
    },
    {
      message: "Locality is required for Home or Both tuition types",
      path: ["locality"],
    }
  );

export type StudentFormInput = z.infer<typeof StudentFormSchema>;
