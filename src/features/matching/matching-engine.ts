import {
  Student,
  Tutor,
  LocalityLink,
  Assignment,
} from "@/types/entities";
import {
  TutorVerificationStatus,
  TutorAvailabilityStatus,
  TuitionType,
  TeachingMode,
  GenderPreference,
  Gender,
  TimingPreference,
} from "@/types/vocab";
import { splitMulti } from "@/lib/utils";

/**
 * Verification policies for tutor matching (Section 16.2)
 */
export type VerificationPolicy =
  | "VERIFIED_ONLY"
  | "INCLUDE_UNDER_REVIEW"
  | "INCLUDE_PENDING";

/**
 * Weights for matching factors, total default is 100 (Section 16.3)
 */
export interface MatchWeights {
  locality: number;
  subject: number;
  class: number;
  board: number;
  fee: number;
  timing: number;
  experience: number;
  freshness: number;
}

export const DEFAULT_MATCH_WEIGHTS: Readonly<MatchWeights> = {
  locality: 30,
  subject: 25,
  class: 10,
  board: 10,
  fee: 10,
  timing: 5,
  experience: 5,
  freshness: 5,
};

/**
 * Reason chip types and tones for UI display (Section 16.4)
 */
export type ReasonChipType =
  | "subject"
  | "class"
  | "locality"
  | "budget"
  | "timing"
  | "board";

export type ReasonChipTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export interface ReasonChip {
  type: ReasonChipType;
  label: string;
  matched: boolean;
  tone: ReasonChipTone;
  detail?: string;
}

export interface FactorScore {
  earned: number;
  max: number;
  skipped: boolean;
  notes?: string;
}

export interface MatchScoreBreakdown {
  locality: FactorScore;
  subject: FactorScore & { coveredCount: number; totalRequired: number };
  class: FactorScore;
  board: FactorScore;
  fee: FactorScore & { diff: number };
  timing: FactorScore;
  experience: FactorScore & { years: number };
  freshness: FactorScore & { daysSinceConfirmed: number | null };
  totalEarned: number;
  totalMax: number;
  normalizedScore: number;
}

export interface MatchResult {
  tutor: Tutor;
  score: number;
  reasonChips: ReasonChip[];
  breakdown: MatchScoreBreakdown;
  activeAssignmentsCount: number;
}

export interface ExcludedTutorResult {
  tutor: Tutor;
  reasons: string[];
}

export interface MatchOptions {
  verification_policy?: VerificationPolicy;
  include_unverified?: boolean;
  match_use_nearby?: boolean;
  match_budget_tolerance_pct?: number;
  match_min_score?: number;
  weights?: Partial<MatchWeights>;
  match_weights_json?: string;
  disabled_fields?: string[];
  now?: Date | string | number;
  assignments?: Assignment[];
  activeAssignmentsMap?: Record<string, number>;
}

/**
 * Validates match weights to ensure all factor weights are positive numbers (> 0).
 */
export function validateMatchWeights(input: unknown): {
  valid: boolean;
  error?: string;
  weights?: MatchWeights;
} {
  let raw: any = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return { valid: false, error: "Invalid JSON format for match weights" };
    }
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, error: "Match weights must be an object" };
  }

  const factorKeys: (keyof MatchWeights)[] = [
    "locality",
    "subject",
    "class",
    "board",
    "fee",
    "timing",
    "experience",
    "freshness",
  ];

  const parsed: Partial<MatchWeights> = {};

  for (const key of factorKeys) {
    if (key in raw) {
      const val = Number(raw[key]);
      if (typeof val !== "number" || isNaN(val) || val <= 0) {
        return {
          valid: false,
          error: `Weight for factor "${key}" must be a positive number (> 0), received: ${raw[key]}`,
        };
      }
      parsed[key] = val;
    }
  }

  const finalWeights: MatchWeights = {
    ...DEFAULT_MATCH_WEIGHTS,
    ...parsed,
  };

  return { valid: true, weights: finalWeights };
}

/**
 * Parses match weights from JSON or object; throws an error if invalid.
 */
export function parseMatchWeights(input: unknown): MatchWeights {
  const result = validateMatchWeights(input);
  if (!result.valid || !result.weights) {
    throw new Error(result.error || "Invalid match weights");
  }
  return result.weights;
}

/**
 * Helper to normalize strings for robust comparison
 */
function normalizeStr(val?: string | null): string {
  return (val || "").trim().toLowerCase();
}

/**
 * Helper to normalize class identifiers (e.g., 'Class 10', 'CLASS_10', '10')
 */
function normalizeClass(val?: string | null): string {
  return (val || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

/**
 * Checks all 7 hard filters from Section 16.2.
 * A tutor failing ANY filter is excluded.
 */
export function checkHardFilters(
  student: Student,
  tutor: Tutor,
  options?: MatchOptions
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // 1. Not archived
  if (tutor.archived === true) {
    reasons.push("Tutor is archived");
  }

  // 2. Verification status check
  // REJECTED and BLACKLISTED are NEVER included under any policy or toggle
  if (tutor.verification_status === "REJECTED") {
    reasons.push("Tutor verification status is REJECTED");
  } else if (tutor.verification_status === "BLACKLISTED") {
    reasons.push("Tutor verification status is BLACKLISTED");
  } else {
    const policy: VerificationPolicy = options?.verification_policy ?? "VERIFIED_ONLY";
    const includeUnverified = options?.include_unverified === true;

    let allowed: TutorVerificationStatus[] = ["VERIFIED"];
    if (includeUnverified || policy === "INCLUDE_PENDING") {
      allowed = ["VERIFIED", "UNDER_REVIEW", "PENDING"];
    } else if (policy === "INCLUDE_UNDER_REVIEW") {
      allowed = ["VERIFIED", "UNDER_REVIEW"];
    }

    if (!allowed.includes(tutor.verification_status)) {
      reasons.push(
        `Tutor verification status (${tutor.verification_status}) not permitted under policy ${policy}`
      );
    }
  }

  // 3. Availability status == ACTIVE
  if (tutor.availability_status !== "ACTIVE") {
    reasons.push(
      `Tutor availability status is ${tutor.availability_status} (must be ACTIVE)`
    );
  }

  // 4. Teaches at least one required subject (from subjects or secondary_subjects)
  const studentSubjects = splitMulti(student.subjects).map(normalizeStr);
  if (studentSubjects.length === 0) {
    reasons.push("Student has no required subjects specified");
  } else {
    const tutorSubjectList = [
      ...splitMulti(tutor.subjects).map(normalizeStr),
      ...splitMulti(tutor.secondary_subjects).map(normalizeStr),
    ];
    const tutorSubjectSet = new Set(tutorSubjectList);
    const hasSubjectMatch = studentSubjects.some((subj) => tutorSubjectSet.has(subj));
    if (!hasSubjectMatch) {
      reasons.push("Tutor does not teach any of the student's required subjects");
    }
  }

  // 5. Teaches the student's class
  const studentClass = (student.class || "").trim();
  if (!studentClass) {
    reasons.push("Student class is not specified");
  } else {
    const studentNormClass = normalizeClass(studentClass);
    const studentLowerClass = studentClass.toLowerCase();
    const tutorClasses = splitMulti(tutor.classes);
    const hasClassMatch = tutorClasses.some((tc) => {
      const lower = tc.trim().toLowerCase();
      return lower === studentLowerClass || normalizeClass(tc) === studentNormClass;
    });

    if (!hasClassMatch) {
      reasons.push(`Tutor does not teach student's class (${studentClass})`);
    }
  }

  // 6. Gender preference
  const genderPref = student.tutor_gender_preference;
  if (genderPref === "MALE" && tutor.gender !== "MALE") {
    reasons.push(
      `Tutor gender (${tutor.gender}) does not match student preference (MALE)`
    );
  } else if (genderPref === "FEMALE" && tutor.gender !== "FEMALE") {
    reasons.push(
      `Tutor gender (${tutor.gender}) does not match student preference (FEMALE)`
    );
  }

  // 7. Teaching mode compatibility (if student BOTH or tutor BOTH or both equal)
  const studentMode = student.tuition_type;
  const tutorMode = tutor.teaching_mode;
  const modeCompatible =
    studentMode === "BOTH" ||
    tutorMode === "BOTH" ||
    studentMode === tutorMode;

  if (!modeCompatible) {
    reasons.push(
      `Teaching mode incompatible (Student: ${studentMode}, Tutor: ${tutorMode})`
    );
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

/**
 * Calculates match score out of 100 with dynamic normalization and reason chips.
 * Follows Section 16.3 & 16.4.
 */
export function scoreTutor(
  student: Student,
  tutor: Tutor,
  localityLinks: LocalityLink[],
  options?: MatchOptions
): {
  score: number;
  reasonChips: ReasonChip[];
  breakdown: MatchScoreBreakdown;
} {
  // Resolve weights
  let weights: MatchWeights = { ...DEFAULT_MATCH_WEIGHTS };
  if (options?.match_weights_json) {
    weights = parseMatchWeights(options.match_weights_json);
  } else if (options?.weights) {
    const validated = validateMatchWeights(options.weights);
    if (validated.valid && validated.weights) {
      weights = validated.weights;
    }
  }

  const disabledFields = (options?.disabled_fields || []).map((f) => f.toLowerCase());
  const isFieldDisabled = (...fieldAliases: string[]) =>
    fieldAliases.some((alias) =>
      disabledFields.some(
        (df) => df === alias.toLowerCase() || df.includes(alias.toLowerCase())
      )
    );

  let totalEarnedPoints = 0;
  let totalMaxPoints = 0;
  const reasonChips: ReasonChip[] = [];

  // ----------------------------------------------------
  // 1. Locality (Weight: default 30)
  // Skipped for ONLINE-only requests or if locality field disabled
  // ----------------------------------------------------
  const isOnline = student.tuition_type === "ONLINE";
  const isLocalityDisabled = isFieldDisabled("locality", "localities");
  const skipLocality = isOnline || isLocalityDisabled;

  let localityScore: FactorScore;
  if (skipLocality) {
    localityScore = { earned: 0, max: 0, skipped: true };
    reasonChips.push({
      type: "locality",
      label: isOnline ? "Locality skipped (Online)" : "Locality skipped",
      matched: true,
      tone: "info",
    });
  } else {
    const locMax = weights.locality;
    totalMaxPoints += locMax;

    const studentLoc = normalizeStr(student.locality);
    const tutorCurrentLoc = normalizeStr(tutor.current_locality);
    const tutorLocs = splitMulti(tutor.localities).map(normalizeStr);

    const isExact =
      (studentLoc.length > 0 && tutorCurrentLoc === studentLoc) ||
      tutorLocs.includes(studentLoc);

    if (isExact) {
      localityScore = { earned: locMax, max: locMax, skipped: false };
      totalEarnedPoints += locMax;
      reasonChips.push({
        type: "locality",
        label: "Exact locality",
        matched: true,
        tone: "success",
      });
    } else {
      const useNearby = options?.match_use_nearby !== false;
      let isNearby = false;

      if (useNearby && studentLoc.length > 0) {
        isNearby = localityLinks.some((link) => {
          const la = normalizeStr(link.locality_a);
          const lb = normalizeStr(link.locality_b);

          if (la === studentLoc) {
            return tutorLocs.includes(lb) || tutorCurrentLoc === lb;
          }
          if (lb === studentLoc) {
            return tutorLocs.includes(la) || tutorCurrentLoc === la;
          }
          return false;
        });
      }

      if (isNearby) {
        const nearbyPoints = locMax * 0.5; // 15 points by default
        localityScore = { earned: nearbyPoints, max: locMax, skipped: false };
        totalEarnedPoints += nearbyPoints;
        reasonChips.push({
          type: "locality",
          label: "Nearby locality",
          matched: true,
          tone: "warning",
        });
      } else {
        localityScore = { earned: 0, max: locMax, skipped: false };
        reasonChips.push({
          type: "locality",
          label: "Different locality",
          matched: false,
          tone: "danger",
        });
      }
    }
  }

  // ----------------------------------------------------
  // 2. Subject (Weight: default 25)
  // 25 * (required subjects tutor covers / total required subjects)
  // ----------------------------------------------------
  const studentSubs = splitMulti(student.subjects);
  const totalRequired = studentSubs.length;
  const tutorAllSubs = new Set([
    ...splitMulti(tutor.subjects).map(normalizeStr),
    ...splitMulti(tutor.secondary_subjects).map(normalizeStr),
  ]);

  const coveredSubs = studentSubs.filter((s) => tutorAllSubs.has(normalizeStr(s)));
  const coveredCount = coveredSubs.length;

  const subjMax = weights.subject;
  totalMaxPoints += subjMax;
  const subjectEarned =
    totalRequired > 0 ? (subjMax * coveredCount) / totalRequired : subjMax;
  totalEarnedPoints += subjectEarned;

  const allSubjectsMatched = totalRequired > 0 && coveredCount === totalRequired;
  reasonChips.push({
    type: "subject",
    label: `${coveredCount}/${totalRequired} subjects matched`,
    matched: allSubjectsMatched,
    tone: allSubjectsMatched ? "success" : "warning",
  });

  const subjectScore = {
    earned: subjectEarned,
    max: subjMax,
    skipped: false,
    coveredCount,
    totalRequired,
  };

  // ----------------------------------------------------
  // 3. Class (Weight: default 10)
  // Already hard-filtered; award full 10
  // ----------------------------------------------------
  const classMax = weights.class;
  totalMaxPoints += classMax;
  totalEarnedPoints += classMax;
  reasonChips.push({
    type: "class",
    label: "Class matched",
    matched: true,
    tone: "success",
  });
  const classScore: FactorScore = {
    earned: classMax,
    max: classMax,
    skipped: false,
  };

  // ----------------------------------------------------
  // 4. Board (Weight: default 10)
  // 10 if student's board in tutor boards, else 0. Skipped if boards field is disabled.
  // ----------------------------------------------------
  const isBoardDisabled = isFieldDisabled("board", "boards", "field_boards");
  let boardScore: FactorScore;

  if (isBoardDisabled) {
    boardScore = { earned: 0, max: 0, skipped: true };
    reasonChips.push({
      type: "board",
      label: "Board skipped",
      matched: true,
      tone: "neutral",
    });
  } else {
    const boardMax = weights.board;
    totalMaxPoints += boardMax;

    const studentBoard = normalizeStr(student.board);
    const tutorBoards = splitMulti(tutor.boards).map(normalizeStr);
    const boardMatched =
      studentBoard.length > 0 && tutorBoards.includes(studentBoard);

    const boardEarned = boardMatched ? boardMax : 0;
    totalEarnedPoints += boardEarned;

    reasonChips.push({
      type: "board",
      label: boardMatched ? "Board matched" : "Different board",
      matched: boardMatched,
      tone: boardMatched ? "success" : "warning",
    });

    boardScore = {
      earned: boardEarned,
      max: boardMax,
      skipped: false,
    };
  }

  // ----------------------------------------------------
  // 5. Fee (Weight: default 10)
  // Tutor fee <= budget -> 10; within budget tolerance (default 15%) -> 5; else 0.
  // Skipped if expected_fee disabled or student budget not set
  // ----------------------------------------------------
  const isFeeDisabled = isFieldDisabled("fee", "expected_fee", "budget");
  const studentBudgetNum =
    student.budget !== undefined && student.budget !== null && student.budget !== ""
      ? typeof student.budget === "string"
        ? parseFloat(student.budget)
        : Number(student.budget)
      : null;

  let feeScore: FactorScore & { diff: number };
  if (isFeeDisabled || studentBudgetNum === null || isNaN(studentBudgetNum) || studentBudgetNum <= 0) {
    feeScore = { earned: 0, max: 0, skipped: true, diff: 0 };
    reasonChips.push({
      type: "budget",
      label: "Budget not specified",
      matched: true,
      tone: "neutral",
    });
  } else {
    const feeMax = weights.fee;
    totalMaxPoints += feeMax;

    const tutorFee = Number(tutor.expected_fee) || 0;
    const tolerancePct = options?.match_budget_tolerance_pct ?? 15;
    const maxToleratedFee = studentBudgetNum * (1 + tolerancePct / 100);
    const diff = Math.round(tutorFee - studentBudgetNum);

    if (tutorFee <= studentBudgetNum) {
      feeScore = { earned: feeMax, max: feeMax, skipped: false, diff: 0 };
      totalEarnedPoints += feeMax;
      reasonChips.push({
        type: "budget",
        label: "Within budget",
        matched: true,
        tone: "success",
      });
    } else if (tutorFee <= maxToleratedFee) {
      const halfPoints = feeMax * 0.5; // 5 points by default
      feeScore = { earned: halfPoints, max: feeMax, skipped: false, diff };
      totalEarnedPoints += halfPoints;
      reasonChips.push({
        type: "budget",
        label: `Over budget by ₹${diff.toLocaleString("en-IN")}`,
        matched: false,
        tone: "warning",
      });
    } else {
      feeScore = { earned: 0, max: feeMax, skipped: false, diff };
      reasonChips.push({
        type: "budget",
        label: `Over budget by ₹${diff.toLocaleString("en-IN")}`,
        matched: false,
        tone: "danger",
      });
    }
  }

  // ----------------------------------------------------
  // 6. Timing (Weight: default 5)
  // Student FLEXIBLE -> 5. Tutor available_timings includes student's timing -> 5. Else 0.
  // Skipped if timings field disabled.
  // ----------------------------------------------------
  const isTimingDisabled = isFieldDisabled(
    "timings",
    "timing",
    "available_timings",
    "preferred_timing"
  );
  let timingScore: FactorScore;

  if (isTimingDisabled) {
    timingScore = { earned: 0, max: 0, skipped: true };
    reasonChips.push({
      type: "timing",
      label: "Timing skipped",
      matched: true,
      tone: "neutral",
    });
  } else {
    const timingMax = weights.timing;
    totalMaxPoints += timingMax;

    const studentTiming = (student.preferred_timing || "").toUpperCase();
    const tutorTimings = splitMulti(tutor.available_timings).map((t) =>
      t.toUpperCase()
    );

    const isFlexible = studentTiming === "FLEXIBLE";
    const timingMatched = isFlexible || tutorTimings.includes(studentTiming);

    const timingEarned = timingMatched ? timingMax : 0;
    totalEarnedPoints += timingEarned;

    reasonChips.push({
      type: "timing",
      label: timingMatched ? "Timing matched" : "Different timing",
      matched: timingMatched,
      tone: timingMatched ? "success" : "warning",
    });

    timingScore = {
      earned: timingEarned,
      max: timingMax,
      skipped: false,
    };
  }

  // ----------------------------------------------------
  // 7. Experience (Weight: default 5)
  // min(5, round(experience_years))
  // ----------------------------------------------------
  const isExpDisabled = isFieldDisabled("experience", "experience_years");
  let experienceScore: FactorScore & { years: number };

  if (isExpDisabled) {
    experienceScore = { earned: 0, max: 0, skipped: true, years: 0 };
  } else {
    const expMax = weights.experience;
    totalMaxPoints += expMax;

    const years = Number(tutor.experience_years) || 0;
    const expEarned = Math.max(0, Math.min(expMax, Math.round(years)));
    totalEarnedPoints += expEarned;

    experienceScore = {
      earned: expEarned,
      max: expMax,
      skipped: false,
      years,
    };
  }

  // ----------------------------------------------------
  // 8. Freshness (Weight: default 5)
  // last_confirmed_at within 90 days -> 5, else 0
  // ----------------------------------------------------
  const isFreshnessDisabled = isFieldDisabled("freshness", "last_confirmed_at");
  let freshnessScore: FactorScore & { daysSinceConfirmed: number | null };

  if (isFreshnessDisabled) {
    freshnessScore = {
      earned: 0,
      max: 0,
      skipped: true,
      daysSinceConfirmed: null,
    };
  } else {
    const freshMax = weights.freshness;
    totalMaxPoints += freshMax;

    const now = options?.now ? new Date(options.now) : new Date();
    let daysSinceConfirmed: number | null = null;
    let freshEarned = 0;

    if (tutor.last_confirmed_at) {
      const confirmedDate = new Date(tutor.last_confirmed_at);
      if (!isNaN(confirmedDate.getTime())) {
        daysSinceConfirmed = Math.floor(
          (now.getTime() - confirmedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceConfirmed >= 0 && daysSinceConfirmed <= 90) {
          freshEarned = freshMax;
        }
      }
    }

    totalEarnedPoints += freshEarned;

    freshnessScore = {
      earned: freshEarned,
      max: freshMax,
      skipped: false,
      daysSinceConfirmed,
    };
  }

  // ----------------------------------------------------
  // Dynamic Normalization:
  // Final score = round(100 * points earned / max points of factors that apply)
  // ----------------------------------------------------
  const normalizedScore =
    totalMaxPoints > 0
      ? Math.round((100 * totalEarnedPoints) / totalMaxPoints)
      : 0;

  const breakdown: MatchScoreBreakdown = {
    locality: localityScore,
    subject: subjectScore,
    class: classScore,
    board: boardScore,
    fee: feeScore,
    timing: timingScore,
    experience: experienceScore,
    freshness: freshnessScore,
    totalEarned: totalEarnedPoints,
    totalMax: totalMaxPoints,
    normalizedScore,
  };

  return {
    score: normalizedScore,
    reasonChips,
    breakdown,
  };
}

/**
 * Sorts tutors by:
 * 1. Score descending
 * 2. Verified status first
 * 3. More recently confirmed (last_confirmed_at desc)
 * 4. Stable tie-break by tutor_id
 */
export function compareMatchResults(a: MatchResult, b: MatchResult): number {
  // 1. Score descending
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  // 2. Verified first
  const aVerified = a.tutor.verification_status === "VERIFIED" ? 1 : 0;
  const bVerified = b.tutor.verification_status === "VERIFIED" ? 1 : 0;
  if (bVerified !== aVerified) {
    return bVerified - aVerified;
  }

  // 3. More recently confirmed (descending)
  const aConfirmed = a.tutor.last_confirmed_at
    ? new Date(a.tutor.last_confirmed_at).getTime()
    : 0;
  const bConfirmed = b.tutor.last_confirmed_at
    ? new Date(b.tutor.last_confirmed_at).getTime()
    : 0;
  if (bConfirmed !== aConfirmed) {
    return bConfirmed - aConfirmed;
  }

  // 4. Stable tie-break by tutor_id
  return a.tutor.tutor_id.localeCompare(b.tutor.tutor_id);
}

/**
 * Executes matching and returns both ranked matches and excluded tutors with reasons.
 */
export function matchTutorsWithExcluded(
  student: Student,
  tutors: Tutor[],
  localityLinks: LocalityLink[],
  options?: MatchOptions
): {
  matches: MatchResult[];
  excluded: ExcludedTutorResult[];
} {
  const minScore = options?.match_min_score ?? 30;
  const matches: MatchResult[] = [];
  const excluded: ExcludedTutorResult[] = [];

  for (const tutor of tutors) {
    // 1. Hard filters check
    const filterResult = checkHardFilters(student, tutor, options);
    if (!filterResult.passed) {
      excluded.push({ tutor, reasons: filterResult.reasons });
      continue;
    }

    // 2. Scoring
    const { score, reasonChips, breakdown } = scoreTutor(
      student,
      tutor,
      localityLinks,
      options
    );

    // 3. Min score filter
    if (score < minScore) {
      excluded.push({
        tutor,
        reasons: [
          `Match score ${score} is below minimum required score (${minScore})`,
        ],
      });
      continue;
    }

    // 4. Active assignments count
    let activeAssignmentsCount = 0;
    if (
      options?.activeAssignmentsMap &&
      tutor.tutor_id in options.activeAssignmentsMap
    ) {
      activeAssignmentsCount = options.activeAssignmentsMap[tutor.tutor_id];
    } else if (options?.assignments) {
      activeAssignmentsCount = options.assignments.filter(
        (a) =>
          a.tutor_id === tutor.tutor_id && a.assignment_status === "ACTIVE"
      ).length;
    }

    matches.push({
      tutor,
      score,
      reasonChips,
      breakdown,
      activeAssignmentsCount,
    });
  }

  // Sort matched tutors
  matches.sort(compareMatchResults);

  return { matches, excluded };
}

/**
 * Pure function architecture for Smart Matching Engine (Section 16.1 - 16.4)
 */
export function matchTutors(
  student: Student,
  tutors: Tutor[],
  localityLinks: LocalityLink[],
  options?: MatchOptions
): MatchResult[] {
  return matchTutorsWithExcluded(student, tutors, localityLinks, options).matches;
}
