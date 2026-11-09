import { z } from "zod";
import { isValidPhone } from "@/lib/utils";

export const TutorFormSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
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
  gender: z.enum(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"], {
    required_error: "Please select your gender",
  }),
  current_city: z.string().trim().min(2, "Current city is required"),
  current_locality: z.string().trim().optional().or(z.literal("")),
  highest_qualification: z
    .string()
    .min(1, "Please select highest qualification"),
  specialization: z.string().trim().max(100).optional().or(z.literal("")),
  university: z.string().trim().max(150).optional().or(z.literal("")),
  course: z.string().trim().max(100).optional().or(z.literal("")),
  subjects: z
    .array(z.string())
    .min(1, "Please select at least one primary subject")
    .or(z.string().min(1, "Please select primary subjects")),
  secondary_subjects: z.array(z.string()).or(z.string()).optional(),
  classes: z
    .array(z.string())
    .min(1, "Please select at least one class")
    .or(z.string().min(1, "Please select classes")),
  boards: z.array(z.string()).or(z.string()).optional(),
  experience_years: z.coerce
    .number({ invalid_type_error: "Experience must be a number" })
    .min(0, "Experience cannot be negative")
    .max(60, "Experience cannot exceed 60 years"),
  teaching_mode: z.enum(["HOME", "ONLINE", "BOTH"], {
    required_error: "Please select teaching mode",
  }),
  localities: z
    .array(z.string())
    .min(1, "Please select at least one teaching locality")
    .or(z.string().min(1, "Please select teaching localities")),
  expected_fee: z.coerce
    .number({ invalid_type_error: "Expected fee must be a number" })
    .min(0, "Expected fee cannot be negative"),
  available_timings: z.array(z.string()).or(z.string()).optional(),
  available_days: z.array(z.string()).or(z.string()).optional(),
  introduction: z
    .string()
    .trim()
    .max(1000, "Introduction cannot exceed 1000 characters")
    .optional()
    .or(z.literal("")),
  // Section 8.3 & 10.2: Photo and Aadhaar are required
  photo_file_id: z.string().min(1, "Profile photo is required"),
  id_type: z.string().min(1, "ID type is required").default("AADHAAR"),
  id_number: z.string().trim().min(4, "ID / Aadhaar number is required"),
  id_proof_file_id: z.string().min(1, "Aadhaar / ID proof front document is required"),
  id_proof_back_file_id: z.string().optional().or(z.literal("")),
  resume_file_id: z.string().optional().or(z.literal("")),
  qualification_file_ids: z.array(z.string()).or(z.string()).optional(),
  consent: z.literal(true, {
    errorMap: () => ({
      message: "You must accept the terms and consent for verification",
    }),
  }),
  submission_key: z.string().optional(),
  honeypot: z.string().optional(),
});

export type TutorFormInput = z.infer<typeof TutorFormSchema>;
