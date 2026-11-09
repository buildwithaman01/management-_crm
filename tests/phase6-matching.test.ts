import { describe, it, expect } from "vitest";
import {
  matchTutors,
  matchTutorsWithExcluded,
  checkHardFilters,
  scoreTutor,
  validateMatchWeights,
  parseMatchWeights,
  DEFAULT_MATCH_WEIGHTS,
  MatchOptions,
} from "@/features/matching/matching-engine";
import { Student, Tutor, LocalityLink, Assignment } from "@/types/entities";

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
    subjects: "Mathematics|Science",
    secondary_subjects: "Physics",
    classes: "Class 9|Class 10|Class 11",
    boards: "CBSE|ICSE",
    experience_years: 5,
    teaching_mode: "HOME",
    localities: "Indiranagar|Domlur",
    expected_fee: 5000,
    available_timings: "EVENING",
    photo_file_id: "photo-123",
    id_type: "AADHAAR",
    id_number: "XXXX-XXXX-1234",
    id_proof_file_id: "id-123",
    background_check_status: "VERIFIED",
    verification_status: "VERIFIED",
    availability_status: "ACTIVE",
    lead_source: "WEBSITE",
    consent_at: "2026-10-01T10:00:00Z",
    consent_version: "v1.0",
    last_confirmed_at: "2026-10-15T10:00:00Z", // ~23 days from 2026-11-07
    archived: false,
    ...overrides,
  };
}

// Fixed reference time for deterministic testing
const NOW_DATE = new Date("2026-11-07T12:00:00Z");
const DEFAULT_OPTIONS: MatchOptions = { now: NOW_DATE };

describe("Phase 6 — Tutor Finder & Smart Matching Engine (Section 16 & 28)", () => {
  // =========================================================================
  // 1. HARD FILTERS (Section 16.2)
  // =========================================================================
  describe("Hard Filters (Section 16.2)", () => {
    it("excludes archived tutors (Rule 1)", () => {
      const student = createStudent();
      const tutor = createTutor({ archived: true });

      const check = checkHardFilters(student, tutor, DEFAULT_OPTIONS);
      expect(check.passed).toBe(false);
      expect(check.reasons).toContain("Tutor is archived");

      const results = matchTutors(student, [tutor], [], DEFAULT_OPTIONS);
      expect(results).toHaveLength(0);
    });

    it("enforces verification policy VERIFIED_ONLY by default (Rule 2)", () => {
      const student = createStudent();
      const verifiedTutor = createTutor({ tutor_id: "T-VERIFIED", verification_status: "VERIFIED" });
      const underReviewTutor = createTutor({ tutor_id: "T-UNDER-REVIEW", verification_status: "UNDER_REVIEW" });
      const pendingTutor = createTutor({ tutor_id: "T-PENDING", verification_status: "PENDING" });

      const results = matchTutors(student, [verifiedTutor, underReviewTutor, pendingTutor], [], DEFAULT_OPTIONS);
      expect(results).toHaveLength(1);
      expect(results[0].tutor.tutor_id).toBe("T-VERIFIED");
    });

    it("allows INCLUDE_UNDER_REVIEW verification policy", () => {
      const student = createStudent();
      const verifiedTutor = createTutor({ tutor_id: "T-VERIFIED", verification_status: "VERIFIED" });
      const underReviewTutor = createTutor({ tutor_id: "T-UNDER-REVIEW", verification_status: "UNDER_REVIEW" });
      const pendingTutor = createTutor({ tutor_id: "T-PENDING", verification_status: "PENDING" });

      const results = matchTutors(
        student,
        [verifiedTutor, underReviewTutor, pendingTutor],
        [],
        { ...DEFAULT_OPTIONS, verification_policy: "INCLUDE_UNDER_REVIEW" }
      );
      expect(results.map((r) => r.tutor.tutor_id)).toEqual(["T-VERIFIED", "T-UNDER-REVIEW"]);
    });

    it("allows INCLUDE_PENDING verification policy", () => {
      const student = createStudent();
      const verifiedTutor = createTutor({ tutor_id: "T-VERIFIED", verification_status: "VERIFIED" });
      const underReviewTutor = createTutor({ tutor_id: "T-UNDER-REVIEW", verification_status: "UNDER_REVIEW" });
      const pendingTutor = createTutor({ tutor_id: "T-PENDING", verification_status: "PENDING" });

      const results = matchTutors(
        student,
        [verifiedTutor, underReviewTutor, pendingTutor],
        [],
        { ...DEFAULT_OPTIONS, verification_policy: "INCLUDE_PENDING" }
      );
      expect(results).toHaveLength(3);
    });

    it("relaxes verification with include_unverified toggle", () => {
      const student = createStudent();
      const pendingTutor = createTutor({ tutor_id: "T-PENDING", verification_status: "PENDING" });

      // Default VERIFIED_ONLY excludes pending
      expect(matchTutors(student, [pendingTutor], [], DEFAULT_OPTIONS)).toHaveLength(0);

      // include_unverified: true includes pending
      const results = matchTutors(student, [pendingTutor], [], {
        ...DEFAULT_OPTIONS,
        include_unverified: true,
      });
      expect(results).toHaveLength(1);
      expect(results[0].tutor.tutor_id).toBe("T-PENDING");
    });

    it("NEVER includes REJECTED or BLACKLISTED tutors under any policy or toggle", () => {
      const student = createStudent();
      const rejectedTutor = createTutor({ tutor_id: "T-REJ", verification_status: "REJECTED" });
      const blacklistedTutor = createTutor({ tutor_id: "T-BL", verification_status: "BLACKLISTED" });

      // Test with all policies and include_unverified: true
      const policies: ("VERIFIED_ONLY" | "INCLUDE_UNDER_REVIEW" | "INCLUDE_PENDING")[] = [
        "VERIFIED_ONLY",
        "INCLUDE_UNDER_REVIEW",
        "INCLUDE_PENDING",
      ];

      for (const policy of policies) {
        const results = matchTutors(
          student,
          [rejectedTutor, blacklistedTutor],
          [],
          { ...DEFAULT_OPTIONS, verification_policy: policy, include_unverified: true }
        );
        expect(results).toHaveLength(0);
      }
    });

    it("excludes tutors with non-ACTIVE availability status (Rule 3)", () => {
      const student = createStudent();
      const activeTutor = createTutor({ tutor_id: "T-ACTIVE", availability_status: "ACTIVE" });
      const inactiveTutor = createTutor({ tutor_id: "T-INACTIVE", availability_status: "INACTIVE" });
      const tempTutor = createTutor({
        tutor_id: "T-TEMP",
        availability_status: "TEMPORARILY_UNAVAILABLE",
      });

      const results = matchTutors(student, [activeTutor, inactiveTutor, tempTutor], [], DEFAULT_OPTIONS);
      expect(results).toHaveLength(1);
      expect(results[0].tutor.tutor_id).toBe("T-ACTIVE");
    });

    it("excludes tutors who teach NONE of the required subjects (Rule 4 - wrong subject)", () => {
      const student = createStudent({ subjects: "Mathematics|Science" });
      const wrongSubjectTutor = createTutor({
        subjects: "History|Civics",
        secondary_subjects: "Geography",
      });

      const check = checkHardFilters(student, wrongSubjectTutor, DEFAULT_OPTIONS);
      expect(check.passed).toBe(false);
      expect(check.reasons).toContain("Tutor does not teach any of the student's required subjects");

      const results = matchTutors(student, [wrongSubjectTutor], [], DEFAULT_OPTIONS);
      expect(results).toHaveLength(0);
    });

    it("passes tutors who teach at least one required subject via primary or secondary subjects", () => {
      const student = createStudent({ subjects: "Mathematics|Science" });
      const primaryMatchTutor = createTutor({
        tutor_id: "T-PRIMARY",
        subjects: "Mathematics|Economics",
      });
      const secondaryMatchTutor = createTutor({
        tutor_id: "T-SECONDARY",
        subjects: "Biology",
        secondary_subjects: "Science",
      });

      const results = matchTutors(student, [primaryMatchTutor, secondaryMatchTutor], [], DEFAULT_OPTIONS);
      expect(results).toHaveLength(2);
    });

    it("excludes tutors who do not teach the student's class (Rule 5 - wrong class)", () => {
      const student = createStudent({ class: "Class 10" });
      const wrongClassTutor = createTutor({ classes: "Class 6|Class 7|Class 8" });

      const check = checkHardFilters(student, wrongClassTutor, DEFAULT_OPTIONS);
      expect(check.passed).toBe(false);
      expect(check.reasons).toContain("Tutor does not teach student's class (Class 10)");

      const results = matchTutors(student, [wrongClassTutor], [], DEFAULT_OPTIONS);
      expect(results).toHaveLength(0);
    });

    it("handles class matching flexibly for lookups and strings", () => {
      const student = createStudent({ class: "CLASS_10" });
      const tutor = createTutor({ classes: "Class 10|Class 11" });

      const check = checkHardFilters(student, tutor, DEFAULT_OPTIONS);
      expect(check.passed).toBe(true);
    });

    it("enforces gender preference strictly (Rule 6)", () => {
      const maleTutor = createTutor({ tutor_id: "T-MALE", gender: "MALE" });
      const femaleTutor = createTutor({ tutor_id: "T-FEMALE", gender: "FEMALE" });

      // Student prefers FEMALE -> male excluded
      const studentFemalePref = createStudent({ tutor_gender_preference: "FEMALE" });
      const resFemale = matchTutors(studentFemalePref, [maleTutor, femaleTutor], [], DEFAULT_OPTIONS);
      expect(resFemale).toHaveLength(1);
      expect(resFemale[0].tutor.tutor_id).toBe("T-FEMALE");

      // Student prefers MALE -> female excluded
      const studentMalePref = createStudent({ tutor_gender_preference: "MALE" });
      const resMale = matchTutors(studentMalePref, [maleTutor, femaleTutor], [], DEFAULT_OPTIONS);
      expect(resMale).toHaveLength(1);
      expect(resMale[0].tutor.tutor_id).toBe("T-MALE");

      // Student prefers ANY -> both allowed
      const studentAnyPref = createStudent({ tutor_gender_preference: "ANY" });
      const resAny = matchTutors(studentAnyPref, [maleTutor, femaleTutor], [], DEFAULT_OPTIONS);
      expect(resAny).toHaveLength(2);
    });

    it("enforces teaching mode compatibility (Rule 7)", () => {
      const homeTutor = createTutor({ tutor_id: "T-HOME", teaching_mode: "HOME" });
      const onlineTutor = createTutor({ tutor_id: "T-ONLINE", teaching_mode: "ONLINE" });
      const bothTutor = createTutor({ tutor_id: "T-BOTH", teaching_mode: "BOTH" });

      // Student HOME
      const studentHome = createStudent({ tuition_type: "HOME" });
      const homeMatches = matchTutors(studentHome, [homeTutor, onlineTutor, bothTutor], [], DEFAULT_OPTIONS);
      expect(homeMatches.map((r) => r.tutor.tutor_id).sort()).toEqual(["T-BOTH", "T-HOME"]);

      // Student ONLINE
      const studentOnline = createStudent({ tuition_type: "ONLINE" });
      const onlineMatches = matchTutors(studentOnline, [homeTutor, onlineTutor, bothTutor], [], DEFAULT_OPTIONS);
      expect(onlineMatches.map((r) => r.tutor.tutor_id).sort()).toEqual(["T-BOTH", "T-ONLINE"]);

      // Student BOTH
      const studentBoth = createStudent({ tuition_type: "BOTH" });
      const bothMatches = matchTutors(studentBoth, [homeTutor, onlineTutor, bothTutor], [], DEFAULT_OPTIONS);
      expect(bothMatches.map((r) => r.tutor.tutor_id).sort()).toEqual(["T-BOTH", "T-HOME", "T-ONLINE"]);
    });
  });

  // =========================================================================
  // 2. SCORING & FACTOR CALCULATIONS (Section 16.3)
  // =========================================================================
  describe("Scoring Breakdown & Factors (Section 16.3)", () => {
    it("computes exact locality match (30 points)", () => {
      const student = createStudent({ locality: "Indiranagar" });
      const tutor = createTutor({
        current_locality: "Indiranagar",
        localities: "Indiranagar|Domlur",
      });

      const { breakdown, reasonChips } = scoreTutor(student, tutor, [], DEFAULT_OPTIONS);
      expect(breakdown.locality.earned).toBe(30);
      expect(breakdown.locality.max).toBe(30);
      expect(breakdown.locality.skipped).toBe(false);

      const locChip = reasonChips.find((c) => c.type === "locality");
      expect(locChip?.label).toBe("Exact locality");
      expect(locChip?.matched).toBe(true);
      expect(locChip?.tone).toBe("success");
    });

    it("computes nearby locality match (15 points via LocalityLinks two-way link)", () => {
      const student = createStudent({ locality: "Koramangala" });
      const tutor = createTutor({
        current_locality: "HSR Layout",
        localities: "HSR Layout|BTM",
      });

      // Two-way link direction 1: (Koramangala, HSR Layout)
      const links1: LocalityLink[] = [{ locality_a: "Koramangala", locality_b: "HSR Layout" }];
      const res1 = scoreTutor(student, tutor, links1, DEFAULT_OPTIONS);
      expect(res1.breakdown.locality.earned).toBe(15);
      const chip1 = res1.reasonChips.find((c) => c.type === "locality");
      expect(chip1?.label).toBe("Nearby locality");
      expect(chip1?.tone).toBe("warning");

      // Two-way link direction 2: (HSR Layout, Koramangala)
      const links2: LocalityLink[] = [{ locality_a: "HSR Layout", locality_b: "Koramangala" }];
      const res2 = scoreTutor(student, tutor, links2, DEFAULT_OPTIONS);
      expect(res2.breakdown.locality.earned).toBe(15);

      // Disabled match_use_nearby awards 0 points
      const resNearbyDisabled = scoreTutor(student, tutor, links1, {
        ...DEFAULT_OPTIONS,
        match_use_nearby: false,
      });
      expect(resNearbyDisabled.breakdown.locality.earned).toBe(0);
      expect(resNearbyDisabled.reasonChips.find((c) => c.type === "locality")?.label).toBe(
        "Different locality"
      );
    });

    it("awards 0 locality points when there is no locality link", () => {
      const student = createStudent({ locality: "Whitefield" });
      const tutor = createTutor({
        current_locality: "Jayanagar",
        localities: "Jayanagar|JP Nagar",
      });

      const { breakdown, reasonChips } = scoreTutor(student, tutor, [], DEFAULT_OPTIONS);
      expect(breakdown.locality.earned).toBe(0);
      expect(breakdown.locality.max).toBe(30);

      const locChip = reasonChips.find((c) => c.type === "locality");
      expect(locChip?.label).toBe("Different locality");
      expect(locChip?.matched).toBe(false);
      expect(locChip?.tone).toBe("danger");
    });

    it("skips locality factor for ONLINE-only students and renormalizes", () => {
      const student = createStudent({ tuition_type: "ONLINE", locality: "Indiranagar" });
      const tutor = createTutor({
        teaching_mode: "ONLINE",
        current_locality: "Different City",
        localities: "Nowhere",
      });

      const { score, breakdown, reasonChips } = scoreTutor(student, tutor, [], DEFAULT_OPTIONS);
      expect(breakdown.locality.skipped).toBe(true);
      expect(breakdown.locality.earned).toBe(0);
      expect(breakdown.locality.max).toBe(0);

      // Max points should be 100 - 30 = 70
      expect(breakdown.totalMax).toBe(70);
      // Tutor qualifies for all other 70 points: 25(subj) + 10(class) + 10(board) + 10(fee) + 5(timing) + 5(exp) + 5(fresh) = 70
      expect(breakdown.totalEarned).toBe(70);
      // Normalized score = 100 * 70 / 70 = 100
      expect(score).toBe(100);

      const chip = reasonChips.find((c) => c.type === "locality");
      expect(chip?.label).toBe("Locality skipped (Online)");
      expect(chip?.tone).toBe("info");
    });

    it("evaluates full and partial subject coverage (25 points max)", () => {
      const student = createStudent({ subjects: "Mathematics|Science|English" });

      // Covers all 3 subjects -> 25 points
      const fullTutor = createTutor({ subjects: "Mathematics|Science|English" });
      const fullRes = scoreTutor(student, fullTutor, [], DEFAULT_OPTIONS);
      expect(fullRes.breakdown.subject.earned).toBe(25);
      expect(fullRes.reasonChips.find((c) => c.type === "subject")?.label).toBe(
        "3/3 subjects matched"
      );
      expect(fullRes.reasonChips.find((c) => c.type === "subject")?.tone).toBe("success");

      // Covers 1 out of 3 subjects -> 25 * (1/3) = 8.33 points
      const partialTutor = createTutor({ subjects: "Mathematics|History" });
      const partialRes = scoreTutor(student, partialTutor, [], DEFAULT_OPTIONS);
      expect(partialRes.breakdown.subject.earned).toBeCloseTo(25 / 3, 2);
      expect(partialRes.reasonChips.find((c) => c.type === "subject")?.label).toBe(
        "1/3 subjects matched"
      );
      expect(partialRes.reasonChips.find((c) => c.type === "subject")?.tone).toBe("warning");

      // Covers 2 out of 3 subjects (1 primary + 1 secondary) -> 25 * (2/3) = 16.67 points
      const mixedTutor = createTutor({
        subjects: "Mathematics",
        secondary_subjects: "English",
      });
      const mixedRes = scoreTutor(student, mixedTutor, [], DEFAULT_OPTIONS);
      expect(mixedRes.breakdown.subject.earned).toBeCloseTo((25 * 2) / 3, 2);
      expect(mixedRes.reasonChips.find((c) => c.type === "subject")?.label).toBe(
        "2/3 subjects matched"
      );
    });

    it("evaluates fee scoring and budget penalty curve (10 points max)", () => {
      const student = createStudent({ budget: 5000 });

      // Case 1: Tutor fee <= budget -> 10 points
      const exactFeeTutor = createTutor({ expected_fee: 5000 });
      const res1 = scoreTutor(student, exactFeeTutor, [], DEFAULT_OPTIONS);
      expect(res1.breakdown.fee.earned).toBe(10);
      expect(res1.reasonChips.find((c) => c.type === "budget")?.label).toBe("Within budget");
      expect(res1.reasonChips.find((c) => c.type === "budget")?.tone).toBe("success");

      // Case 2: Tutor fee <= budget * 1.15 (15% tolerance = 5750) -> 5 points
      const withinTolTutor = createTutor({ expected_fee: 5500 }); // diff = 500
      const res2 = scoreTutor(student, withinTolTutor, [], DEFAULT_OPTIONS);
      expect(res2.breakdown.fee.earned).toBe(5);
      expect(res2.reasonChips.find((c) => c.type === "budget")?.label).toBe("Over budget by ₹500");
      expect(res2.reasonChips.find((c) => c.type === "budget")?.tone).toBe("warning");

      // Boundary case: exactly at 15% tolerance (5750) -> 5 points
      const boundaryTutor = createTutor({ expected_fee: 5750 });
      const resBoundary = scoreTutor(student, boundaryTutor, [], DEFAULT_OPTIONS);
      expect(resBoundary.breakdown.fee.earned).toBe(5);

      // Case 3: Tutor fee > budget * 1.15 (> 5750) -> 0 points
      const overTolTutor = createTutor({ expected_fee: 6500 }); // diff = 1500
      const res3 = scoreTutor(student, overTolTutor, [], DEFAULT_OPTIONS);
      expect(res3.breakdown.fee.earned).toBe(0);
      expect(res3.reasonChips.find((c) => c.type === "budget")?.label).toBe("Over budget by ₹1,500");
      expect(res3.reasonChips.find((c) => c.type === "budget")?.tone).toBe("danger");

      // Custom tolerance percentage: 20% tolerance on 5000 = 6000
      const customTolTutor = createTutor({ expected_fee: 5900 });
      const resCustomTol = scoreTutor(student, customTolTutor, [], {
        ...DEFAULT_OPTIONS,
        match_budget_tolerance_pct: 20,
      });
      expect(resCustomTol.breakdown.fee.earned).toBe(5);
    });

    it("evaluates board matching (10 points max)", () => {
      const student = createStudent({ board: "CBSE" });

      // Matched board
      const matchTutor = createTutor({ boards: "CBSE|ICSE" });
      const resMatch = scoreTutor(student, matchTutor, [], DEFAULT_OPTIONS);
      expect(resMatch.breakdown.board.earned).toBe(10);
      expect(resMatch.reasonChips.find((c) => c.type === "board")?.label).toBe("Board matched");
      expect(resMatch.reasonChips.find((c) => c.type === "board")?.tone).toBe("success");

      // Mismatched board
      const mismatchTutor = createTutor({ boards: "ICSE|STATE" });
      const resMismatch = scoreTutor(student, mismatchTutor, [], DEFAULT_OPTIONS);
      expect(resMismatch.breakdown.board.earned).toBe(0);
      expect(resMismatch.reasonChips.find((c) => c.type === "board")?.label).toBe("Different board");
      expect(resMismatch.reasonChips.find((c) => c.type === "board")?.tone).toBe("warning");
    });

    it("evaluates timing matching (5 points max)", () => {
      // Student has FLEXIBLE timing -> always awards 5 points
      const flexibleStudent = createStudent({ preferred_timing: "FLEXIBLE" });
      const tutorAny = createTutor({ available_timings: "MORNING" });
      const resFlex = scoreTutor(flexibleStudent, tutorAny, [], DEFAULT_OPTIONS);
      expect(resFlex.breakdown.timing.earned).toBe(5);
      expect(resFlex.reasonChips.find((c) => c.type === "timing")?.label).toBe("Timing matched");

      // Student has EVENING timing
      const eveningStudent = createStudent({ preferred_timing: "EVENING" });
      const eveningTutor = createTutor({ available_timings: "MORNING|EVENING" });
      const resEve = scoreTutor(eveningStudent, eveningTutor, [], DEFAULT_OPTIONS);
      expect(resEve.breakdown.timing.earned).toBe(5);

      // Student has EVENING, tutor only MORNING
      const morningTutor = createTutor({ available_timings: "MORNING" });
      const resMis = scoreTutor(eveningStudent, morningTutor, [], DEFAULT_OPTIONS);
      expect(resMis.breakdown.timing.earned).toBe(0);
      expect(resMis.reasonChips.find((c) => c.type === "timing")?.label).toBe("Different timing");
    });

    it("evaluates experience years scoring (5 points max)", () => {
      const student = createStudent();

      // 0 years -> 0 points
      expect(scoreTutor(student, createTutor({ experience_years: 0 }), [], DEFAULT_OPTIONS).breakdown.experience.earned).toBe(0);

      // 2.4 years -> round to 2 points
      expect(scoreTutor(student, createTutor({ experience_years: 2.4 }), [], DEFAULT_OPTIONS).breakdown.experience.earned).toBe(2);

      // 3.6 years -> round to 4 points
      expect(scoreTutor(student, createTutor({ experience_years: 3.6 }), [], DEFAULT_OPTIONS).breakdown.experience.earned).toBe(4);

      // 5 years -> 5 points
      expect(scoreTutor(student, createTutor({ experience_years: 5 }), [], DEFAULT_OPTIONS).breakdown.experience.earned).toBe(5);

      // 10 years -> capped at 5 points
      expect(scoreTutor(student, createTutor({ experience_years: 10 }), [], DEFAULT_OPTIONS).breakdown.experience.earned).toBe(5);
    });

    it("evaluates freshness scoring (5 points max within 90 days)", () => {
      const student = createStudent();

      // Confirmed 10 days ago (relative to NOW_DATE 2026-11-07)
      const recentTutor = createTutor({ last_confirmed_at: "2026-10-28T12:00:00Z" });
      expect(scoreTutor(student, recentTutor, [], DEFAULT_OPTIONS).breakdown.freshness.earned).toBe(5);

      // Confirmed exactly 90 days ago (2026-08-09 relative to 2026-11-07)
      const boundaryTutor = createTutor({ last_confirmed_at: "2026-08-09T12:00:00Z" });
      expect(scoreTutor(student, boundaryTutor, [], DEFAULT_OPTIONS).breakdown.freshness.earned).toBe(5);

      // Confirmed 95 days ago (> 90 days) -> 0 points
      const oldTutor = createTutor({ last_confirmed_at: "2026-08-01T12:00:00Z" });
      expect(scoreTutor(student, oldTutor, [], DEFAULT_OPTIONS).breakdown.freshness.earned).toBe(0);

      // No confirmed date -> 0 points
      const unconfirmedTutor = createTutor({ last_confirmed_at: undefined });
      expect(scoreTutor(student, unconfirmedTutor, [], DEFAULT_OPTIONS).breakdown.freshness.earned).toBe(0);
    });
  });

  // =========================================================================
  // 3. DYNAMIC RENORMALIZATION (Section 16.3)
  // =========================================================================
  describe("Dynamic Renormalization (Section 16.3)", () => {
    it("renormalizes scores when disabled fields are excluded from denominator", () => {
      const student = createStudent();
      const tutor = createTutor();

      // 1. With no disabled fields, total max = 100, earned = 100 -> score = 100
      const standard = scoreTutor(student, tutor, [], DEFAULT_OPTIONS);
      expect(standard.breakdown.totalMax).toBe(100);
      expect(standard.score).toBe(100);

      // 2. With boards disabled: max becomes 100 - 10 = 90
      const disabledBoard = scoreTutor(student, tutor, [], {
        ...DEFAULT_OPTIONS,
        disabled_fields: ["boards"],
      });
      expect(disabledBoard.breakdown.board.skipped).toBe(true);
      expect(disabledBoard.breakdown.totalMax).toBe(90);
      expect(disabledBoard.breakdown.totalEarned).toBe(90);
      expect(disabledBoard.score).toBe(100); // 100 * 90 / 90 = 100

      // 3. With boards and timings disabled: max becomes 100 - 10 - 5 = 85
      const disabledBoth = scoreTutor(student, tutor, [], {
        ...DEFAULT_OPTIONS,
        disabled_fields: ["boards", "available_timings"],
      });
      expect(disabledBoth.breakdown.totalMax).toBe(85);
      expect(disabledBoth.score).toBe(100);

      // 4. Renormalization with partial earnings:
      // Say boards disabled (max 90). Tutor has 0 on locality (earned = 90 - 30 = 60).
      // Score = round(100 * 60 / 90) = round(66.666...) = 67
      const partialTutor = createTutor({
        current_locality: "Faraway",
        localities: "Faraway",
      });
      const partialRes = scoreTutor(student, partialTutor, [], {
        ...DEFAULT_OPTIONS,
        disabled_fields: ["boards"],
      });
      expect(partialRes.breakdown.totalMax).toBe(90);
      expect(partialRes.breakdown.totalEarned).toBe(60);
      expect(partialRes.score).toBe(67);
    });

    it("renormalizes online student without locality and disabled board (max 60)", () => {
      const student = createStudent({ tuition_type: "ONLINE" });
      const tutor = createTutor({ teaching_mode: "BOTH" });

      const res = scoreTutor(student, tutor, [], {
        ...DEFAULT_OPTIONS,
        disabled_fields: ["boards"],
      });

      // Max points = 100 - 30 (locality) - 10 (board) = 60
      expect(res.breakdown.totalMax).toBe(60);
      expect(res.breakdown.totalEarned).toBe(60);
      expect(res.score).toBe(100);
    });
  });

  // =========================================================================
  // 4. RANKING & TIE-BREAKING (Section 16.3)
  // =========================================================================
  describe("Ranking and Tie-breaking (Section 16.3)", () => {
    it("sorts by score descending", () => {
      const student = createStudent();
      const highTutor = createTutor({ tutor_id: "T-HIGH", expected_fee: 5000 }); // score 100
      const medTutor = createTutor({ tutor_id: "T-MED", expected_fee: 5500 }); // score 95

      const results = matchTutors(student, [medTutor, highTutor], [], DEFAULT_OPTIONS);
      expect(results[0].tutor.tutor_id).toBe("T-HIGH");
      expect(results[1].tutor.tutor_id).toBe("T-MED");
    });

    it("breaks ties with verified-first", () => {
      const student = createStudent();
      // Both tutors have same score (100)
      const unverifiedTutor = createTutor({
        tutor_id: "T-UNDER-REVIEW",
        verification_status: "UNDER_REVIEW",
        last_confirmed_at: "2026-11-01T10:00:00Z", // confirmed more recently
      });
      const verifiedTutor = createTutor({
        tutor_id: "T-VERIFIED",
        verification_status: "VERIFIED",
        last_confirmed_at: "2026-10-15T10:00:00Z",
      });

      const results = matchTutors(
        student,
        [unverifiedTutor, verifiedTutor],
        [],
        { ...DEFAULT_OPTIONS, include_unverified: true }
      );

      expect(results).toHaveLength(2);
      expect(results[0].tutor.tutor_id).toBe("T-VERIFIED");
      expect(results[1].tutor.tutor_id).toBe("T-UNDER-REVIEW");
    });

    it("breaks ties among verified tutors with more recently confirmed (last_confirmed_at desc)", () => {
      const student = createStudent();
      const tutorOlder = createTutor({
        tutor_id: "T-OLDER",
        last_confirmed_at: "2026-09-01T10:00:00Z",
      });
      const tutorNewer = createTutor({
        tutor_id: "T-NEWER",
        last_confirmed_at: "2026-10-25T10:00:00Z",
      });

      const results = matchTutors(student, [tutorOlder, tutorNewer], [], DEFAULT_OPTIONS);
      expect(results[0].tutor.tutor_id).toBe("T-NEWER");
      expect(results[1].tutor.tutor_id).toBe("T-OLDER");
    });
  });

  // =========================================================================
  // 5. MINIMUM SCORE FILTER (Section 16.3)
  // =========================================================================
  describe("Minimum Score Filtering (match_min_score)", () => {
    it("filters out tutors below match_min_score (default 30)", () => {
      const student = createStudent({ subjects: "Maths|Physics|Chemistry|Biology" });
      // Low score tutor:
      // Wrong locality (0/30), 1/4 subjects (6.25/25), Class (10/10), Wrong board (0/10),
      // Over budget > 15% (0/10), Wrong timing (0/5), 0 exp (0/5), Unconfirmed (0/5)
      // Total earned = 16.25 / 100 -> score = 16 < 30
      const lowTutor = createTutor({
        current_locality: "Outer Space",
        localities: "Outer Space",
        subjects: "Maths",
        boards: "ICSE",
        expected_fee: 10000,
        available_timings: "MORNING",
        experience_years: 0,
        last_confirmed_at: undefined,
      });

      const res = matchTutors(student, [lowTutor], [], DEFAULT_OPTIONS);
      expect(res).toHaveLength(0);

      // Verify reason in matchTutorsWithExcluded
      const withExcluded = matchTutorsWithExcluded(student, [lowTutor], [], DEFAULT_OPTIONS);
      expect(withExcluded.matches).toHaveLength(0);
      expect(withExcluded.excluded).toHaveLength(1);
      expect(withExcluded.excluded[0].reasons[0]).toContain("below minimum required score");
    });

    it("respects custom match_min_score", () => {
      const student = createStudent();
      const tutor = createTutor({ expected_fee: 5500 }); // Score 95

      // Minimum score 90 -> tutor passes
      expect(matchTutors(student, [tutor], [], { ...DEFAULT_OPTIONS, match_min_score: 90 })).toHaveLength(1);

      // Minimum score 98 -> tutor filtered out
      expect(matchTutors(student, [tutor], [], { ...DEFAULT_OPTIONS, match_min_score: 98 })).toHaveLength(0);
    });
  });

  // =========================================================================
  // 6. CUSTOM WEIGHTS VALIDATION (Section 16.3)
  // =========================================================================
  describe("Custom Weights Validation (match_weights_json)", () => {
    it("validates and parses valid match_weights_json", () => {
      const json = JSON.stringify({
        locality: 40,
        subject: 20,
        class: 10,
        board: 10,
        fee: 10,
        timing: 5,
        experience: 2.5,
        freshness: 2.5,
      });

      const validation = validateMatchWeights(json);
      expect(validation.valid).toBe(true);
      expect(validation.weights?.locality).toBe(40);
      expect(validation.weights?.subject).toBe(20);

      const parsed = parseMatchWeights(json);
      expect(parsed.locality).toBe(40);
    });

    it("rejects invalid, negative or non-numeric weights", () => {
      expect(validateMatchWeights("not-valid-json").valid).toBe(false);

      const negativeWeight = JSON.stringify({ locality: -10 });
      expect(validateMatchWeights(negativeWeight).valid).toBe(false);

      const zeroWeight = JSON.stringify({ locality: 0 });
      expect(validateMatchWeights(zeroWeight).valid).toBe(false);

      const nonNumWeight = JSON.stringify({ locality: "abc" });
      expect(validateMatchWeights(nonNumWeight).valid).toBe(false);

      expect(() => parseMatchWeights({ locality: -5 })).toThrow();
    });

    it("uses custom weights during matching", () => {
      const student = createStudent();
      const tutor = createTutor({
        current_locality: "Faraway",
        localities: "Faraway",
      });

      // Standard weights: locality is 30/100 -> missing locality leaves 70/100 -> score 70
      const standardRes = matchTutors(student, [tutor], [], DEFAULT_OPTIONS);
      expect(standardRes[0].score).toBe(70);

      // Custom weights: increase locality weight to 50
      const customRes = matchTutors(student, [tutor], [], {
        ...DEFAULT_OPTIONS,
        weights: { locality: 50 },
      });
      // New total max = 50 + 25 + 10 + 10 + 10 + 5 + 5 + 5 = 120
      // Earned = 120 - 50 = 70. Score = round(100 * 70 / 120) = 58
      expect(customRes[0].score).toBe(58);
    });
  });

  // =========================================================================
  // 7. ACTIVE ASSIGNMENTS & REASON CHIPS (Section 16.4)
  // =========================================================================
  describe("Active Assignments and Reason Chips (Section 16.4)", () => {
    it("reports active assignments count for tutors", () => {
      const student = createStudent();
      const tutor1 = createTutor({ tutor_id: "TUT-1" });
      const tutor2 = createTutor({ tutor_id: "TUT-2" });

      const assignments: Assignment[] = [
        {
          assignment_id: "ASN-1",
          student_id: "STU-A",
          tutor_id: "TUT-1",
          subjects: "Mathematics",
          created_at: "2026-11-01T10:00:00Z",
          updated_at: "2026-11-01T10:00:00Z",
          created_by: "ADMIN",
          assignment_status: "ACTIVE",
          demo_status: "COMPLETED",
        },
        {
          assignment_id: "ASN-2",
          student_id: "STU-B",
          tutor_id: "TUT-1",
          subjects: "Science",
          created_at: "2026-11-01T10:00:00Z",
          updated_at: "2026-11-01T10:00:00Z",
          created_by: "ADMIN",
          assignment_status: "ACTIVE",
          demo_status: "COMPLETED",
        },
        {
          assignment_id: "ASN-3",
          student_id: "STU-C",
          tutor_id: "TUT-2",
          subjects: "Physics",
          created_at: "2026-11-01T10:00:00Z",
          updated_at: "2026-11-01T10:00:00Z",
          created_by: "ADMIN",
          assignment_status: "CANCELLED", // not active
          demo_status: "CANCELLED",
        },
      ];

      const results = matchTutors(student, [tutor1, tutor2], [], {
        ...DEFAULT_OPTIONS,
        assignments,
      });

      const res1 = results.find((r) => r.tutor.tutor_id === "TUT-1");
      const res2 = results.find((r) => r.tutor.tutor_id === "TUT-2");
      expect(res1?.activeAssignmentsCount).toBe(2);
      expect(res2?.activeAssignmentsCount).toBe(0);
    });

    it("generates all 6 reason chips with correct types, labels, and tones", () => {
      const student = createStudent({
        subjects: "Mathematics|Science",
        class: "Class 10",
        locality: "Indiranagar",
        budget: 5000,
        preferred_timing: "EVENING",
        board: "CBSE",
      });

      const tutor = createTutor({
        subjects: "Mathematics|Science",
        classes: "Class 10",
        current_locality: "Indiranagar",
        expected_fee: 5000,
        available_timings: "EVENING",
        boards: "CBSE",
      });

      const results = matchTutors(student, [tutor], [], DEFAULT_OPTIONS);
      expect(results).toHaveLength(1);
      const chips = results[0].reasonChips;

      expect(chips).toHaveLength(6);
      expect(chips.map((c) => c.type)).toEqual([
        "locality",
        "subject",
        "class",
        "board",
        "budget",
        "timing",
      ]);

      for (const chip of chips) {
        expect(chip.matched).toBe(true);
        expect(chip.tone).toBe("success");
      }
    });

    it("supports matchTutorsWithExcluded for UI debugging and explanations", () => {
      const student = createStudent({
        tutor_gender_preference: "FEMALE",
        class: "Class 10",
        subjects: "Physics",
      });

      const femaleTutor = createTutor({
        tutor_id: "T-FEMALE",
        gender: "FEMALE",
        subjects: "Physics",
        classes: "Class 10",
      });

      const maleTutor = createTutor({
        tutor_id: "T-MALE",
        gender: "MALE",
        subjects: "Physics",
        classes: "Class 10",
      });

      const outcome = matchTutorsWithExcluded(student, [femaleTutor, maleTutor], [], DEFAULT_OPTIONS);
      expect(outcome.matches).toHaveLength(1);
      expect(outcome.matches[0].tutor.tutor_id).toBe("T-FEMALE");

      expect(outcome.excluded).toHaveLength(1);
      expect(outcome.excluded[0].tutor.tutor_id).toBe("T-MALE");
      expect(outcome.excluded[0].reasons[0]).toContain("Tutor gender (MALE) does not match student preference (FEMALE)");
    });
  });
});
