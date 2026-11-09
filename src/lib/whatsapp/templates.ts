/**
 * WhatsApp Templates and Click-to-Chat Link Builder
 * Adheres to TUITION_BUREAU_CRM_SPEC Sections 7.5, 18, 19, and 28.
 */

export interface WhatsAppTemplate {
  id: string;
  name: string;
  title: string;
  audience: "STUDENT" | "TUTOR" | "GENERAL";
  description: string;
  body: string;
}

export const STUDENT_WELCOME = `Hello {student_name}, welcome to {bureau_name}! We have received your request for {subject} tuition (Class {class}). Our coordinator will review your requirements and share verified tutor profiles shortly. If you have any questions, feel free to reply here or call us at {phone}.`;

export const TUTOR_WELCOME = `Hello {tutor_name}, welcome to {bureau_name}! Thank you for registering as a home/online tutor with us. Your documents and profile are currently under review. Once verified, we will match you with tuition assignments matching your expertise in {subject}. Feel free to contact us at {phone}.`;

export const DEMO_CONFIRMATION_STUDENT = `Dear {student_name}, your demo class with tutor {tutor_name} for {subject} (Class {class}) has been scheduled for {demo_date} at {demo_time}. Location: {address}. Please ensure the student is ready 5 minutes before time. Contact {phone} for any assistance. - {bureau_name}`;

export const DEMO_CONFIRMATION_TUTOR = `Hello {tutor_name}, your demo class with student {student_name} for {subject} (Class {class}) is confirmed for {demo_date} at {demo_time}. Address: {address}. Please carry your notes and arrive 5 minutes early. Best wishes, {bureau_name} ({phone}).`;

export const PAYMENT_REMINDER = `Dear {student_name}, this is a gentle reminder regarding the pending tuition fee payment for {subject} with {bureau_name}. Kindly arrange the payment at your earliest convenience to keep classes running smoothly. If already paid, please ignore this message. Contact: {phone}.`;

export const FOLLOWUP_CHECKIN = `Hi {student_name}, this is {bureau_name} checking in regarding your recent tuition inquiry for {subject} (Class {class}). Would you like us to proceed with scheduling tutor demos or do you have any specific requirements? Please let us know or call us at {phone}.`;

// Standard Indian Tuition Bureau Templates mapping
export const WHATSAPP_TEMPLATES: Record<string, string> = {
  STUDENT_WELCOME,
  TUTOR_WELCOME,
  DEMO_CONFIRMATION_STUDENT,
  DEMO_CONFIRMATION_TUTOR,
  PAYMENT_REMINDER,
  FOLLOWUP_CHECKIN,
};

export const TEMPLATE_LIST: WhatsAppTemplate[] = [
  {
    id: "STUDENT_WELCOME",
    name: "Student Welcome",
    title: "Student Welcome & Acknowledgment",
    audience: "STUDENT",
    description: "Sent after student/parent submits a tuition requirement",
    body: STUDENT_WELCOME,
  },
  {
    id: "TUTOR_WELCOME",
    name: "Tutor Welcome",
    title: "Tutor Registration Acknowledgment",
    audience: "TUTOR",
    description: "Sent after a tutor registers and submits documents",
    body: TUTOR_WELCOME,
  },
  {
    id: "DEMO_CONFIRMATION_STUDENT",
    name: "Demo Confirmation (Student)",
    title: "Demo Class Scheduled (Parent/Student)",
    audience: "STUDENT",
    description: "Details of tutor, subject, date, time and location for parent",
    body: DEMO_CONFIRMATION_STUDENT,
  },
  {
    id: "DEMO_CONFIRMATION_TUTOR",
    name: "Demo Confirmation (Tutor)",
    title: "Demo Class Scheduled (Tutor)",
    audience: "TUTOR",
    description: "Details of student, subject, demo date, time and location for tutor",
    body: DEMO_CONFIRMATION_TUTOR,
  },
  {
    id: "PAYMENT_REMINDER",
    name: "Payment Reminder",
    title: "Pending Fee Payment Reminder",
    audience: "STUDENT",
    description: "Gentle reminder for tuition fee or registration deposit",
    body: PAYMENT_REMINDER,
  },
  {
    id: "FOLLOWUP_CHECKIN",
    name: "Follow-up Check-in",
    title: "General Follow-up & Requirement Check-in",
    audience: "STUDENT",
    description: "Follow-up check-in on open inquiries or demo feedback",
    body: FOLLOWUP_CHECKIN,
  },
];

export interface TemplateVariables {
  student_name?: string;
  parent_name?: string;
  tutor_name?: string;
  subject?: string;
  class?: string;
  student_class?: string;
  demo_date?: string;
  demo_time?: string;
  address?: string;
  locality?: string;
  bureau_name?: string;
  phone?: string;
  agreed_fee?: string | number;
  [key: string]: string | number | undefined | null;
}

/**
 * Replaces placeholders like {student_name}, {tutor_name}, {subject}, etc.
 * Unknown placeholders or undefined/null values are replaced with empty string (never prints raw {...}).
 */
export function interpolateTemplate(
  templateText: string,
  variables: TemplateVariables = {}
): string {
  if (!templateText) return "";

  // Normalize aliases if provided
  const normalizedVars: Record<string, string> = {};

  for (const [key, val] of Object.entries(variables)) {
    if (val !== undefined && val !== null) {
      normalizedVars[key] = String(val).trim();
    }
  }

  // Handle common aliases
  if (!normalizedVars.class && normalizedVars.student_class) {
    normalizedVars.class = normalizedVars.student_class;
  }
  if (!normalizedVars.student_class && normalizedVars.class) {
    normalizedVars.student_class = normalizedVars.class;
  }
  if (!normalizedVars.address && normalizedVars.locality) {
    normalizedVars.address = normalizedVars.locality;
  }
  if (!normalizedVars.locality && normalizedVars.address) {
    normalizedVars.locality = normalizedVars.address;
  }
  if (!normalizedVars.bureau_name) {
    normalizedVars.bureau_name = "Tuition Bureau";
  }

  // Match all {placeholder} patterns
  return templateText.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, varName) => {
    const value = normalizedVars[varName];
    return value !== undefined ? value : "";
  });
}

/**
 * Normalizes Indian and international phone numbers for WhatsApp wa.me links.
 * Strips '+' or non-digits, prepends '91' for 10-digit Indian numbers,
 * removes leading '0' prefix, and returns 'https://wa.me/{phone}?text={message}'.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  if (!phone) return "";

  // Remove non-digit characters
  let digits = phone.replace(/\D/g, "");

  // If 11 digits starting with '0', remove the '0' prefix
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.substring(1);
  }

  // If 10 digits (standard Indian mobile number), prepend India country code 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  const encodedMessage = encodeURIComponent(message || "");
  return `https://wa.me/${digits}?text=${encodedMessage}`;
}
