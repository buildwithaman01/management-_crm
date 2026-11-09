import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createAssignment,
  updateAssignmentStatus,
  listAssignments,
  checkDuplicateAssignment,
  inMemoryAssignmentStore,
  CreateAssignmentInput,
} from "@/features/assignments/assignments-service";
import {
  ALLOWED_ASSIGNMENT_TRANSITIONS,
  isValidAssignmentTransition,
  AssignmentStatus,
  DemoStatus,
} from "@/types/vocab";
import { Student, Tutor, Assignment } from "@/types/entities";
import { generateId, isValidId } from "@/lib/id-generator";
import { POST as createAssignmentRoute, GET as getAssignmentsRoute } from "@/app/api/admin/assignments/route";
import { PATCH as updateStatusRoute } from "@/app/api/admin/assignments/[id]/status/route";
import { NextRequest } from "next/server";

// Test fixture helpers
function createMockStudent(overrides: Partial<Student> = {}): Student {
  return {
    student_id: "STU-2611-S001",
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
    parent_name: "Anita Gupta",
    student_name: "Rahul Gupta",
    phone: "+919876543210",
    class: "Class 10",
    board: "CBSE",
    subjects: "Mathematics|Science",
    tuition_type: "HOME",
    locality: "Kankarbagh",
    tutor_gender_preference: "ANY",
    preferred_timing: "EVENING",
    budget: 5000,
    lead_status: "NEW",
    lead_source: "WEBSITE",
    consent_at: "2026-11-01T10:00:00Z",
    consent_version: "v1.0",
    archived: false,
    ...overrides,
  };
}

function createMockTutor(overrides: Partial<Tutor> = {}): Tutor {
  return {
    tutor_id: "TUT-2611-T001",
    created_at: "2026-10-15T10:00:00Z",
    updated_at: "2026-10-15T10:00:00Z",
    full_name: "Vikram Malhotra",
    phone: "+919876543211",
    gender: "MALE",
    current_city: "Patna",
    current_locality: "Kankarbagh",
    highest_qualification: "M.Sc Mathematics",
    subjects: "Mathematics|Science",
    classes: "Class 9|Class 10",
    experience_years: 6,
    teaching_mode: "HOME",
    localities: "Kankarbagh|Boring Road",
    expected_fee: 5000,
    photo_file_id: "photo_123",
    id_type: "AADHAAR",
    id_number: "123456789012",
    id_proof_file_id: "id_123",
    background_check_status: "VERIFIED",
    verification_status: "VERIFIED",
    availability_status: "ACTIVE",
    lead_source: "WEBSITE",
    consent_at: "2026-10-15T10:00:00Z",
    consent_version: "v1.0",
    archived: false,
    ...overrides,
  };
}

describe("Phase 7 — Assignments Module Tests", () => {
  beforeEach(() => {
    // Reset in-memory store before each test
    inMemoryAssignmentStore.reset();
  });

  // =========================================================================
  // 1. ID GENERATOR & VOCABULARY TRANSITIONS
  // =========================================================================
  describe("1. ID Generation & Vocabulary Transitions", () => {
    it("generates assignment ID with format ASG-YYMM-XXXX using generateId('ASG')", () => {
      const id = generateId("ASG");
      expect(id).toMatch(/^ASG-\d{4}-[A-HJ-NP-Z2-9]{4}$/);
      expect(isValidId(id, "ASG")).toBe(true);
    });

    it("verifies allowed status transitions match Section 7.2 specification exactly", () => {
      // Allowed moves from SHORTLISTED
      expect(ALLOWED_ASSIGNMENT_TRANSITIONS.SHORTLISTED).toEqual(["CONTACTED", "REJECTED", "CANCELLED"]);
      expect(isValidAssignmentTransition("SHORTLISTED", "CONTACTED")).toBe(true);
      expect(isValidAssignmentTransition("SHORTLISTED", "REJECTED")).toBe(true);
      expect(isValidAssignmentTransition("SHORTLISTED", "CANCELLED")).toBe(true);
      expect(isValidAssignmentTransition("SHORTLISTED", "ACTIVE")).toBe(false);

      // Allowed moves from CONTACTED
      expect(ALLOWED_ASSIGNMENT_TRANSITIONS.CONTACTED).toEqual(["ACCEPTED", "REJECTED", "CANCELLED"]);
      expect(isValidAssignmentTransition("CONTACTED", "ACCEPTED")).toBe(true);
      expect(isValidAssignmentTransition("CONTACTED", "DEMO_SCHEDULED")).toBe(false);

      // Allowed moves from ACCEPTED
      expect(ALLOWED_ASSIGNMENT_TRANSITIONS.ACCEPTED).toEqual(["DEMO_SCHEDULED", "ACTIVE", "CANCELLED"]);
      expect(isValidAssignmentTransition("ACCEPTED", "DEMO_SCHEDULED")).toBe(true);
      expect(isValidAssignmentTransition("ACCEPTED", "ACTIVE")).toBe(true);
      expect(isValidAssignmentTransition("ACCEPTED", "COMPLETED")).toBe(false);

      // Allowed moves from DEMO_SCHEDULED
      expect(ALLOWED_ASSIGNMENT_TRANSITIONS.DEMO_SCHEDULED).toEqual(["DEMO_COMPLETED", "CANCELLED"]);
      expect(isValidAssignmentTransition("DEMO_SCHEDULED", "DEMO_COMPLETED")).toBe(true);
      expect(isValidAssignmentTransition("DEMO_SCHEDULED", "ACTIVE")).toBe(false); // must complete demo first

      // Allowed moves from DEMO_COMPLETED
      expect(ALLOWED_ASSIGNMENT_TRANSITIONS.DEMO_COMPLETED).toEqual(["ACTIVE", "REJECTED", "CANCELLED"]);
      expect(isValidAssignmentTransition("DEMO_COMPLETED", "ACTIVE")).toBe(true);
      expect(isValidAssignmentTransition("DEMO_COMPLETED", "REJECTED")).toBe(true);

      // Allowed moves from ACTIVE
      expect(ALLOWED_ASSIGNMENT_TRANSITIONS.ACTIVE).toEqual(["COMPLETED", "CANCELLED"]);
      expect(isValidAssignmentTransition("ACTIVE", "COMPLETED")).toBe(true);
      expect(isValidAssignmentTransition("ACTIVE", "CANCELLED")).toBe(true);
      expect(isValidAssignmentTransition("ACTIVE", "SHORTLISTED")).toBe(false);

      // Terminal states (final; no moves)
      expect(ALLOWED_ASSIGNMENT_TRANSITIONS.COMPLETED).toEqual([]);
      expect(ALLOWED_ASSIGNMENT_TRANSITIONS.CANCELLED).toEqual([]);
      expect(ALLOWED_ASSIGNMENT_TRANSITIONS.REJECTED).toEqual([]);

      expect(isValidAssignmentTransition("COMPLETED", "ACTIVE")).toBe(false);
      expect(isValidAssignmentTransition("CANCELLED", "SHORTLISTED")).toBe(false);
      expect(isValidAssignmentTransition("REJECTED", "ACCEPTED")).toBe(false);
    });
  });

  // =========================================================================
  // 2. ASSIGNMENT CREATION & VALIDATION
  // =========================================================================
  describe("2. Assignment Creation & Existence Checks", () => {
    it("fails creation if student does not exist", async () => {
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedTutors([tutor]);

      await expect(
        createAssignment({
          student_id: "STU-NON-EXISTENT",
          tutor_id: tutor.tutor_id,
          subjects: "Mathematics",
        })
      ).rejects.toThrow('Student with ID "STU-NON-EXISTENT" does not exist.');
    });

    it("fails creation if tutor does not exist", async () => {
      const student = createMockStudent();
      inMemoryAssignmentStore.seedStudents([student]);

      await expect(
        createAssignment({
          student_id: student.student_id,
          tutor_id: "TUT-NON-EXISTENT",
          subjects: "Mathematics",
        })
      ).rejects.toThrow('Tutor with ID "TUT-NON-EXISTENT" does not exist.');
    });

    it("fails creation if subjects are empty", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      await expect(
        createAssignment({
          student_id: student.student_id,
          tutor_id: tutor.tutor_id,
          subjects: "",
        })
      ).rejects.toThrow("At least one subject is required");
    });

    it("successfully creates assignment with default status SHORTLISTED and demo_status NOT_SCHEDULED", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const assignment = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics|Science",
        agreed_fee: 5500,
        admin_notes: "Morning tuition",
      });

      expect(assignment.assignment_id).toMatch(/^ASG-\d{4}-[A-HJ-NP-Z2-9]{4}$/);
      expect(assignment.student_id).toBe(student.student_id);
      expect(assignment.tutor_id).toBe(tutor.tutor_id);
      expect(assignment.subjects).toBe("Mathematics|Science");
      expect(assignment.agreed_fee).toBe(5500);
      expect(assignment.assignment_status).toBe("SHORTLISTED");
      expect(assignment.demo_status).toBe("NOT_SCHEDULED");
      expect(assignment.admin_notes).toBe("Morning tuition");
    });

    it("auto-schedules demo and sets status DEMO_SCHEDULED if demo_at is provided at creation", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const demoTime = "2026-11-10T11:00:00Z";
      const assignment = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Physics",
        demo_at: demoTime,
      });

      expect(assignment.assignment_status).toBe("DEMO_SCHEDULED");
      expect(assignment.demo_status).toBe("SCHEDULED");
      expect(assignment.demo_at).toBe(demoTime);
    });
  });

  // =========================================================================
  // 3. STUDENT LEAD_STATUS AUTOMATION
  // =========================================================================
  describe("3. Student Lead Status Automation (Section 7.2)", () => {
    it("updates student lead_status from NEW to TUTOR_SHORTLISTED when first assignment is created", async () => {
      const student = createMockStudent({ lead_status: "NEW" });
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
      });

      const updatedStudent = inMemoryAssignmentStore.getStudent(student.student_id);
      expect(updatedStudent?.lead_status).toBe("TUTOR_SHORTLISTED");
    });

    it("updates student lead_status to DEMO_SCHEDULED when assignment transitions to DEMO_SCHEDULED", async () => {
      const student = createMockStudent({ lead_status: "TUTOR_SHORTLISTED" });
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const assignment = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
        assignment_status: "ACCEPTED",
      });

      await updateAssignmentStatus({
        assignmentId: assignment.assignment_id,
        newStatus: "DEMO_SCHEDULED",
        demo_at: "2026-11-12T16:00:00Z",
      });

      const updatedStudent = inMemoryAssignmentStore.getStudent(student.student_id);
      expect(updatedStudent?.lead_status).toBe("DEMO_SCHEDULED");
    });

    it("updates student lead_status to CONVERTED when assignment transitions to ACTIVE", async () => {
      const student = createMockStudent({ lead_status: "DEMO_SCHEDULED" });
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const assignment = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
        assignment_status: "ACCEPTED",
      });

      // Transition ACCEPTED -> ACTIVE
      await updateAssignmentStatus({
        assignmentId: assignment.assignment_id,
        newStatus: "ACTIVE",
        start_date: "2026-11-15",
        agreed_fee: 6000,
      });

      const updatedStudent = inMemoryAssignmentStore.getStudent(student.student_id);
      expect(updatedStudent?.lead_status).toBe("CONVERTED");
    });
  });

  // =========================================================================
  // 4. DUPLICATE ASSIGNMENT DETECTION (Section 17)
  // =========================================================================
  describe("4. Duplicate Assignment Prevention", () => {
    it("detects exact duplicate when same student and tutor have overlapping subjects in non-final status", () => {
      const existing: Assignment[] = [
        {
          assignment_id: "ASG-2611-0001",
          student_id: "STU-001",
          tutor_id: "TUT-001",
          subjects: "Mathematics|Science",
          assignment_status: "ACTIVE",
          demo_status: "COMPLETED",
          created_at: "2026-11-01T10:00:00Z",
          updated_at: "2026-11-01T10:00:00Z",
          created_by: "admin",
        },
      ];

      // Overlapping subject Mathematics
      const result1 = checkDuplicateAssignment(existing, "STU-001", "TUT-001", "Mathematics");
      expect(result1.isDuplicate).toBe(true);

      // Overlapping subject Science|English
      const result2 = checkDuplicateAssignment(existing, "STU-001", "TUT-001", "Science|English");
      expect(result2.isDuplicate).toBe(true);

      // Non-overlapping subject History
      const result3 = checkDuplicateAssignment(existing, "STU-001", "TUT-001", "History");
      expect(result3.isDuplicate).toBe(false);

      // Different tutor
      const result4 = checkDuplicateAssignment(existing, "STU-001", "TUT-002", "Mathematics");
      expect(result4.isDuplicate).toBe(false);
    });

    it("allows new assignment if existing assignment with same tutor/subject is in a final state (COMPLETED or CANCELLED)", () => {
      const existing: Assignment[] = [
        {
          assignment_id: "ASG-2611-0001",
          student_id: "STU-001",
          tutor_id: "TUT-001",
          subjects: "Mathematics",
          assignment_status: "COMPLETED",
          demo_status: "COMPLETED",
          created_at: "2026-10-01T10:00:00Z",
          updated_at: "2026-10-25T10:00:00Z",
          created_by: "admin",
        },
      ];

      const result = checkDuplicateAssignment(existing, "STU-001", "TUT-001", "Mathematics");
      expect(result.isDuplicate).toBe(false);
    });

    it("blocks creation when duplicate exists unless force=true is provided", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
      });

      // Attempt to create second overlapping assignment without force
      await expect(
        createAssignment({
          student_id: student.student_id,
          tutor_id: tutor.tutor_id,
          subjects: "Mathematics|Physics",
        })
      ).rejects.toThrow("already exists for this student and tutor");

      // With force=true, it succeeds
      const forced = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics|Physics",
        force: true,
      });
      expect(forced.assignment_id).toBeDefined();
    });
  });

  // =========================================================================
  // 5. STATUS TRANSITIONS & DEMO WORKFLOW
  // =========================================================================
  describe("5. Status Transitions & Demo Workflow Rules", () => {
    it("enforces full workflow: SHORTLISTED -> CONTACTED -> ACCEPTED -> DEMO_SCHEDULED -> DEMO_COMPLETED -> ACTIVE -> COMPLETED", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      // 1. Initial creation
      const asg1 = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
      });
      expect(asg1.assignment_status).toBe("SHORTLISTED");

      // 2. SHORTLISTED -> CONTACTED
      const asg2 = await updateAssignmentStatus({
        assignmentId: asg1.assignment_id,
        newStatus: "CONTACTED",
      });
      expect(asg2.assignment_status).toBe("CONTACTED");

      // 3. CONTACTED -> ACCEPTED
      const asg3 = await updateAssignmentStatus({
        assignmentId: asg2.assignment_id,
        newStatus: "ACCEPTED",
      });
      expect(asg3.assignment_status).toBe("ACCEPTED");

      // 4. ACCEPTED -> DEMO_SCHEDULED (requires demo_at)
      const demoTime = "2026-11-12T15:00:00Z";
      const asg4 = await updateAssignmentStatus({
        assignmentId: asg3.assignment_id,
        newStatus: "DEMO_SCHEDULED",
        demo_at: demoTime,
      });
      expect(asg4.assignment_status).toBe("DEMO_SCHEDULED");
      expect(asg4.demo_status).toBe("SCHEDULED");
      expect(asg4.demo_at).toBe(demoTime);

      // 5. DEMO_SCHEDULED -> DEMO_COMPLETED
      const asg5 = await updateAssignmentStatus({
        assignmentId: asg4.assignment_id,
        newStatus: "DEMO_COMPLETED",
      });
      expect(asg5.assignment_status).toBe("DEMO_COMPLETED");
      expect(asg5.demo_status).toBe("COMPLETED");

      // 6. DEMO_COMPLETED -> ACTIVE (sets start_date & agreed_fee)
      const asg6 = await updateAssignmentStatus({
        assignmentId: asg5.assignment_id,
        newStatus: "ACTIVE",
        start_date: "2026-11-15",
        agreed_fee: 5000,
      });
      expect(asg6.assignment_status).toBe("ACTIVE");
      expect(asg6.start_date).toBe("2026-11-15");
      expect(asg6.agreed_fee).toBe(5000);

      // 7. ACTIVE -> COMPLETED (sets end_date)
      const asg7 = await updateAssignmentStatus({
        assignmentId: asg6.assignment_id,
        newStatus: "COMPLETED",
        end_date: "2026-12-15",
      });
      expect(asg7.assignment_status).toBe("COMPLETED");
      expect(asg7.end_date).toBe("2026-12-15");

      // 8. Attempt move from COMPLETED (terminal state) -> should fail
      await expect(
        updateAssignmentStatus({
          assignmentId: asg7.assignment_id,
          newStatus: "ACTIVE",
        })
      ).rejects.toThrow("Invalid transition: cannot change status from \"COMPLETED\" to \"ACTIVE\"");
    });

    it("rejects transitioning to DEMO_SCHEDULED without demo_at date/time", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const asg = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
        assignment_status: "ACCEPTED",
      });

      await expect(
        updateAssignmentStatus({
          assignmentId: asg.assignment_id,
          newStatus: "DEMO_SCHEDULED",
          // missing demo_at!
        })
      ).rejects.toThrow("demo_at");
    });

    it("rejects illegal transitions directly jumping over workflow", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const asg = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
      });

      // SHORTLISTED cannot jump directly to ACTIVE
      await expect(
        updateAssignmentStatus({
          assignmentId: asg.assignment_id,
          newStatus: "ACTIVE",
        })
      ).rejects.toThrow("Invalid transition");

      // SHORTLISTED cannot jump directly to COMPLETED
      await expect(
        updateAssignmentStatus({
          assignmentId: asg.assignment_id,
          newStatus: "COMPLETED",
        })
      ).rejects.toThrow("Invalid transition");
    });

    it("rejects transition if expectedUpdatedAt does not match (optimistic concurrency)", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const asg = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
      });

      await expect(
        updateAssignmentStatus({
          assignmentId: asg.assignment_id,
          newStatus: "CONTACTED",
          expectedUpdatedAt: "2020-01-01T00:00:00Z", // Stale date!
        })
      ).rejects.toThrow("This record was changed by someone else. Reload and try again.");
    });

    it("allows reopening an accidentally CANCELLED assignment back to SHORTLISTED or ACCEPTED", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const asg = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
      });

      // Cancel assignment
      const cancelled = await updateAssignmentStatus({
        assignmentId: asg.assignment_id,
        newStatus: "CANCELLED",
      });
      expect(cancelled.assignment_status).toBe("CANCELLED");

      // Reopen assignment back to SHORTLISTED
      const reopened = await updateAssignmentStatus({
        assignmentId: asg.assignment_id,
        newStatus: "SHORTLISTED",
        reopen: true,
      });
      expect(reopened.assignment_status).toBe("SHORTLISTED");
      expect(reopened.end_date).toBe("");
    });
  });

  // =========================================================================
  // 6. MULTIPLE ASSIGNMENTS & HISTORY PRESERVATION
  // =========================================================================
  describe("6. Multiple Assignments & History Preservation (Section 17)", () => {
    it("allows a student to have multiple tutors for different subjects simultaneously", async () => {
      const student = createMockStudent();
      const tutorMath = createMockTutor({ tutor_id: "TUT-MATH-001", full_name: "Math Specialist" });
      const tutorScience = createMockTutor({ tutor_id: "TUT-SCI-002", full_name: "Science Specialist" });

      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutorMath, tutorScience]);

      const asgMath = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutorMath.tutor_id,
        subjects: "Mathematics",
        assignment_status: "ACTIVE",
      });

      const asgScience = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutorScience.tutor_id,
        subjects: "Science",
        assignment_status: "ACTIVE",
      });

      const list = await listAssignments({ studentId: student.student_id });
      expect(list.length).toBe(2);
      expect(list.map((a) => a.tutor_id)).toContain(tutorMath.tutor_id);
      expect(list.map((a) => a.tutor_id)).toContain(tutorScience.tutor_id);
    });

    it("preserves history when a tutor is replaced (old assignment marked CANCELLED, new created)", async () => {
      const student = createMockStudent();
      const tutorOld = createMockTutor({ tutor_id: "TUT-OLD-001" });
      const tutorNew = createMockTutor({ tutor_id: "TUT-NEW-002" });

      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutorOld, tutorNew]);

      // Old assignment reaches ACTIVE then cancelled
      const oldAsg = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutorOld.tutor_id,
        subjects: "Mathematics",
        assignment_status: "ACTIVE",
      });

      await updateAssignmentStatus({
        assignmentId: oldAsg.assignment_id,
        newStatus: "CANCELLED",
        admin_notes: "Tutor relocated; assigning new tutor",
      });

      // New assignment created
      const newAsg = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutorNew.tutor_id,
        subjects: "Mathematics",
      });

      const history = await listAssignments({ studentId: student.student_id });
      expect(history.length).toBe(2);

      const foundOld = history.find((a) => a.assignment_id === oldAsg.assignment_id);
      const foundNew = history.find((a) => a.assignment_id === newAsg.assignment_id);

      expect(foundOld?.assignment_status).toBe("CANCELLED");
      expect(foundOld?.admin_notes).toBe("Tutor relocated; assigning new tutor");
      expect(foundNew?.assignment_status).toBe("SHORTLISTED");
    });
  });

  // =========================================================================
  // 7. API ROUTE HANDLERS (/api/admin/assignments)
  // =========================================================================
  describe("7. API Route Integration Tests", () => {
    it("POST /api/admin/assignments successfully creates an assignment and returns 201", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const req = new NextRequest("http://localhost:3000/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.student_id,
          tutor_id: tutor.tutor_id,
          subjects: "Mathematics",
          agreed_fee: 4500,
        }),
      });

      const res = await createAssignmentRoute(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.assignment.assignment_id).toMatch(/^ASG-/);
      expect(json.assignment.subjects).toBe("Mathematics");
    });

    it("POST /api/admin/assignments returns 400 when missing required fields", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: "",
          tutor_id: "TUT-001",
        }),
      });

      const res = await createAssignmentRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("student_id is required");
    });

    it("GET /api/admin/assignments returns assignments list with filtering", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
        assignment_status: "ACTIVE",
      });

      const req = new NextRequest(`http://localhost:3000/api/admin/assignments?studentId=${student.student_id}&status=ACTIVE`);
      const res = await getAssignmentsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.assignments.length).toBe(1);
      expect(json.assignments[0].assignment_status).toBe("ACTIVE");
    });

    it("PATCH /api/admin/assignments/[id]/status executes valid transition and returns 200", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const asg = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
        assignment_status: "SHORTLISTED",
      });

      const req = new NextRequest(`http://localhost:3000/api/admin/assignments/${asg.assignment_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONTACTED",
        }),
      });

      const res = await updateStatusRoute(req, { params: { id: asg.assignment_id } });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.assignment.assignment_status).toBe("CONTACTED");
    });

    it("PATCH /api/admin/assignments/[id]/status rejects invalid transition with 400", async () => {
      const student = createMockStudent();
      const tutor = createMockTutor();
      inMemoryAssignmentStore.seedStudents([student]);
      inMemoryAssignmentStore.seedTutors([tutor]);

      const asg = await createAssignment({
        student_id: student.student_id,
        tutor_id: tutor.tutor_id,
        subjects: "Mathematics",
        assignment_status: "SHORTLISTED",
      });

      const req = new NextRequest(`http://localhost:3000/api/admin/assignments/${asg.assignment_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ACTIVE", // Disallowed jump!
        }),
      });

      const res = await updateStatusRoute(req, { params: { id: asg.assignment_id } });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Invalid transition");
    });

    it("PATCH /api/admin/assignments/[id]/status returns 404 for non-existent assignment", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/assignments/ASG-NONEXISTENT/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONTACTED",
        }),
      });

      const res = await updateStatusRoute(req, { params: { id: "ASG-NONEXISTENT" } });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toContain("not found");
    });
  });
});
