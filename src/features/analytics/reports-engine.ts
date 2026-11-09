import { Student, Tutor, Assignment, Payment } from "@/types/entities";
import { splitMulti, sanitizeCsvFormula } from "@/lib/utils";

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number; // % of total leads
  dropoffRate?: number; // % dropped from previous stage
  description: string;
}

export interface FunnelMetrics {
  totalLeads: number;
  contacted: number;
  demosScheduled: number;
  demosCompleted: number;
  converted: number;
  lost: number;
  conversionRate: number; // (converted / totalLeads) * 100
  stages: FunnelStage[];
}

export interface SubjectDemandSupply {
  subject: string;
  demand: number; // Student count needing this subject
  supply: number; // Verified active tutor count teaching this subject
  gap: number; // demand - supply (+ means shortage/deficit, - means surplus)
  status: "DEFICIT" | "SURPLUS" | "BALANCED";
  coverageRatio: number; // supply / demand (or 1 if demand is 0)
}

export interface LocalityItem {
  locality: string;
  count: number;
  percentage: number;
}

export interface LocalityGap {
  locality: string;
  studentDemand: number;
  tutorSupply: number;
  gap: number; // studentDemand - tutorSupply
}

export interface LocalityDistribution {
  studentLocalities: LocalityItem[];
  tutorLocalities: LocalityItem[];
  localityGaps: LocalityGap[];
}

export interface RevenueSummary {
  activeAssignmentsCount: number;
  totalActiveAssignmentsFeeSum: number;
  commissionPercentage: number;
  estimatedCommission: number;
  receivedPayments: number;
  pendingPayments: number;
  totalPaymentsCount: number;
}

export interface ReportsData {
  period: "all" | "this_month" | "last_30_days";
  generatedAt: string;
  funnel: FunnelMetrics;
  subjectDemandSupply: SubjectDemandSupply[];
  localityDistribution: LocalityDistribution;
  revenueSummary: RevenueSummary;
  meta: {
    totalStudents: number;
    totalTutors: number;
    totalAssignments: number;
    totalPayments: number;
  };
}

/**
 * Filter items by period based on their created_at field
 */
export function filterByPeriod<T extends { created_at?: string }>(
  items: T[],
  period: "all" | "this_month" | "last_30_days" | string,
  now: Date = new Date()
): T[] {
  if (period === "all" || !period) {
    return items;
  }

  const nowMs = now.getTime();

  if (period === "last_30_days") {
    const thirtyDaysAgoMs = nowMs - 30 * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      if (!item.created_at) return false;
      const t = new Date(item.created_at).getTime();
      return !isNaN(t) && t >= thirtyDaysAgoMs && t <= nowMs;
    });
  }

  if (period === "this_month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(year, month, 1).getTime();
    return items.filter((item) => {
      if (!item.created_at) return false;
      const t = new Date(item.created_at).getTime();
      return !isNaN(t) && t >= startOfMonth && t <= nowMs;
    });
  }

  return items;
}

/**
 * Calculates conversion funnel metrics from students and assignments
 */
export function calculateFunnel(
  students: Student[],
  assignments: Assignment[] = []
): FunnelMetrics {
  const activeStudents = students.filter((s) => !s.archived);
  const totalLeads = activeStudents.length;

  if (totalLeads === 0) {
    return {
      totalLeads: 0,
      contacted: 0,
      demosScheduled: 0,
      demosCompleted: 0,
      converted: 0,
      lost: 0,
      conversionRate: 0,
      stages: [
        { stage: "Total Leads", count: 0, percentage: 0, description: "All incoming student inquiries" },
        { stage: "Contacted", count: 0, percentage: 0, description: "Parents reached & requirement verified" },
        { stage: "Demos Scheduled", count: 0, percentage: 0, description: "Trial class arranged with tutor" },
        { stage: "Demos Completed", count: 0, percentage: 0, description: "Trial class completed successfully" },
        { stage: "Converted", count: 0, percentage: 0, description: "Tuition started & fee agreed" },
        { stage: "Lost", count: 0, percentage: 0, description: "Dropped or cancelled inquiries" },
      ],
    };
  }

  // Pre-index assignments by student_id
  const assignmentsByStudent = new Map<string, Assignment[]>();
  for (const a of assignments) {
    if (!a.student_id) continue;
    const existing = assignmentsByStudent.get(a.student_id) || [];
    existing.push(a);
    assignmentsByStudent.set(a.student_id, existing);
  }

  let contactedCount = 0;
  let demosScheduledCount = 0;
  let demosCompletedCount = 0;
  let convertedCount = 0;
  let lostCount = 0;

  for (const s of activeStudents) {
    const stAssignments = assignmentsByStudent.get(s.student_id) || [];

    const isConverted =
      s.lead_status === "CONVERTED" ||
      stAssignments.some((a) => a.assignment_status === "ACTIVE" || a.assignment_status === "COMPLETED");

    const isDemoCompleted =
      isConverted ||
      stAssignments.some(
        (a) => a.demo_status === "COMPLETED" || a.assignment_status === "DEMO_COMPLETED"
      );

    const isDemoScheduled =
      isDemoCompleted ||
      s.lead_status === "DEMO_SCHEDULED" ||
      stAssignments.some(
        (a) =>
          a.demo_status === "SCHEDULED" ||
          a.assignment_status === "DEMO_SCHEDULED" ||
          Boolean(a.demo_at)
      );

    const isContacted =
      isDemoScheduled ||
      s.lead_status !== "NEW" ||
      stAssignments.length > 0;

    const isLost = s.lead_status === "LOST";

    if (isConverted) convertedCount++;
    if (isDemoCompleted) demosCompletedCount++;
    if (isDemoScheduled) demosScheduledCount++;
    if (isContacted) contactedCount++;
    if (isLost) lostCount++;
  }

  const conversionRate = totalLeads > 0 ? Number(((convertedCount / totalLeads) * 100).toFixed(1)) : 0;

  const getPct = (cnt: number) =>
    totalLeads > 0 ? Number(((cnt / totalLeads) * 100).toFixed(1)) : 0;

  const stages: FunnelStage[] = [
    {
      stage: "Total Leads",
      count: totalLeads,
      percentage: 100,
      description: "All student registration requirements",
    },
    {
      stage: "Contacted",
      count: contactedCount,
      percentage: getPct(contactedCount),
      dropoffRate:
        totalLeads > 0
          ? Number((((totalLeads - contactedCount) / totalLeads) * 100).toFixed(1))
          : 0,
      description: "Parents contacted by bureau",
    },
    {
      stage: "Demos Scheduled",
      count: demosScheduledCount,
      percentage: getPct(demosScheduledCount),
      dropoffRate:
        contactedCount > 0
          ? Number((((contactedCount - demosScheduledCount) / contactedCount) * 100).toFixed(1))
          : 0,
      description: "Trial demo classes scheduled",
    },
    {
      stage: "Demos Completed",
      count: demosCompletedCount,
      percentage: getPct(demosCompletedCount),
      dropoffRate:
        demosScheduledCount > 0
          ? Number(
              (((demosScheduledCount - demosCompletedCount) / demosScheduledCount) * 100).toFixed(1)
            )
          : 0,
      description: "Demo classes completed by tutor",
    },
    {
      stage: "Converted",
      count: convertedCount,
      percentage: getPct(convertedCount),
      dropoffRate:
        demosCompletedCount > 0
          ? Number((((demosCompletedCount - convertedCount) / demosCompletedCount) * 100).toFixed(1))
          : 0,
      description: "Regular tuition started",
    },
    {
      stage: "Lost",
      count: lostCount,
      percentage: getPct(lostCount),
      description: "Lost or cancelled requirements",
    },
  ];

  return {
    totalLeads,
    contacted: contactedCount,
    demosScheduled: demosScheduledCount,
    demosCompleted: demosCompletedCount,
    converted: convertedCount,
    lost: lostCount,
    conversionRate,
    stages,
  };
}

/**
 * Calculates subject demand vs supply:
 * - Demand: Number of students requiring the subject (non-archived students, especially open/active leads)
 * - Supply: Number of verified active tutors teaching the subject (primary or secondary)
 * - Gap: demand - supply (+ means deficit/shortage, - means surplus)
 * - Sorted by biggest shortage (demand - supply descending)
 */
export function calculateSubjectDemandSupply(
  students: Student[],
  tutors: Tutor[]
): SubjectDemandSupply[] {
  // Count student demand (non-archived students who are not yet CONVERTED or LOST, or all active requirements)
  const activeStudents = students.filter(
    (s) => !s.archived && s.lead_status !== "CONVERTED" && s.lead_status !== "LOST"
  );
  // Fallback to all non-archived students if there are none in open pipeline to avoid blank reports
  const studentsToEvaluate = activeStudents.length > 0 ? activeStudents : students.filter((s) => !s.archived);

  // Supply: verified active non-archived tutors
  const verifiedActiveTutors = tutors.filter(
    (t) =>
      !t.archived &&
      t.verification_status === "VERIFIED" &&
      t.availability_status === "ACTIVE"
  );

  const demandMap = new Map<string, number>();
  for (const s of studentsToEvaluate) {
    const subjects = splitMulti(s.subjects);
    for (const sub of subjects) {
      const normalized = sub.trim();
      if (!normalized) continue;
      demandMap.set(normalized, (demandMap.get(normalized) || 0) + 1);
    }
  }

  const supplyMap = new Map<string, number>();
  for (const t of verifiedActiveTutors) {
    const primary = splitMulti(t.subjects);
    const secondary = splitMulti(t.secondary_subjects);
    // Combine primary and secondary, deduplicating per tutor
    const tutorSubs = new Set<string>();
    for (const sub of [...primary, ...secondary]) {
      const normalized = sub.trim();
      if (normalized) tutorSubs.add(normalized);
    }
    tutorSubs.forEach((sub) => {
      supplyMap.set(sub, (supplyMap.get(sub) || 0) + 1);
    });
  }

  // Combine all subjects from both maps
  const allSubjects = new Set<string>();
  demandMap.forEach((_, key) => allSubjects.add(key));
  supplyMap.forEach((_, key) => allSubjects.add(key));
  const result: SubjectDemandSupply[] = [];

  allSubjects.forEach((subject) => {
    const demand = demandMap.get(subject) || 0;
    const supply = supplyMap.get(subject) || 0;
    const gap = demand - supply;

    let status: "DEFICIT" | "SURPLUS" | "BALANCED" = "BALANCED";
    if (gap > 0) status = "DEFICIT";
    else if (gap < 0) status = "SURPLUS";

    const coverageRatio = demand > 0 ? Number((supply / demand).toFixed(2)) : supply > 0 ? 999 : 1;

    result.push({
      subject,
      demand,
      supply,
      gap,
      status,
      coverageRatio,
    });
  });

  // Sort by biggest shortage first (gap descending: e.g. +5 before +2 before -3)
  // If tied, sort by higher demand first
  result.sort((a, b) => {
    if (b.gap !== a.gap) {
      return b.gap - a.gap;
    }
    return b.demand - a.demand;
  });

  return result;
}

/**
 * Calculates locality distribution and coverage gap
 */
export function calculateLocalityDistribution(
  students: Student[],
  tutors: Tutor[]
): LocalityDistribution {
  const activeStudents = students.filter((s) => !s.archived);
  const activeTutors = tutors.filter(
    (t) => !t.archived && t.verification_status === "VERIFIED" && t.availability_status === "ACTIVE"
  );

  const studentLocMap = new Map<string, number>();
  for (const s of activeStudents) {
    if (!s.locality) continue;
    const loc = s.locality.trim();
    if (loc) {
      studentLocMap.set(loc, (studentLocMap.get(loc) || 0) + 1);
    }
  }

  const tutorLocMap = new Map<string, number>();
  for (const t of activeTutors) {
    const locs = splitMulti(t.localities);
    if (locs.length === 0 && t.current_locality) {
      locs.push(t.current_locality);
    }
    // Deduplicate per tutor
    const uniqueLocs = new Set<string>();
    for (const l of locs) {
      const trimmed = l.trim();
      if (trimmed) uniqueLocs.add(trimmed);
    }
    uniqueLocs.forEach((loc) => {
      tutorLocMap.set(loc, (tutorLocMap.get(loc) || 0) + 1);
    });
  }

  const totalStudentCount = activeStudents.length || 1;
  const totalTutorCount = activeTutors.length || 1;

  const studentLocalities: LocalityItem[] = Array.from(studentLocMap.entries())
    .map(([locality, count]) => ({
      locality,
      count,
      percentage: Number(((count / totalStudentCount) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);

  const tutorLocalities: LocalityItem[] = Array.from(tutorLocMap.entries())
    .map(([locality, count]) => ({
      locality,
      count,
      percentage: Number(((count / totalTutorCount) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);

  const allLocs = new Set<string>();
  studentLocMap.forEach((_, key) => allLocs.add(key));
  tutorLocMap.forEach((_, key) => allLocs.add(key));

  const localityGaps: LocalityGap[] = [];
  allLocs.forEach((locality) => {
    const studentDemand = studentLocMap.get(locality) || 0;
    const tutorSupply = tutorLocMap.get(locality) || 0;
    localityGaps.push({
      locality,
      studentDemand,
      tutorSupply,
      gap: studentDemand - tutorSupply,
    });
  });
  localityGaps.sort((a, b) => b.gap - a.gap);

  return {
    studentLocalities,
    tutorLocalities,
    localityGaps,
  };
}

/**
 * Calculates revenue and commission metrics
 * Standard bureau commission is 50% (default) of first month fee
 */
export function calculateRevenueSummary(
  assignments: Assignment[],
  payments: Payment[] = [],
  commissionPercentage = 50
): RevenueSummary {
  // Active assignments
  const activeAssignments = assignments.filter((a) => a.assignment_status === "ACTIVE");
  const activeAssignmentsCount = activeAssignments.length;

  let totalActiveAssignmentsFeeSum = 0;
  for (const a of activeAssignments) {
    const fee = typeof a.agreed_fee === "string" ? parseFloat(a.agreed_fee) : Number(a.agreed_fee);
    if (!isNaN(fee) && fee > 0) {
      totalActiveAssignmentsFeeSum += fee;
    }
  }

  const estimatedCommission = Number(
    ((totalActiveAssignmentsFeeSum * commissionPercentage) / 100).toFixed(2)
  );

  let receivedPayments = 0;
  let pendingPayments = 0;
  let totalPaymentsCount = payments.length;

  for (const p of payments) {
    const amount = typeof p.amount === "string" ? parseFloat(p.amount) : Number(p.amount);
    const validAmount = !isNaN(amount) && amount > 0 ? amount : 0;

    if (p.payment_status === "PAID") {
      receivedPayments += validAmount;
    } else if (p.payment_status === "PENDING" || p.payment_status === "PARTIALLY_PAID") {
      pendingPayments += validAmount;
    }
  }

  return {
    activeAssignmentsCount,
    totalActiveAssignmentsFeeSum,
    commissionPercentage,
    estimatedCommission,
    receivedPayments,
    pendingPayments,
    totalPaymentsCount,
  };
}

/**
 * Generates formula-safe CSV export string for Reports & Analytics
 * Formula characters (=, +, -, @) are sanitized per Section 11.3
 */
export function generateReportsSummaryCsv(data: ReportsData): string {
  const lines: string[] = [];

  const addLine = (cells: (string | number)[]) => {
    const safeCells = cells.map((c) => {
      const sanitized = sanitizeCsvFormula(c);
      // Escape quotes and wrap in quotes if containing comma, newline or quotes
      if (/[",\n\r]/.test(sanitized)) {
        return `"${sanitized.replace(/"/g, '""')}"`;
      }
      return sanitized;
    });
    lines.push(safeCells.join(","));
  };

  // Title / Metadata
  addLine(["TUITION BUREAU CRM - REPORTS & ANALYTICS SUMMARY"]);
  addLine(["Generated At", data.generatedAt]);
  addLine(["Period", data.period]);
  addLine([]);

  // 1. Funnel Metrics
  addLine(["--- CONVERSION FUNNEL METRICS ---"]);
  addLine(["Stage", "Count", "Percentage of Leads", "Description"]);
  for (const st of data.funnel.stages) {
    addLine([st.stage, st.count, `${st.percentage}%`, st.description]);
  }
  addLine(["Overall Conversion Rate", `${data.funnel.conversionRate}%`]);
  addLine([]);

  // 2. Revenue & Commission Summary
  addLine(["--- REVENUE & COMMISSION SUMMARY ---"]);
  addLine(["Metric", "Value"]);
  addLine(["Active Assignments Count", data.revenueSummary.activeAssignmentsCount]);
  addLine(["Total Active Assignments Monthly Fee Sum", data.revenueSummary.totalActiveAssignmentsFeeSum]);
  addLine(["Bureau Commission Rate (%)", `${data.revenueSummary.commissionPercentage}%`]);
  addLine(["Estimated Bureau Commission", data.revenueSummary.estimatedCommission]);
  addLine(["Received Payments Total", data.revenueSummary.receivedPayments]);
  addLine(["Pending Payments Total", data.revenueSummary.pendingPayments]);
  addLine([]);

  // 3. Subject Demand vs Supply (Shortage Analysis)
  addLine(["--- SUBJECT DEMAND VS SUPPLY (SHORTAGE ANALYSIS) ---"]);
  addLine(["Subject", "Student Demand", "Verified Tutor Supply", "Gap (Demand - Supply)", "Status", "Coverage Ratio"]);
  for (const sub of data.subjectDemandSupply) {
    addLine([
      sub.subject,
      sub.demand,
      sub.supply,
      sub.gap,
      sub.status,
      sub.coverageRatio === 999 ? "Infinite" : `${sub.coverageRatio}x`,
    ]);
  }
  addLine([]);

  // 4. Locality Coverage & Gaps
  addLine(["--- LOCALITY COVERAGE & GAPS ---"]);
  addLine(["Locality", "Student Demand", "Tutor Supply", "Net Shortage (Gap)"]);
  for (const loc of data.localityDistribution.localityGaps) {
    addLine([loc.locality, loc.studentDemand, loc.tutorSupply, loc.gap]);
  }

  return lines.join("\r\n");
}
