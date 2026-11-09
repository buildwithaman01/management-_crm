import { describe, it, expect } from "vitest";
import {
  calculateFunnel,
  calculateSubjectDemandSupply,
  calculateLocalityDistribution,
  calculateRevenueSummary,
  filterByPeriod,
  generateReportsSummaryCsv,
  ReportsData,
} from "@/features/analytics/reports-engine";
import { Student, Tutor, Assignment, Payment } from "@/types/entities";

// Helper factory for creating test students
function createStudent(overrides: Partial<Student> = {}): Student {
  return {
    student_id: "STU-2611-0001",
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
    parent_name: "Ramesh Sharma",
    student_name: "Aarav Sharma",
    phone: "+919876543210",
    class: "Class 10",
    board: "CBSE",
    subjects: "Mathematics|Science",
    tuition_type: "HOME",
    locality: "Indiranagar",
    tutor_gender_preference: "ANY",
    preferred_timing: "EVENING",
    budget: 5000,
    classes_per_week: 3,
    lead_status: "NEW",
    lead_source: "WEBSITE",
    consent_at: "2026-11-01T10:00:00Z",
    consent_version: "v1.0",
    archived: false,
    ...overrides,
  };
}

// Helper factory for creating test tutors
function createTutor(overrides: Partial<Tutor> = {}): Tutor {
  return {
    tutor_id: "TUT-2611-0001",
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    full_name: "Amit Kumar",
    phone: "+919876543211",
    gender: "MALE",
    current_city: "Bengaluru",
    current_locality: "Indiranagar",
    highest_qualification: "M.Sc. Mathematics",
    subjects: "Mathematics",
    secondary_subjects: "",
    classes: "Class 9|Class 10",
    experience_years: 4,
    teaching_mode: "HOME",
    localities: "Indiranagar|Koramangala",
    expected_fee: 5000,
    photo_file_id: "photo-123",
    id_type: "Aadhaar",
    id_number: "123456789012",
    id_proof_file_id: "id-proof-123",
    background_check_status: "VERIFIED",
    verification_status: "VERIFIED",
    availability_status: "ACTIVE",
    lead_source: "WEBSITE",
    consent_at: "2026-10-01T10:00:00Z",
    consent_version: "v1.0",
    archived: false,
    ...overrides,
  };
}

// Helper factory for creating test assignments
function createAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    assignment_id: "ASN-2611-0001",
    student_id: "STU-2611-0001",
    tutor_id: "TUT-2611-0001",
    subjects: "Mathematics",
    created_at: "2026-11-02T10:00:00Z",
    updated_at: "2026-11-02T10:00:00Z",
    created_by: "admin",
    assignment_status: "SHORTLISTED",
    demo_status: "NOT_SCHEDULED",
    agreed_fee: 5000,
    ...overrides,
  };
}

// Helper factory for creating test payments
function createPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    payment_id: "PAY-2611-0001",
    student_id: "STU-2611-0001",
    tutor_id: "TUT-2611-0001",
    assignment_id: "ASN-2611-0001",
    payment_type: "BUREAU_COMMISSION",
    amount: 2500,
    payment_date: "2026-11-05T12:00:00Z",
    payment_mode: "UPI",
    payment_status: "PAID",
    created_at: "2026-11-05T12:00:00Z",
    updated_at: "2026-11-05T12:00:00Z",
    ...overrides,
  };
}

describe("Phase 9 — Reports & Analytics Tests", () => {
  // =========================================================================
  // 1. Funnel Calculation Tests
  // =========================================================================
  describe("calculateFunnel", () => {
    it("returns zero counts and 0% conversion rate when student list is empty", () => {
      const funnel = calculateFunnel([], []);
      expect(funnel.totalLeads).toBe(0);
      expect(funnel.contacted).toBe(0);
      expect(funnel.demosScheduled).toBe(0);
      expect(funnel.demosCompleted).toBe(0);
      expect(funnel.converted).toBe(0);
      expect(funnel.lost).toBe(0);
      expect(funnel.conversionRate).toBe(0);
      expect(funnel.stages.length).toBe(6);
    });

    it("ignores archived students in funnel counts", () => {
      const students: Student[] = [
        createStudent({ student_id: "STU-1", archived: true, lead_status: "CONVERTED" }),
        createStudent({ student_id: "STU-2", archived: false, lead_status: "NEW" }),
      ];

      const funnel = calculateFunnel(students, []);
      expect(funnel.totalLeads).toBe(1);
      expect(funnel.converted).toBe(0);
    });

    it("correctly identifies conversion from student lead_status = CONVERTED", () => {
      const students: Student[] = [
        createStudent({ student_id: "STU-1", lead_status: "NEW" }),
        createStudent({ student_id: "STU-2", lead_status: "CONVERTED" }),
        createStudent({ student_id: "STU-3", lead_status: "LOST" }),
        createStudent({ student_id: "STU-4", lead_status: "DEMO_SCHEDULED" }),
      ];

      const funnel = calculateFunnel(students, []);
      expect(funnel.totalLeads).toBe(4);
      expect(funnel.converted).toBe(1);
      expect(funnel.lost).toBe(1);
      expect(funnel.conversionRate).toBe(25.0); // 1 / 4 * 100
    });

    it("recognizes conversion and demo progression via active assignments", () => {
      const students: Student[] = [
        createStudent({ student_id: "STU-1", lead_status: "NEW" }),
        createStudent({ student_id: "STU-2", lead_status: "CONTACTED" }),
      ];

      const assignments: Assignment[] = [
        createAssignment({
          assignment_id: "ASN-1",
          student_id: "STU-2",
          assignment_status: "ACTIVE",
          demo_status: "COMPLETED",
        }),
      ];

      const funnel = calculateFunnel(students, assignments);
      expect(funnel.totalLeads).toBe(2);
      expect(funnel.contacted).toBe(1);
      expect(funnel.demosScheduled).toBe(1);
      expect(funnel.demosCompleted).toBe(1);
      expect(funnel.converted).toBe(1);
      expect(funnel.conversionRate).toBe(50.0);
    });

    it("correctly computes dropoff rates and stage descriptions", () => {
      const students: Student[] = [
        createStudent({ student_id: "STU-1", lead_status: "NEW" }),
        createStudent({ student_id: "STU-2", lead_status: "CONTACTED" }),
        createStudent({ student_id: "STU-3", lead_status: "DEMO_SCHEDULED" }),
        createStudent({ student_id: "STU-4", lead_status: "CONVERTED" }),
      ];

      const funnel = calculateFunnel(students, []);
      expect(funnel.totalLeads).toBe(4);
      expect(funnel.contacted).toBe(3); // STU-2, STU-3, STU-4
      expect(funnel.demosScheduled).toBe(2); // STU-3, STU-4
      expect(funnel.converted).toBe(1); // STU-4

      const totalStage = funnel.stages.find((s) => s.stage === "Total Leads");
      expect(totalStage?.percentage).toBe(100);

      const contactedStage = funnel.stages.find((s) => s.stage === "Contacted");
      expect(contactedStage?.percentage).toBe(75.0);
      expect(contactedStage?.dropoffRate).toBe(25.0);
    });
  });

  // =========================================================================
  // 2. Subject Demand vs Supply Tests
  // =========================================================================
  describe("calculateSubjectDemandSupply", () => {
    it("returns empty array when neither students nor tutors exist", () => {
      const res = calculateSubjectDemandSupply([], []);
      expect(res).toEqual([]);
    });

    it("correctly calculates balanced supply and demand (gap = 0)", () => {
      const students: Student[] = [
        createStudent({ subjects: "Mathematics" }),
      ];
      const tutors: Tutor[] = [
        createTutor({ subjects: "Mathematics" }),
      ];

      const res = calculateSubjectDemandSupply(students, tutors);
      expect(res.length).toBe(1);
      expect(res[0].subject).toBe("Mathematics");
      expect(res[0].demand).toBe(1);
      expect(res[0].supply).toBe(1);
      expect(res[0].gap).toBe(0);
      expect(res[0].status).toBe("BALANCED");
    });

    it("identifies shortage / deficit when student demand exceeds tutor supply (gap > 0)", () => {
      const students: Student[] = [
        createStudent({ student_id: "S1", subjects: "Physics" }),
        createStudent({ student_id: "S2", subjects: "Physics" }),
        createStudent({ student_id: "S3", subjects: "Physics" }),
      ];
      const tutors: Tutor[] = [
        createTutor({ tutor_id: "T1", subjects: "Physics" }),
      ];

      const res = calculateSubjectDemandSupply(students, tutors);
      expect(res[0].subject).toBe("Physics");
      expect(res[0].demand).toBe(3);
      expect(res[0].supply).toBe(1);
      expect(res[0].gap).toBe(2);
      expect(res[0].status).toBe("DEFICIT");
    });

    it("identifies surplus when verified tutor supply exceeds student demand (gap < 0)", () => {
      const students: Student[] = [
        createStudent({ student_id: "S1", subjects: "English" }),
      ];
      const tutors: Tutor[] = [
        createTutor({ tutor_id: "T1", subjects: "English" }),
        createTutor({ tutor_id: "T2", subjects: "English" }),
        createTutor({ tutor_id: "T3", subjects: "English" }),
      ];

      const res = calculateSubjectDemandSupply(students, tutors);
      expect(res[0].subject).toBe("English");
      expect(res[0].demand).toBe(1);
      expect(res[0].supply).toBe(3);
      expect(res[0].gap).toBe(-2);
      expect(res[0].status).toBe("SURPLUS");
    });

    it("only counts VERIFIED and ACTIVE tutors in supply", () => {
      const students: Student[] = [
        createStudent({ subjects: "Chemistry" }),
      ];
      const tutors: Tutor[] = [
        // Verified and Active -> counted
        createTutor({ tutor_id: "T1", subjects: "Chemistry", verification_status: "VERIFIED", availability_status: "ACTIVE" }),
        // Unverified -> ignored
        createTutor({ tutor_id: "T2", subjects: "Chemistry", verification_status: "PENDING", availability_status: "ACTIVE" }),
        // Under review -> ignored
        createTutor({ tutor_id: "T3", subjects: "Chemistry", verification_status: "UNDER_REVIEW", availability_status: "ACTIVE" }),
        // Inactive -> ignored
        createTutor({ tutor_id: "T4", subjects: "Chemistry", verification_status: "VERIFIED", availability_status: "INACTIVE" }),
        // Blacklisted -> ignored
        createTutor({ tutor_id: "T5", subjects: "Chemistry", verification_status: "BLACKLISTED", availability_status: "ACTIVE" }),
        // Archived -> ignored
        createTutor({ tutor_id: "T6", subjects: "Chemistry", verification_status: "VERIFIED", availability_status: "ACTIVE", archived: true }),
      ];

      const res = calculateSubjectDemandSupply(students, tutors);
      const chem = res.find((r) => r.subject === "Chemistry");
      expect(chem).toBeDefined();
      expect(chem?.supply).toBe(1); // Only T1
    });

    it("counts multi-value pipe-separated subjects and secondary subjects for tutors", () => {
      const students: Student[] = [
        createStudent({ subjects: "Maths|Science" }),
      ];
      const tutors: Tutor[] = [
        createTutor({ subjects: "Maths", secondary_subjects: "Science|Biology" }),
      ];

      const res = calculateSubjectDemandSupply(students, tutors);
      const maths = res.find((r) => r.subject === "Maths");
      const science = res.find((r) => r.subject === "Science");
      const biology = res.find((r) => r.subject === "Biology");

      expect(maths?.supply).toBe(1);
      expect(science?.supply).toBe(1);
      expect(biology?.supply).toBe(1);
    });

    it("sorts subjects by highest shortage / deficit first (gap descending)", () => {
      const students: Student[] = [
        createStudent({ student_id: "S1", subjects: "Biology" }), // 1 demand
        createStudent({ student_id: "S2", subjects: "Maths" }),   // 3 demand
        createStudent({ student_id: "S3", subjects: "Maths" }),
        createStudent({ student_id: "S4", subjects: "Maths" }),
        createStudent({ student_id: "S5", subjects: "Physics" }), // 2 demand
        createStudent({ student_id: "S6", subjects: "Physics" }),
      ];
      const tutors: Tutor[] = [
        createTutor({ tutor_id: "T1", subjects: "Biology" }), // 1 supply -> gap 0
        // Maths: 0 tutors -> gap +3
        // Physics: 1 tutor -> gap +1
        createTutor({ tutor_id: "T2", subjects: "Physics" }),
      ];

      const res = calculateSubjectDemandSupply(students, tutors);
      // Maths gap: 3 - 0 = +3
      // Physics gap: 2 - 1 = +1
      // Biology gap: 1 - 1 = 0
      expect(res[0].subject).toBe("Maths");
      expect(res[0].gap).toBe(3);
      expect(res[1].subject).toBe("Physics");
      expect(res[1].gap).toBe(1);
      expect(res[2].subject).toBe("Biology");
      expect(res[2].gap).toBe(0);
    });
  });

  // =========================================================================
  // 3. Locality Distribution Tests
  // =========================================================================
  describe("calculateLocalityDistribution", () => {
    it("handles empty student and tutor lists", () => {
      const dist = calculateLocalityDistribution([], []);
      expect(dist.studentLocalities).toEqual([]);
      expect(dist.tutorLocalities).toEqual([]);
      expect(dist.localityGaps).toEqual([]);
    });

    it("correctly calculates student and tutor locality concentrations", () => {
      const students: Student[] = [
        createStudent({ locality: "Indiranagar" }),
        createStudent({ locality: "Indiranagar" }),
        createStudent({ locality: "Whitefield" }),
      ];
      const tutors: Tutor[] = [
        createTutor({ localities: "Indiranagar|Koramangala" }),
        createTutor({ localities: "Koramangala" }),
      ];

      const dist = calculateLocalityDistribution(students, tutors);

      // Student localities
      expect(dist.studentLocalities[0].locality).toBe("Indiranagar");
      expect(dist.studentLocalities[0].count).toBe(2);
      expect(dist.studentLocalities[1].locality).toBe("Whitefield");
      expect(dist.studentLocalities[1].count).toBe(1);

      // Tutor localities
      expect(dist.tutorLocalities[0].locality).toBe("Koramangala");
      expect(dist.tutorLocalities[0].count).toBe(2);
      expect(dist.tutorLocalities[1].locality).toBe("Indiranagar");
      expect(dist.tutorLocalities[1].count).toBe(1);

      // Locality gaps (studentDemand - tutorSupply)
      // Indiranagar: 2 students - 1 tutor = gap +1
      // Whitefield: 1 student - 0 tutors = gap +1
      // Koramangala: 0 students - 2 tutors = gap -2
      const indiraGap = dist.localityGaps.find((g) => g.locality === "Indiranagar");
      expect(indiraGap?.gap).toBe(1);

      const koraGap = dist.localityGaps.find((g) => g.locality === "Koramangala");
      expect(koraGap?.gap).toBe(-2);
    });
  });

  // =========================================================================
  // 4. Revenue and Commission Summary Tests
  // =========================================================================
  describe("calculateRevenueSummary", () => {
    it("returns zero metrics when no assignments or payments exist", () => {
      const rev = calculateRevenueSummary([], []);
      expect(rev.activeAssignmentsCount).toBe(0);
      expect(rev.totalActiveAssignmentsFeeSum).toBe(0);
      expect(rev.estimatedCommission).toBe(0);
      expect(rev.receivedPayments).toBe(0);
      expect(rev.pendingPayments).toBe(0);
    });

    it("only sums agreed_fee for ACTIVE assignments", () => {
      const assignments: Assignment[] = [
        createAssignment({ assignment_status: "ACTIVE", agreed_fee: 6000 }),
        createAssignment({ assignment_status: "ACTIVE", agreed_fee: "4000" }),
        createAssignment({ assignment_status: "COMPLETED", agreed_fee: 5000 }), // Not active
        createAssignment({ assignment_status: "SHORTLISTED", agreed_fee: 8000 }), // Not active
        createAssignment({ assignment_status: "CANCELLED", agreed_fee: 7000 }), // Not active
      ];

      const rev = calculateRevenueSummary(assignments, [], 50);
      expect(rev.activeAssignmentsCount).toBe(2);
      expect(rev.totalActiveAssignmentsFeeSum).toBe(10000); // 6000 + 4000
      expect(rev.estimatedCommission).toBe(5000); // 50% of 10000
    });

    it("correctly separates PAID vs PENDING payments", () => {
      const payments: Payment[] = [
        createPayment({ amount: 2500, payment_status: "PAID" }),
        createPayment({ amount: 3000, payment_status: "PAID" }),
        createPayment({ amount: 1500, payment_status: "PENDING" }),
        createPayment({ amount: 500, payment_status: "PARTIALLY_PAID" }),
      ];

      const rev = calculateRevenueSummary([], payments);
      expect(rev.receivedPayments).toBe(5500); // 2500 + 3000
      expect(rev.pendingPayments).toBe(2000); // 1500 + 500
      expect(rev.totalPaymentsCount).toBe(4);
    });

    it("supports custom commission rate", () => {
      const assignments: Assignment[] = [
        createAssignment({ assignment_status: "ACTIVE", agreed_fee: 10000 }),
      ];

      const rev = calculateRevenueSummary(assignments, [], 60);
      expect(rev.commissionPercentage).toBe(60);
      expect(rev.estimatedCommission).toBe(6000);
    });
  });

  // =========================================================================
  // 5. Period Filtering Tests
  // =========================================================================
  describe("filterByPeriod", () => {
    const fixedNow = new Date("2026-11-15T12:00:00Z");

    const items = [
      { id: "1", created_at: "2026-11-10T10:00:00Z" }, // This month, last 30 days
      { id: "2", created_at: "2026-11-01T01:00:00Z" }, // This month, last 30 days
      { id: "3", created_at: "2026-10-25T10:00:00Z" }, // Last month, but within 30 days of Nov 15
      { id: "4", created_at: "2026-09-01T10:00:00Z" }, // > 60 days ago
    ];

    it("returns all items when period is 'all'", () => {
      const res = filterByPeriod(items, "all", fixedNow);
      expect(res.length).toBe(4);
    });

    it("filters to current month when period is 'this_month'", () => {
      const res = filterByPeriod(items, "this_month", fixedNow);
      expect(res.map((i) => i.id)).toEqual(["1", "2"]);
    });

    it("filters to last 30 days when period is 'last_30_days'", () => {
      const res = filterByPeriod(items, "last_30_days", fixedNow);
      // Items within 30 days of Nov 15 (i.e. after Oct 16): id 1, 2, 3
      expect(res.map((i) => i.id)).toEqual(["1", "2", "3"]);
    });
  });

  // =========================================================================
  // 6. CSV Export & Formula Injection Sanitization Tests
  // =========================================================================
  describe("generateReportsSummaryCsv", () => {
    it("generates structured CSV with all required sections and neutralizes formulas", () => {
      const sampleData: ReportsData = {
        period: "all",
        generatedAt: "2026-11-07T12:00:00Z",
        funnel: {
          totalLeads: 10,
          contacted: 8,
          demosScheduled: 5,
          demosCompleted: 4,
          converted: 3,
          lost: 2,
          conversionRate: 30.0,
          stages: [
            { stage: "Total Leads", count: 10, percentage: 100, description: "All inquiries" },
            { stage: "Converted", count: 3, percentage: 30, description: "Active tuition" },
          ],
        },
        subjectDemandSupply: [
          {
            subject: "=SUM(1,2)", // Formula injection attempt!
            demand: 5,
            supply: 2,
            gap: 3,
            status: "DEFICIT",
            coverageRatio: 0.4,
          },
          {
            subject: "+Maths", // Prefix formula injection attempt
            demand: 3,
            supply: 4,
            gap: -1,
            status: "SURPLUS",
            coverageRatio: 1.33,
          },
        ],
        localityDistribution: {
          studentLocalities: [{ locality: "Indiranagar", count: 5, percentage: 50 }],
          tutorLocalities: [{ locality: "Indiranagar", count: 3, percentage: 60 }],
          localityGaps: [{ locality: "Indiranagar", studentDemand: 5, tutorSupply: 3, gap: 2 }],
        },
        revenueSummary: {
          activeAssignmentsCount: 3,
          totalActiveAssignmentsFeeSum: 15000,
          commissionPercentage: 50,
          estimatedCommission: 7500,
          receivedPayments: 5000,
          pendingPayments: 2500,
          totalPaymentsCount: 2,
        },
        meta: {
          totalStudents: 10,
          totalTutors: 5,
          totalAssignments: 4,
          totalPayments: 2,
        },
      };

      const csv = generateReportsSummaryCsv(sampleData);

      // Verify sections are present
      expect(csv).toContain("TUITION BUREAU CRM - REPORTS & ANALYTICS SUMMARY");
      expect(csv).toContain("CONVERSION FUNNEL METRICS");
      expect(csv).toContain("REVENUE & COMMISSION SUMMARY");
      expect(csv).toContain("SUBJECT DEMAND VS SUPPLY (SHORTAGE ANALYSIS)");
      expect(csv).toContain("LOCALITY COVERAGE & GAPS");

      // Verify formula sanitization per Section 11.3:
      // '=SUM(1,2)' should be prefixed with apostrophe '\'=SUM(1,2)\''
      expect(csv).toContain("'=SUM(1,2)");
      expect(csv).not.toContain("\n=SUM(1,2)");

      // '+Maths' should be prefixed with apostrophe
      expect(csv).toContain("'+Maths");
    });
  });
});
