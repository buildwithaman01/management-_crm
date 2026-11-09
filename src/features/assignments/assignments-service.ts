import { Assignment, Student, Tutor } from "@/types/entities";
import {
  AssignmentStatus,
  DemoStatus,
  isValidAssignmentTransition,
  ALLOWED_ASSIGNMENT_TRANSITIONS,
} from "@/types/vocab";
import { generateId } from "@/lib/id-generator";
import { GoogleSheetsAdapter } from "@/lib/google-sheets/adapter";
import { recordActivity } from "@/lib/activity-log/activity-logger";
import { splitMulti, joinMulti } from "@/lib/utils";

export interface CreateAssignmentInput {
  student_id: string;
  tutor_id: string;
  subjects: string | string[];
  agreed_fee?: number | string;
  demo_at?: string;
  demo_status?: DemoStatus;
  start_date?: string;
  end_date?: string;
  assignment_status?: AssignmentStatus;
  admin_notes?: string;
  created_by?: string;
  force?: boolean;
}

export interface UpdateAssignmentStatusInput {
  assignmentId: string;
  newStatus: AssignmentStatus;
  demo_at?: string;
  demo_status?: DemoStatus;
  start_date?: string;
  end_date?: string;
  agreed_fee?: number | string;
  admin_notes?: string;
  expectedUpdatedAt?: string;
  adminId?: string;
  reopen?: boolean;
}

// In-memory fallback stores for testing & development without Google Sheets
class AssignmentStore {
  private assignments: Map<string, Assignment> = new Map();
  private students: Map<string, Student> = new Map();
  private tutors: Map<string, Tutor> = new Map();

  reset() {
    this.assignments.clear();
    this.students.clear();
    this.tutors.clear();
  }

  seedStudents(students: Student[]) {
    for (const s of students) {
      this.students.set(s.student_id, { ...s });
    }
  }

  seedTutors(tutors: Tutor[]) {
    for (const t of tutors) {
      this.tutors.set(t.tutor_id, { ...t });
    }
  }

  seedAssignments(assignments: Assignment[]) {
    for (const a of assignments) {
      this.assignments.set(a.assignment_id, { ...a });
    }
  }

  getStudent(id: string): Student | undefined {
    return this.students.get(id);
  }

  updateStudent(student: Student) {
    this.students.set(student.student_id, { ...student });
  }

  getTutor(id: string): Tutor | undefined {
    return this.tutors.get(id);
  }

  getAssignment(id: string): Assignment | undefined {
    return this.assignments.get(id);
  }

  listAssignments(): Assignment[] {
    return Array.from(this.assignments.values());
  }

  saveAssignment(assignment: Assignment) {
    this.assignments.set(assignment.assignment_id, { ...assignment });
  }
}

export const inMemoryAssignmentStore = new AssignmentStore();

/**
 * Checks whether an active/pending assignment already exists for
 * the same student and tutor with overlapping subjects (Section 17).
 */
export function checkDuplicateAssignment(
  existingAssignments: Assignment[],
  studentId: string,
  tutorId: string,
  subjects: string
): { isDuplicate: boolean; duplicateAssignment?: Assignment } {
  const finalStatuses: AssignmentStatus[] = ["COMPLETED", "CANCELLED", "REJECTED"];
  const newSubjects = splitMulti(subjects).map((s) => s.trim().toUpperCase());

  for (const existing of existingAssignments) {
    if (existing.student_id !== studentId || existing.tutor_id !== tutorId) {
      continue;
    }

    if (finalStatuses.includes(existing.assignment_status)) {
      continue;
    }

    const existingSubjects = splitMulti(existing.subjects).map((s) => s.trim().toUpperCase());
    const hasOverlap = newSubjects.some((s) => existingSubjects.includes(s));

    if (hasOverlap) {
      return { isDuplicate: true, duplicateAssignment: existing };
    }
  }

  return { isDuplicate: false };
}

/**
 * Helper to fetch data either from Google Sheets or In-Memory Store
 */
async function getEntitiesData(adapter?: GoogleSheetsAdapter) {
  const useSheets =
    Boolean(process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

  if (useSheets) {
    const sheetAdapter = adapter || new GoogleSheetsAdapter();
    const [students, tutors, assignments] = await Promise.all([
      sheetAdapter.readTab<Student>("Students", { skipCache: true, includeArchived: true }).catch(() => []),
      sheetAdapter.readTab<Tutor>("Tutors", { skipCache: true, includeArchived: true }).catch(() => []),
      sheetAdapter.readTab<Assignment>("Assignments", { skipCache: true, includeArchived: true }).catch(() => []),
    ]);
    return { students, tutors, assignments, useSheets, sheetAdapter };
  }

  return {
    students: Array.from(inMemoryAssignmentStore["students"].values()),
    tutors: Array.from(inMemoryAssignmentStore["tutors"].values()),
    assignments: inMemoryAssignmentStore.listAssignments(),
    useSheets: false,
    sheetAdapter: undefined,
  };
}

/**
 * Service to fetch all assignments with optional filters
 */
export async function listAssignments(filter?: {
  studentId?: string;
  tutorId?: string;
  status?: string;
  demoDate?: string;
  includeArchived?: boolean;
}): Promise<Assignment[]> {
  const { assignments } = await getEntitiesData();
  let result = [...assignments];

  if (filter?.studentId) {
    result = result.filter((a) => a.student_id === filter.studentId);
  }
  if (filter?.tutorId) {
    result = result.filter((a) => a.tutor_id === filter.tutorId);
  }
  if (filter?.status && filter.status !== "ALL") {
    result = result.filter((a) => a.assignment_status === filter.status);
  }
  if (filter?.demoDate) {
    result = result.filter((a) => a.demo_at && a.demo_at.startsWith(filter.demoDate!));
  }

  // Sort by created_at descending (newest first)
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return result;
}

/**
 * Create a new assignment adhering to Section 7 & 17
 */
export async function createAssignment(
  input: CreateAssignmentInput,
  adapter?: GoogleSheetsAdapter
): Promise<Assignment> {
  const { students, tutors, assignments, useSheets, sheetAdapter } = await getEntitiesData(adapter);

  // 1. Validate student existence
  const student = students.find((s) => s.student_id === input.student_id);
  if (!student) {
    throw new Error(`Student with ID "${input.student_id}" does not exist.`);
  }

  // 2. Validate tutor existence
  const tutor = tutors.find((t) => t.tutor_id === input.tutor_id);
  if (!tutor) {
    throw new Error(`Tutor with ID "${input.tutor_id}" does not exist.`);
  }

  // 3. Format subjects
  const formattedSubjects = Array.isArray(input.subjects)
    ? joinMulti(input.subjects)
    : input.subjects.trim();

  if (!formattedSubjects) {
    throw new Error("At least one subject is required for an assignment.");
  }

  // 4. Check exact duplicate (same student + same tutor + overlapping non-final subjects)
  if (!input.force) {
    const { isDuplicate, duplicateAssignment } = checkDuplicateAssignment(
      assignments,
      input.student_id,
      input.tutor_id,
      formattedSubjects
    );
    if (isDuplicate && duplicateAssignment) {
      throw new Error(
        `An active or pending assignment (${duplicateAssignment.assignment_id}) already exists for this student and tutor covering overlapping subjects.`
      );
    }
  }

  // 5. Generate assignment ID using generateId("ASG")
  const assignment_id = generateId("ASG");
  const now = new Date().toISOString();

  // 6. Handle demo scheduling & initial status
  let initialStatus: AssignmentStatus = input.assignment_status || "SHORTLISTED";
  let demoStatus: DemoStatus = input.demo_status || "NOT_SCHEDULED";

  if (input.demo_at) {
    demoStatus = "SCHEDULED";
    if (!input.assignment_status) {
      initialStatus = "DEMO_SCHEDULED";
    }
  }

  const newAssignment: Assignment = {
    assignment_id,
    student_id: input.student_id,
    tutor_id: input.tutor_id,
    subjects: formattedSubjects,
    created_at: now,
    updated_at: now,
    created_by: input.created_by || "admin",
    assignment_status: initialStatus,
    demo_at: input.demo_at || undefined,
    demo_status: demoStatus,
    start_date: input.start_date || undefined,
    end_date: input.end_date || undefined,
    agreed_fee: input.agreed_fee !== undefined ? Number(input.agreed_fee) : undefined,
    admin_notes: input.admin_notes || undefined,
  };

  // 7. Persist assignment
  if (useSheets && sheetAdapter) {
    await sheetAdapter.appendRecord("Assignments", newAssignment);
  } else {
    inMemoryAssignmentStore.saveAssignment(newAssignment);
  }

  // 8. Lead status automation (Section 7.2)
  let updatedStudentStatus: Student["lead_status"] | null = null;
  if (initialStatus === "DEMO_SCHEDULED") {
    updatedStudentStatus = "DEMO_SCHEDULED";
  } else if (initialStatus === "ACTIVE") {
    updatedStudentStatus = "CONVERTED";
  } else if (student.lead_status === "NEW" || student.lead_status === "CONTACTED") {
    updatedStudentStatus = "TUTOR_SHORTLISTED";
  }

  if (updatedStudentStatus && updatedStudentStatus !== student.lead_status) {
    if (useSheets && sheetAdapter) {
      try {
        await sheetAdapter.updateRecord<Student>(
          "Students",
          "student_id",
          student.student_id,
          { lead_status: updatedStudentStatus },
          student.updated_at
        );
      } catch (err) {
        console.warn("[Student Status Update Failed]", err);
      }
    } else {
      const updatedStudent: Student = {
        ...student,
        lead_status: updatedStudentStatus,
        updated_at: now,
      };
      inMemoryAssignmentStore.updateStudent(updatedStudent);
    }

    await recordActivity({
      adminId: input.created_by || "admin",
      entityType: "STUDENT",
      entityId: student.student_id,
      action: "UPDATE_STATUS",
      description: `Student status automated to ${updatedStudentStatus} upon assignment creation`,
      changes: { lead_status: [student.lead_status, updatedStudentStatus] },
      sheetsAdapter: sheetAdapter,
    });
  }

  // 9. ActivityLog for assignment creation
  await recordActivity({
    adminId: input.created_by || "admin",
    entityType: "ASSIGNMENT",
    entityId: assignment_id,
    action: "CREATE",
    description: `Created assignment ${assignment_id} for student ${student.student_name} (${student.student_id}) and tutor ${tutor.full_name} (${tutor.tutor_id}) for ${formattedSubjects}`,
    changes: {
      assignment_status: [null, initialStatus],
      demo_status: [null, demoStatus],
    },
    sheetsAdapter: sheetAdapter,
  });

  return newAssignment;
}

/**
 * Execute assignment status transitions adhering strictly to Section 7.2 & 17
 */
export async function updateAssignmentStatus(
  input: UpdateAssignmentStatusInput,
  adapter?: GoogleSheetsAdapter
): Promise<Assignment> {
  const { students, assignments, useSheets, sheetAdapter } = await getEntitiesData(adapter);

  // 1. Find assignment
  const existing = assignments.find((a) => a.assignment_id === input.assignmentId);
  if (!existing) {
    throw new Error(`Assignment with ID "${input.assignmentId}" not found.`);
  }

  // 2. Concurrency check (Section 6.1)
  if (input.expectedUpdatedAt && existing.updated_at !== input.expectedUpdatedAt) {
    if (existing.assignment_status === input.newStatus) {
      return existing;
    }
    if (!input.reopen) {
      throw new Error("This record was changed by someone else. Reload and try again.");
    }
  }

  const fromStatus = existing.assignment_status;
  const toStatus = input.newStatus;
  const isReopen = Boolean(input.reopen || fromStatus === "CANCELLED" || fromStatus === "REJECTED");

  // 3. Status transition rules (Section 7.2)
  if (fromStatus === toStatus) {
    // If status is identical, handle update of fields like demo_at, agreed_fee, notes
  } else if (
    isReopen &&
    (toStatus === "SHORTLISTED" || toStatus === "CONTACTED" || toStatus === "ACCEPTED" || toStatus === "DEMO_SCHEDULED")
  ) {
    // Admin authorized reopening / restoration from terminal cancelled state
  } else if (!isValidAssignmentTransition(fromStatus, toStatus)) {
    const allowed = ALLOWED_ASSIGNMENT_TRANSITIONS[fromStatus] || [];
    throw new Error(
      `Invalid transition: cannot change status from "${fromStatus}" to "${toStatus}". Allowed transitions are: [${allowed.join(", ")}].`
    );
  }

  const now = new Date().toISOString();
  const patch: Partial<Assignment> = {
    assignment_status: toStatus,
    updated_at: now,
  };

  if (isReopen && (fromStatus === "CANCELLED" || fromStatus === "REJECTED")) {
    patch.end_date = "";
    if (existing.demo_status === "CANCELLED") {
      patch.demo_status = "NOT_SCHEDULED";
    }
  }

  // 4. Target status specific requirements (Section 17)
  if (toStatus === "DEMO_SCHEDULED") {
    const demoAt = input.demo_at || existing.demo_at;
    if (!demoAt) {
      throw new Error("A demo date and time (demo_at) is required when transitioning to DEMO_SCHEDULED.");
    }
    patch.demo_at = demoAt;
    patch.demo_status = "SCHEDULED";
  } else if (toStatus === "DEMO_COMPLETED") {
    patch.demo_status = "COMPLETED";
    if (input.demo_at) patch.demo_at = input.demo_at;
  } else if (toStatus === "ACCEPTED") {
    if (input.agreed_fee !== undefined) {
      patch.agreed_fee = Number(input.agreed_fee);
    }
    if (existing.demo_status === "SCHEDULED" || input.demo_status === "COMPLETED") {
      patch.demo_status = "COMPLETED";
    }
  } else if (toStatus === "ACTIVE") {
    if (input.start_date) {
      patch.start_date = input.start_date;
    } else if (!existing.start_date) {
      patch.start_date = now.slice(0, 10);
    }
    if (input.agreed_fee !== undefined) {
      patch.agreed_fee = Number(input.agreed_fee);
    }
  } else if (toStatus === "COMPLETED" || toStatus === "CANCELLED") {
    if (input.end_date) {
      patch.end_date = input.end_date;
    } else if (!existing.end_date) {
      patch.end_date = now.slice(0, 10);
    }
    if (toStatus === "CANCELLED" && existing.demo_status === "SCHEDULED") {
      patch.demo_status = "CANCELLED";
    }
  }

  if (input.demo_status && input.demo_status !== patch.demo_status) {
    patch.demo_status = input.demo_status;
  }
  if (input.admin_notes) {
    patch.admin_notes = input.admin_notes;
  }
  if (input.agreed_fee !== undefined && patch.agreed_fee === undefined) {
    patch.agreed_fee = Number(input.agreed_fee);
  }

  const updatedAssignment: Assignment = {
    ...existing,
    ...patch,
  };

  // 5. Persist updated assignment
  if (useSheets && sheetAdapter) {
    await sheetAdapter.updateRecord<Assignment>(
      "Assignments",
      "assignment_id",
      input.assignmentId,
      patch,
      existing.updated_at
    );
  } else {
    inMemoryAssignmentStore.saveAssignment(updatedAssignment);
  }

  // 6. Student lead_status automation (Section 7.2)
  const student = students.find((s) => s.student_id === existing.student_id);
  if (student) {
    let studentNewStatus: Student["lead_status"] | null = null;
    if (toStatus === "DEMO_SCHEDULED") {
      studentNewStatus = "DEMO_SCHEDULED";
    } else if (toStatus === "ACCEPTED" || toStatus === "ACTIVE") {
      studentNewStatus = "CONVERTED";
    }

    if (studentNewStatus && studentNewStatus !== student.lead_status) {
      if (useSheets && sheetAdapter) {
        try {
          await sheetAdapter.updateRecord<Student>(
            "Students",
            "student_id",
            student.student_id,
            { lead_status: studentNewStatus },
            student.updated_at
          );
        } catch (err) {
          console.warn("[Student Lead Status Update Failed]", err);
        }
      } else {
        const updatedStudent: Student = {
          ...student,
          lead_status: studentNewStatus,
          updated_at: now,
        };
        inMemoryAssignmentStore.updateStudent(updatedStudent);
      }

      await recordActivity({
        adminId: input.adminId || "admin",
        entityType: "STUDENT",
        entityId: student.student_id,
        action: "UPDATE_STATUS",
        description: `Student status automated to ${studentNewStatus} when assignment ${input.assignmentId} moved to ${toStatus}`,
        changes: { lead_status: [student.lead_status, studentNewStatus] },
        sheetsAdapter: sheetAdapter,
      });
    }
  }

  // 7. ActivityLog for assignment status transition
  await recordActivity({
    adminId: input.adminId || "admin",
    entityType: "ASSIGNMENT",
    entityId: input.assignmentId,
    action: "UPDATE_STATUS",
    description: `Assignment ${input.assignmentId} status changed from ${fromStatus} to ${toStatus}`,
    changes: {
      assignment_status: [fromStatus, toStatus],
      ...(patch.demo_status ? { demo_status: [existing.demo_status, patch.demo_status] } : {}),
    },
    sheetsAdapter: sheetAdapter,
  });

  return updatedAssignment;
}
