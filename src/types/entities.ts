import {
  LeadStatus,
  TutorVerificationStatus,
  TutorAvailabilityStatus,
  BackgroundCheckStatus,
  AssignmentStatus,
  DemoStatus,
  FollowUpStatus,
  PaymentStatus,
  PaymentType,
  LeadSource,
  TuitionType,
  TeachingMode,
  GenderPreference,
  Gender,
  TimingPreference,
} from "./vocab";

export interface Student {
  student_id: string;
  created_at: string;
  updated_at: string;
  parent_name: string;
  student_name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  class: string;
  board: string;
  subjects: string; // pipe-separated
  school_name?: string;
  tuition_type: TuitionType;
  locality: string;
  tutor_gender_preference: GenderPreference;
  preferred_timing: TimingPreference;
  budget?: number | string;
  classes_per_week?: number | string;
  academic_requirements?: string;
  other_requirements?: string;
  lead_status: LeadStatus;
  lead_source: LeadSource;
  admin_notes?: string;
  consent_at: string;
  consent_version: string;
  submission_key?: string;
  duplicate_of?: string;
  archived: boolean;
}

export interface Tutor {
  tutor_id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  gender: Gender;
  dob?: string;
  current_city: string;
  current_locality?: string;
  address?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  highest_qualification: string;
  specialization?: string;
  university?: string;
  course?: string;
  graduation_year?: string;
  certifications?: string;
  subjects: string; // pipe-separated
  secondary_subjects?: string; // pipe-separated
  classes: string; // pipe-separated
  boards?: string; // pipe-separated
  experience_years: number;
  teaching_mode: TeachingMode;
  localities: string; // pipe-separated
  expected_fee: number;
  available_hours_per_week?: number;
  available_timings?: string; // pipe-separated
  available_days?: string; // pipe-separated
  introduction?: string;
  linkedin_url?: string;
  resume_file_id?: string;
  photo_file_id: string; // required
  qualification_file_ids?: string; // pipe-separated
  id_type: string;
  id_number: string;
  id_proof_file_id: string;
  address_proof_file_id?: string;
  degree_proof_file_id?: string;
  reference_name?: string;
  reference_contact?: string;
  background_check_status: BackgroundCheckStatus;
  verification_status: TutorVerificationStatus;
  availability_status: TutorAvailabilityStatus;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  blacklist_reason?: string;
  admin_notes?: string;
  lead_source: LeadSource;
  consent_at: string;
  consent_version: string;
  submission_key?: string;
  last_confirmed_at?: string;
  archived: boolean;
  custom_1?: string;
  custom_2?: string;
  custom_3?: string;
  custom_4?: string;
  custom_5?: string;
}

export interface Assignment {
  assignment_id: string;
  student_id: string;
  tutor_id: string;
  subjects: string; // pipe-separated
  created_at: string;
  updated_at: string;
  created_by: string;
  assignment_status: AssignmentStatus;
  demo_at?: string;
  demo_status: DemoStatus;
  start_date?: string;
  end_date?: string;
  agreed_fee?: number | string;
  admin_notes?: string;
}

export interface FollowUp {
  followup_id: string;
  related_type: "STUDENT" | "TUTOR" | "ASSIGNMENT";
  related_id: string;
  due_at: string;
  followup_type: string;
  description: string;
  status: FollowUpStatus;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigned_admin?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Payment {
  payment_id: string;
  student_id?: string;
  tutor_id?: string;
  assignment_id?: string;
  payment_type: PaymentType;
  amount: number;
  payment_date: string;
  payment_mode: string;
  payment_status: PaymentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  activity_id: string;
  timestamp: string;
  admin_id: string;
  entity_type: "STUDENT" | "TUTOR" | "ASSIGNMENT" | "FOLLOWUP" | "PAYMENT" | "SETTINGS" | "AUTH";
  entity_id: string;
  action: string;
  description: string;
  changes?: string; // JSON string without sensitive fields
}

export interface Lookup {
  lookup_type: string;
  value: string;
  label_en: string;
  label_hi?: string;
  sort_order: number;
  active: boolean;
}

export interface LocalityLink {
  locality_a: string;
  locality_b: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface MessageTemplate {
  template_id: string;
  name: string;
  audience: "STUDENT" | "TUTOR";
  body: string;
  active: boolean;
  updated_at: string;
}
