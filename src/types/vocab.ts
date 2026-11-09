/**
 * Fixed vocabulary for Tuition Bureau CRM.
 * Statuses and codes are stored in Google Sheets and databases.
 * UI displays friendly labels.
 */

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "TUTOR_SHORTLISTED",
  "DEMO_SCHEDULED",
  "CONVERTED",
  "ON_HOLD",
  "LOST",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const TUTOR_VERIFICATION_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  "BLACKLISTED",
] as const;
export type TutorVerificationStatus = (typeof TUTOR_VERIFICATION_STATUSES)[number];

export const TUTOR_AVAILABILITY_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "TEMPORARILY_UNAVAILABLE",
] as const;
export type TutorAvailabilityStatus = (typeof TUTOR_AVAILABILITY_STATUSES)[number];

export const BACKGROUND_CHECK_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "VERIFIED",
  "FAILED",
] as const;
export type BackgroundCheckStatus = (typeof BACKGROUND_CHECK_STATUSES)[number];

export const ASSIGNMENT_STATUSES = [
  "SHORTLISTED",
  "CONTACTED",
  "ACCEPTED",
  "DEMO_SCHEDULED",
  "DEMO_COMPLETED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const DEMO_STATUSES = [
  "NOT_SCHEDULED",
  "SCHEDULED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

export const FOLLOWUP_STATUSES = ["OPEN", "DONE", "CANCELLED"] as const;
export type FollowUpStatus = (typeof FOLLOWUP_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_TYPES = [
  "REGISTRATION_FEE",
  "BUREAU_COMMISSION",
  "OTHER_SERVICE_FEE",
] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const LEAD_SOURCES = [
  "WEBSITE",
  "PHONE",
  "WALK_IN",
  "WHATSAPP",
  "REFERRAL",
  "OTHER",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const TUITION_TYPES = ["HOME", "ONLINE", "BOTH"] as const;
export type TuitionType = (typeof TUITION_TYPES)[number];

export const TEACHING_MODES = ["HOME", "ONLINE", "BOTH"] as const;
export type TeachingMode = (typeof TEACHING_MODES)[number];

export const GENDER_PREFERENCES = ["MALE", "FEMALE", "ANY"] as const;
export type GenderPreference = (typeof GENDER_PREFERENCES)[number];

export const GENDERS = [
  "FEMALE",
  "MALE",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
] as const;
export type Gender = (typeof GENDERS)[number];

export const TIMING_PREFERENCES = [
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "FLEXIBLE",
] as const;
export type TimingPreference = (typeof TIMING_PREFERENCES)[number];

/**
 * Allowed status transitions for Assignments (Section 7.2)
 */
export const ALLOWED_ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  SHORTLISTED: ["CONTACTED", "REJECTED", "CANCELLED"],
  CONTACTED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["DEMO_SCHEDULED", "ACTIVE", "CANCELLED"],
  DEMO_SCHEDULED: ["DEMO_COMPLETED", "CANCELLED"],
  DEMO_COMPLETED: ["ACTIVE", "REJECTED", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

export function isValidAssignmentTransition(from: AssignmentStatus, to: AssignmentStatus): boolean {
  const allowed = ALLOWED_ASSIGNMENT_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Human-friendly labels for UI
 */
export const STATUS_LABELS: Record<string, string> = {
  NEW: "New Lead",
  CONTACTED: "Contacted",
  TUTOR_SHORTLISTED: "Tutor Shortlisted",
  DEMO_SCHEDULED: "Demo Scheduled",
  DEMO_COMPLETED: "Demo Completed",
  CONVERTED: "Converted",
  ON_HOLD: "On Hold",
  LOST: "Lost",
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  BLACKLISTED: "Blacklisted",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  TEMPORARILY_UNAVAILABLE: "Temporarily Unavailable",
  SHORTLISTED: "Shortlisted",
  ACCEPTED: "Accepted",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  OPEN: "Open",
  DONE: "Done",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially Paid",
};
