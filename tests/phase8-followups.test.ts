import { describe, it, expect, beforeEach } from "vitest";
import {
  STUDENT_WELCOME,
  TUTOR_WELCOME,
  DEMO_CONFIRMATION_STUDENT,
  DEMO_CONFIRMATION_TUTOR,
  PAYMENT_REMINDER,
  FOLLOWUP_CHECKIN,
  WHATSAPP_TEMPLATES,
  TEMPLATE_LIST,
  interpolateTemplate,
  buildWhatsAppUrl,
} from "@/lib/whatsapp/templates";
import { generateId, isValidId } from "@/lib/id-generator";
import {
  inMemoryFollowupsRepo,
  createFollowup,
  getFollowups,
  updateFollowup,
} from "@/lib/followups/followup-store";
import { GET as getFollowupsHandler, POST as postFollowupHandler } from "@/app/api/admin/followups/route";
import { GET as getFollowupByIdHandler, PATCH as patchFollowupHandler } from "@/app/api/admin/followups/[id]/route";
import { NextRequest } from "next/server";

describe("Phase 8 — Follow-ups & WhatsApp Templates Tests", () => {
  beforeEach(() => {
    inMemoryFollowupsRepo.clear();
  });

  describe("1. WhatsApp Templates & Variable Interpolation (Section 19)", () => {
    it("contains all standard Indian tuition bureau templates", () => {
      expect(STUDENT_WELCOME).toBeDefined();
      expect(TUTOR_WELCOME).toBeDefined();
      expect(DEMO_CONFIRMATION_STUDENT).toBeDefined();
      expect(DEMO_CONFIRMATION_TUTOR).toBeDefined();
      expect(PAYMENT_REMINDER).toBeDefined();
      expect(FOLLOWUP_CHECKIN).toBeDefined();

      expect(WHATSAPP_TEMPLATES.STUDENT_WELCOME).toBe(STUDENT_WELCOME);
      expect(WHATSAPP_TEMPLATES.TUTOR_WELCOME).toBe(TUTOR_WELCOME);
      expect(WHATSAPP_TEMPLATES.DEMO_CONFIRMATION_STUDENT).toBe(DEMO_CONFIRMATION_STUDENT);
      expect(WHATSAPP_TEMPLATES.DEMO_CONFIRMATION_TUTOR).toBe(DEMO_CONFIRMATION_TUTOR);
      expect(WHATSAPP_TEMPLATES.PAYMENT_REMINDER).toBe(PAYMENT_REMINDER);
      expect(WHATSAPP_TEMPLATES.FOLLOWUP_CHECKIN).toBe(FOLLOWUP_CHECKIN);

      expect(TEMPLATE_LIST.length).toBeGreaterThanOrEqual(6);
    });

    it("interpolates student welcome template with all variables provided", () => {
      const vars = {
        student_name: "Aman Sharma",
        subject: "Mathematics",
        class: "10",
        bureau_name: "Apex Tutors",
        phone: "+91 9876543210",
      };

      const result = interpolateTemplate(STUDENT_WELCOME, vars);
      expect(result).toContain("Hello Aman Sharma, welcome to Apex Tutors!");
      expect(result).toContain("Mathematics tuition (Class 10)");
      expect(result).toContain("+91 9876543210");
      expect(result).not.toContain("{student_name}");
      expect(result).not.toContain("{subject}");
      expect(result).not.toContain("{class}");
      expect(result).not.toContain("{bureau_name}");
      expect(result).not.toContain("{phone}");
    });

    it("interpolates demo confirmation for student and tutor correctly", () => {
      const demoVars = {
        student_name: "Rohan Gupta",
        tutor_name: "Dr. S. K. Sinha",
        subject: "Physics",
        class: "12",
        demo_date: "14th Nov 2026",
        demo_time: "5:30 PM",
        address: "Flat 204, Shanti Enclave, Kankarbagh",
        bureau_name: "Patna Tutors Bureau",
        phone: "+91 9123456789",
      };

      const studentMessage = interpolateTemplate(DEMO_CONFIRMATION_STUDENT, demoVars);
      expect(studentMessage).toContain("Dear Rohan Gupta");
      expect(studentMessage).toContain("Dr. S. K. Sinha");
      expect(studentMessage).toContain("Physics (Class 12)");
      expect(studentMessage).toContain("14th Nov 2026 at 5:30 PM");
      expect(studentMessage).toContain("Flat 204, Shanti Enclave, Kankarbagh");

      const tutorMessage = interpolateTemplate(DEMO_CONFIRMATION_TUTOR, demoVars);
      expect(tutorMessage).toContain("Hello Dr. S. K. Sinha");
      expect(tutorMessage).toContain("student Rohan Gupta");
      expect(tutorMessage).toContain("Physics (Class 12)");
      expect(tutorMessage).toContain("14th Nov 2026 at 5:30 PM");
    });

    it("interpolates payment reminder and follow-up check-in templates", () => {
      const vars = {
        student_name: "Pooja Verma",
        subject: "Chemistry",
        class: "11",
        bureau_name: "Bright Future Bureau",
        phone: "9876543210",
      };

      const payReminder = interpolateTemplate(PAYMENT_REMINDER, vars);
      expect(payReminder).toContain("Dear Pooja Verma");
      expect(payReminder).toContain("pending tuition fee payment for Chemistry");
      expect(payReminder).toContain("Bright Future Bureau");

      const followCheckin = interpolateTemplate(FOLLOWUP_CHECKIN, vars);
      expect(followCheckin).toContain("Hi Pooja Verma");
      expect(followCheckin).toContain("Bright Future Bureau");
      expect(followCheckin).toContain("Chemistry (Class 11)");
    });

    it("replaces unknown placeholders with empty string and NEVER leaves raw {...} (Section 19)", () => {
      const rawTemplate = "Hello {student_name}, class is {class}. Address: {address}. Notes: {unknown_placeholder} {missing_field}!";
      const partialVars = {
        student_name: "Priya",
      };

      const result = interpolateTemplate(rawTemplate, partialVars);
      expect(result).toBe("Hello Priya, class is . Address: . Notes:  !");
      expect(result).not.toContain("{unknown_placeholder}");
      expect(result).not.toContain("{missing_field}");
      expect(result).not.toContain("{class}");
      expect(result).not.toContain("{address}");
      expect(result.includes("{")).toBe(false);
      expect(result.includes("}")).toBe(false);
    });

    it("handles common aliases gracefully (student_class <-> class, locality <-> address)", () => {
      const template = "Student in {student_class} at {locality}.";
      const vars = {
        class: "9th ICSE",
        address: "Boring Road, Patna",
      };

      const result = interpolateTemplate(template, vars);
      expect(result).toContain("Student in 9th ICSE");
      expect(result).toContain("at Boring Road, Patna");
    });

    it("returns empty string when templateText is empty", () => {
      expect(interpolateTemplate("")).toBe("");
    });
  });

  describe("2. WhatsApp Click-to-Chat Link Builder (Section 7.5 & 19)", () => {
    it("formats 10-digit Indian numbers by prepending 91", () => {
      const url = buildWhatsAppUrl("9876543210", "Hello tutor");
      expect(url).toBe("https://wa.me/919876543210?text=Hello%20tutor");
    });

    it("removes + from +91 Indian numbers", () => {
      const url = buildWhatsAppUrl("+919876543210", "Welcome to Tuition Bureau!");
      expect(url).toBe("https://wa.me/919876543210?text=Welcome%20to%20Tuition%20Bureau!");
    });

    it("cleans spaces, dashes and parentheses from phone string", () => {
      const url = buildWhatsAppUrl("+91 (987) 654-3210", "Test message");
      expect(url).toBe("https://wa.me/919876543210?text=Test%20message");
    });

    it("strips leading 0 from 11-digit numbers and prepends 91", () => {
      const url = buildWhatsAppUrl("09876543210", "Demo confirmation");
      expect(url).toBe("https://wa.me/919876543210?text=Demo%20confirmation");
    });

    it("properly URL-encodes special characters, newlines and unicode", () => {
      const complexMsg = "Hello! Demo at 5:00 PM & 100% attendance.\nLocation: Patna.";
      const url = buildWhatsAppUrl("9876543210", complexMsg);
      expect(url.startsWith("https://wa.me/919876543210?text=")).toBe(true);
      expect(url).toContain(encodeURIComponent(complexMsg));
    });

    it("returns empty string when phone number is missing", () => {
      expect(buildWhatsAppUrl("", "Hello")).toBe("");
    });
  });

  describe("3. Follow-up ID Generation & Format (Section 7.4)", () => {
    it("generates follow-up IDs with FOL prefix conforming to Section 7.4", () => {
      const id = generateId("FOL");
      expect(id.startsWith("FOL-")).toBe(true);
      expect(isValidId(id, "FOL")).toBe(true);

      const parts = id.split("-");
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe("FOL");
      expect(parts[1]).toHaveLength(4); // YYMM
      expect(parts[2]).toHaveLength(4); // 4 random safe chars
    });
  });

  describe("4. Follow-up Store & Operations (Section 20)", () => {
    it("creates a follow-up with generateId('FOL') and OPEN status", async () => {
      const item = await createFollowup({
        related_type: "STUDENT",
        related_id: "STU-2611-ABCD",
        due_at: new Date(Date.now() + 86400000).toISOString(),
        followup_type: "Call",
        description: "Follow up with parent regarding demo feedback",
        priority: "HIGH",
      });

      expect(item.followup_id.startsWith("FOL-")).toBe(true);
      expect(item.status).toBe("OPEN");
      expect(item.related_type).toBe("STUDENT");
      expect(item.related_id).toBe("STU-2611-ABCD");
      expect(item.priority).toBe("HIGH");
      expect(item.created_at).toBeDefined();
      expect(item.completed_at).toBeUndefined();
    });

    it("filters follow-ups by status, entity_type, priority and overdue", async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hr ago
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day future

      // Overdue student follow-up
      const f1 = await createFollowup({
        related_type: "STUDENT",
        related_id: "STU-001",
        due_at: pastDate,
        followup_type: "Call",
        description: "Overdue call to student parent",
        priority: "URGENT",
      });

      // Upcoming tutor follow-up
      const f2 = await createFollowup({
        related_type: "TUTOR",
        related_id: "TUT-001",
        due_at: futureDate,
        followup_type: "WhatsApp",
        description: "Send WhatsApp welcome to tutor",
        priority: "LOW",
      });

      // Done assignment follow-up
      const f3 = await createFollowup({
        related_type: "ASSIGNMENT",
        related_id: "ASN-001",
        due_at: pastDate,
        followup_type: "Visit",
        description: "Demo feedback",
        priority: "MEDIUM",
        status: "DONE",
      });

      // Test overdue filter
      const overdueList = await getFollowups({ overdue: true });
      expect(overdueList.some((f) => f.followup_id === f1.followup_id)).toBe(true);
      expect(overdueList.some((f) => f.followup_id === f2.followup_id)).toBe(false);
      expect(overdueList.some((f) => f.followup_id === f3.followup_id)).toBe(false); // f3 is DONE, so not overdue!

      // Test status filter
      const doneList = await getFollowups({ status: "DONE" });
      expect(doneList.length).toBe(1);
      expect(doneList[0].followup_id).toBe(f3.followup_id);

      // Test entity filter
      const tutorList = await getFollowups({ entity_type: "TUTOR" });
      expect(tutorList.length).toBe(1);
      expect(tutorList[0].related_id).toBe("TUT-001");

      // Test priority filter
      const urgentList = await getFollowups({ priority: "URGENT" });
      expect(urgentList.length).toBe(1);
      expect(urgentList[0].followup_id).toBe(f1.followup_id);
    });

    it("marks follow-up as DONE and sets completed_at timestamp", async () => {
      const item = await createFollowup({
        related_type: "STUDENT",
        related_id: "STU-002",
        due_at: new Date().toISOString(),
        followup_type: "Call",
        description: "Check syllabus completion",
      });

      expect(item.status).toBe("OPEN");
      expect(item.completed_at).toBeFalsy();

      const updated = await updateFollowup(item.followup_id, {
        status: "DONE",
      });

      expect(updated.status).toBe("DONE");
      expect(updated.completed_at).toBeDefined();
      expect(new Date(updated.completed_at!).getTime()).not.toBeNaN();
    });

    it("marks follow-up as CANCELLED and sets completed_at timestamp", async () => {
      const item = await createFollowup({
        related_type: "TUTOR",
        related_id: "TUT-002",
        due_at: new Date().toISOString(),
        followup_type: "Call",
        description: "Call tutor for interview",
      });

      const updated = await updateFollowup(item.followup_id, {
        status: "CANCELLED",
      });

      expect(updated.status).toBe("CANCELLED");
      expect(updated.completed_at).toBeDefined();
    });

    it("allows rescheduling a follow-up by updating due_at", async () => {
      const originalDue = new Date("2026-11-10T10:00:00Z").toISOString();
      const newDue = new Date("2026-11-15T14:30:00Z").toISOString();

      const item = await createFollowup({
        related_type: "STUDENT",
        related_id: "STU-003",
        due_at: originalDue,
        followup_type: "Call",
        description: "Call for confirmation",
      });

      const updated = await updateFollowup(item.followup_id, {
        due_at: newDue,
      });

      expect(updated.due_at).toBe(newDue);
      expect(updated.status).toBe("OPEN");
    });
  });

  describe("5. End-to-End API Route Handlers (route.ts)", () => {
    it("POST /api/admin/followups validates required fields", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // missing related_type, related_id, due_at, description
        }),
      });

      const res = await postFollowupHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("related_type");
    });

    it("POST /api/admin/followups creates follow-up and returns 201 with generateId('FOL')", async () => {
      const payload = {
        related_type: "STUDENT",
        related_id: "STU-2611-K7QX",
        due_at: new Date(Date.now() + 10000000).toISOString(),
        followup_type: "Call",
        description: "Discuss demo schedule with parent",
        priority: "HIGH",
      };

      const req = new NextRequest("http://localhost:3000/api/admin/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await postFollowupHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.followup.followup_id.startsWith("FOL-")).toBe(true);
      expect(json.followup.description).toBe(payload.description);
      expect(json.followup.status).toBe("OPEN");
    });

    it("GET /api/admin/followups returns list and filters by status, entity_type, priority, overdue", async () => {
      // Seed 2 followups
      await createFollowup({
        related_type: "STUDENT",
        related_id: "STU-A",
        due_at: new Date(Date.now() - 50000).toISOString(), // overdue
        followup_type: "Call",
        description: "Call student parent",
        priority: "URGENT",
      });
      await createFollowup({
        related_type: "TUTOR",
        related_id: "TUT-B",
        due_at: new Date(Date.now() + 50000000).toISOString(), // future
        followup_type: "WhatsApp",
        description: "WhatsApp tutor",
        priority: "LOW",
      });

      // Filter by overdue=true
      const overdueReq = new NextRequest("http://localhost:3000/api/admin/followups?overdue=true");
      const overdueRes = await getFollowupsHandler(overdueReq);
      const overdueJson = await overdueRes.json();
      expect(overdueJson.success).toBe(true);
      expect(overdueJson.followups.length).toBe(1);
      expect(overdueJson.followups[0].related_id).toBe("STU-A");

      // Filter by entity_type=TUTOR
      const tutorReq = new NextRequest("http://localhost:3000/api/admin/followups?entity_type=TUTOR");
      const tutorRes = await getFollowupsHandler(tutorReq);
      const tutorJson = await tutorRes.json();
      expect(tutorJson.success).toBe(true);
      expect(tutorJson.followups.length).toBe(1);
      expect(tutorJson.followups[0].related_id).toBe("TUT-B");
    });

    it("PATCH /api/admin/followups/[id] marks DONE, sets completed_at and returns 200", async () => {
      const item = await createFollowup({
        related_type: "STUDENT",
        related_id: "STU-PATCH-TEST",
        due_at: new Date().toISOString(),
        followup_type: "Call",
        description: "Initial follow-up test",
      });

      const patchReq = new NextRequest(
        `http://localhost:3000/api/admin/followups/${item.followup_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DONE" }),
        }
      );

      const res = await patchFollowupHandler(patchReq, {
        params: { id: item.followup_id },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.followup.status).toBe("DONE");
      expect(json.followup.completed_at).toBeDefined();
    });

    it("PATCH /api/admin/followups/[id] returns 400 for invalid status", async () => {
      const item = await createFollowup({
        related_type: "STUDENT",
        related_id: "STU-INVALID",
        due_at: new Date().toISOString(),
        followup_type: "Call",
        description: "Test invalid status",
      });

      const patchReq = new NextRequest(
        `http://localhost:3000/api/admin/followups/${item.followup_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "INVALID_STATUS" }),
        }
      );

      const res = await patchFollowupHandler(patchReq, {
        params: { id: item.followup_id },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("OPEN, DONE, or CANCELLED");
    });

    it("GET /api/admin/followups/[id] returns 404 for non-existent follow-up", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/followups/FOL-NON-EXISTENT");
      const res = await getFollowupByIdHandler(req, {
        params: { id: "FOL-NON-EXISTENT" },
      });
      expect(res.status).toBe(404);
    });
  });
});
