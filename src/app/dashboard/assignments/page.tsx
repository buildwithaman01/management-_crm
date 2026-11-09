"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileCheck2,
  CalendarCheck,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Plus,
  ArrowRight,
  MessageCircle,
  Clock,
  Calendar,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  IndianRupee,
  Layers,
  ChevronRight,
} from "lucide-react";
import { formatDate, formatCurrency, cleanPhoneNumber } from "@/lib/utils";
import { Assignment, Student, Tutor } from "@/types/entities";
import {
  AssignmentStatus,
  DemoStatus,
  ASSIGNMENT_STATUSES,
  DEMO_STATUSES,
  ALLOWED_ASSIGNMENT_TRANSITIONS,
  STATUS_LABELS,
} from "@/types/vocab";

interface EnrichedAssignment extends Assignment {
  student_name?: string;
  parent_name?: string;
  student_phone?: string;
  student_class?: string;
  tutor_name?: string;
  tutor_phone?: string;
}

function AssignmentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Assignments & reference data state
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter state
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("ALL");
  const [selectedTutorFilter, setSelectedTutorFilter] = useState<string>("ALL");

  // Modals & Drawers state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTransitionAssignment, setActiveTransitionAssignment] = useState<EnrichedAssignment | null>(null);
  const [activeDemoAssignment, setActiveDemoAssignment] = useState<EnrichedAssignment | null>(null);
  const [activeDetailAssignment, setActiveDetailAssignment] = useState<EnrichedAssignment | null>(null);

  // Create Assignment Form state
  const [createStudentId, setCreateStudentId] = useState("");
  const [createTutorId, setCreateTutorId] = useState("");
  const [createSubjects, setCreateSubjects] = useState("");
  const [createAgreedFee, setCreateAgreedFee] = useState<string>("");
  const [createDemoAt, setCreateDemoAt] = useState("");
  const [createStatus, setCreateStatus] = useState<AssignmentStatus>("SHORTLISTED");
  const [createNotes, setCreateNotes] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Status Transition Form state
  const [targetStatus, setTargetStatus] = useState<AssignmentStatus | "">("");
  const [transitionDemoAt, setTransitionDemoAt] = useState("");
  const [transitionStartDate, setTransitionStartDate] = useState("");
  const [transitionEndDate, setTransitionEndDate] = useState("");
  const [transitionAgreedFee, setTransitionAgreedFee] = useState<string>("");
  const [transitionNotes, setTransitionNotes] = useState("");
  const [transitionSubmitting, setTransitionSubmitting] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Demo Scheduling Form state
  const [demoDateTime, setDemoDateTime] = useState("");
  const [demoStatusVal, setDemoStatusVal] = useState<DemoStatus>("SCHEDULED");
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  // Check query params for opening Create Modal
  useEffect(() => {
    const isNew = searchParams.get("new") === "true";
    const paramStudentId = searchParams.get("studentId");
    const paramTutorId = searchParams.get("tutorId");

    if (isNew) {
      setIsCreateOpen(true);
      if (paramStudentId) setCreateStudentId(paramStudentId);
      if (paramTutorId) setCreateTutorId(paramTutorId);
    }
  }, [searchParams]);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const loadAllData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [resAssignments, resStudents, resTutors] = await Promise.all([
        fetch("/api/admin/assignments"),
        fetch("/api/admin/students"),
        fetch("/api/admin/tutors"),
      ]);

      if (resAssignments.ok) {
        const json = await resAssignments.json();
        if (json.success) {
          setAssignments(json.assignments);
        }
      }

      if (resStudents.ok) {
        const json = await resStudents.json();
        if (json.success) {
          setStudents(json.students);
        }
      }

      if (resTutors.ok) {
        const json = await resTutors.json();
        if (json.success) {
          setTutors(json.tutors);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Sync selected student subjects in create form
  const handleStudentSelect = (studentId: string) => {
    setCreateStudentId(studentId);
    const stu = students.find((s) => s.student_id === studentId);
    if (stu) {
      if (!createSubjects) {
        setCreateSubjects(stu.subjects);
      }
      if (!createAgreedFee && stu.budget) {
        setCreateAgreedFee(String(stu.budget));
      }
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = assignments.length;
    const active = assignments.filter((a) => a.assignment_status === "ACTIVE").length;
    const demoScheduled = assignments.filter((a) => a.assignment_status === "DEMO_SCHEDULED").length;
    const shortlisted = assignments.filter((a) => a.assignment_status === "SHORTLISTED").length;
    const completed = assignments.filter((a) => a.assignment_status === "COMPLETED").length;
    return { total, active, demoScheduled, shortlisted, completed };
  }, [assignments]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      // Tab filter
      if (selectedStatusTab !== "ALL" && item.assignment_status !== selectedStatusTab) {
        return false;
      }

      // Student filter
      if (selectedStudentFilter !== "ALL" && item.student_id !== selectedStudentFilter) {
        return false;
      }

      // Tutor filter
      if (selectedTutorFilter !== "ALL" && item.tutor_id !== selectedTutorFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const student = students.find((s) => s.student_id === item.student_id);
        const tutor = tutors.find((t) => t.tutor_id === item.tutor_id);

        const matchId = item.assignment_id.toLowerCase().includes(q);
        const matchStudentId = item.student_id.toLowerCase().includes(q);
        const matchTutorId = item.tutor_id.toLowerCase().includes(q);
        const matchSubjects = item.subjects.toLowerCase().includes(q);
        const matchStudentName = (student?.student_name || item.student_name || "").toLowerCase().includes(q);
        const matchParentName = (student?.parent_name || item.parent_name || "").toLowerCase().includes(q);
        const matchTutorName = (tutor?.full_name || item.tutor_name || "").toLowerCase().includes(q);

        return (
          matchId ||
          matchStudentId ||
          matchTutorId ||
          matchSubjects ||
          matchStudentName ||
          matchParentName ||
          matchTutorName
        );
      }

      return true;
    });
  }, [assignments, selectedStatusTab, selectedStudentFilter, selectedTutorFilter, searchQuery, students, tutors]);

  // Create Assignment submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSubmitting(true);

    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: createStudentId,
          tutor_id: createTutorId,
          subjects: createSubjects,
          agreed_fee: createAgreedFee ? Number(createAgreedFee) : undefined,
          demo_at: createDemoAt || undefined,
          assignment_status: createStatus,
          admin_notes: createNotes || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to create assignment");
      }

      showToast(`Assignment ${json.assignment.assignment_id} successfully created!`);
      setIsCreateOpen(false);
      resetCreateForm();
      loadAllData();
    } catch (err: any) {
      setCreateError(err.message || "Something went wrong creating the assignment");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setCreateStudentId("");
    setCreateTutorId("");
    setCreateSubjects("");
    setCreateAgreedFee("");
    setCreateDemoAt("");
    setCreateStatus("SHORTLISTED");
    setCreateNotes("");
    setCreateError(null);
  };

  // Open Transition Modal
  const openTransitionModal = (assignment: EnrichedAssignment) => {
    setActiveTransitionAssignment(assignment);
    const allowed = ALLOWED_ASSIGNMENT_TRANSITIONS[assignment.assignment_status] || [];
    setTargetStatus(allowed.length > 0 ? allowed[0] : "");
    setTransitionDemoAt(assignment.demo_at || "");
    setTransitionStartDate(assignment.start_date || new Date().toISOString().slice(0, 10));
    setTransitionEndDate(assignment.end_date || new Date().toISOString().slice(0, 10));
    setTransitionAgreedFee(assignment.agreed_fee ? String(assignment.agreed_fee) : "");
    setTransitionNotes(assignment.admin_notes || "");
    setTransitionError(null);
  };

  // Submit Status Transition
  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransitionAssignment || !targetStatus) return;

    setTransitionError(null);
    setTransitionSubmitting(true);

    try {
      const res = await fetch(`/api/admin/assignments/${activeTransitionAssignment.assignment_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          demo_at: targetStatus === "DEMO_SCHEDULED" ? transitionDemoAt : undefined,
          start_date: targetStatus === "ACTIVE" ? transitionStartDate : undefined,
          end_date: targetStatus === "COMPLETED" || targetStatus === "CANCELLED" ? transitionEndDate : undefined,
          agreed_fee: transitionAgreedFee ? Number(transitionAgreedFee) : undefined,
          admin_notes: transitionNotes || undefined,
          expectedUpdatedAt: activeTransitionAssignment.updated_at,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to update status");
      }

      showToast(`Status updated to ${STATUS_LABELS[targetStatus] || targetStatus}`);
      setActiveTransitionAssignment(null);
      loadAllData();
    } catch (err: any) {
      setTransitionError(err.message || "Could not execute transition");
    } finally {
      setTransitionSubmitting(false);
    }
  };

  // Open Demo Modal
  const openDemoModal = (assignment: EnrichedAssignment) => {
    setActiveDemoAssignment(assignment);
    setDemoDateTime(assignment.demo_at || "");
    setDemoStatusVal(assignment.demo_status || "SCHEDULED");
    setDemoError(null);
  };

  // Submit Demo Scheduling
  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDemoAssignment) return;

    if (!demoDateTime) {
      setDemoError("Demo date and time is required");
      return;
    }

    setDemoError(null);
    setDemoSubmitting(true);

    try {
      // Transition to DEMO_SCHEDULED or update demo details
      const target =
        activeDemoAssignment.assignment_status === "ACCEPTED" || activeDemoAssignment.assignment_status === "SHORTLISTED"
          ? "DEMO_SCHEDULED"
          : activeDemoAssignment.assignment_status;

      const res = await fetch(`/api/admin/assignments/${activeDemoAssignment.assignment_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: target,
          demo_at: demoDateTime,
          demo_status: demoStatusVal,
          expectedUpdatedAt: activeDemoAssignment.updated_at,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to schedule demo");
      }

      showToast("Demo class scheduled successfully!");
      setActiveDemoAssignment(null);
      loadAllData();
    } catch (err: any) {
      setDemoError(err.message || "Could not schedule demo");
    } finally {
      setDemoSubmitting(false);
    }
  };

  // WhatsApp quick link builder
  const getWhatsAppLink = (assignment: EnrichedAssignment, recipient: "TUTOR" | "PARENT") => {
    const student = students.find((s) => s.student_id === assignment.student_id);
    const tutor = tutors.find((t) => t.tutor_id === assignment.tutor_id);

    if (recipient === "TUTOR" && tutor) {
      const phone = cleanPhoneNumber(tutor.whatsapp || tutor.phone);
      const text = `Hello ${tutor.full_name}, regarding your assignment (ID: ${assignment.assignment_id}) for Class ${student?.class || "Student"} covering ${assignment.subjects}: demo scheduled for ${assignment.demo_at ? formatDate(assignment.demo_at) : "to be determined"}. Please confirm your availability.`;
      return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    }

    if (recipient === "PARENT" && student) {
      const phone = cleanPhoneNumber(student.whatsapp || student.phone);
      const text = `Dear ${student.parent_name}, tutor ${tutor?.full_name || "Assigned"} has been assigned for ${student.student_name} (${assignment.subjects}). Demo scheduled for ${assignment.demo_at ? formatDate(assignment.demo_at) : "soon"}. Best regards!`;
      return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    }

    return "#";
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border border-emerald-600 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <FileCheck2 className="w-7 h-7 text-indigo-600" />
            Assignments Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track student-tutor linkages, manage demo classes, and oversee workflow transitions (Section 17).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            + Create Assignment
          </Button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <MetricCard label="Total Assignments" value={metrics.total} icon={Layers} />
        <MetricCard label="Active" value={metrics.active} icon={CheckCircle2} />
        <MetricCard label="Demo Scheduled" value={metrics.demoScheduled} icon={CalendarCheck} />
        <MetricCard label="Shortlisted" value={metrics.shortlisted} icon={Users} />
        <MetricCard label="Completed" value={metrics.completed} icon={FileCheck2} />
      </div>

      {/* Error banner if top-level fetch failed */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">{errorMessage}</div>
          <Button size="sm" variant="outline" onClick={handleRefresh} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Status Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto pb-1 text-sm font-medium">
          {[
            { id: "ALL", label: "All" },
            { id: "SHORTLISTED", label: "Shortlisted" },
            { id: "CONTACTED", label: "Contacted" },
            { id: "ACCEPTED", label: "Accepted" },
            { id: "DEMO_SCHEDULED", label: "Demo Scheduled" },
            { id: "DEMO_COMPLETED", label: "Demo Completed" },
            { id: "ACTIVE", label: "Active" },
            { id: "COMPLETED", label: "Completed" },
            { id: "CANCELLED", label: "Cancelled" },
            { id: "REJECTED", label: "Rejected" },
          ].map((tab) => {
            const count =
              tab.id === "ALL"
                ? assignments.length
                : assignments.filter((a) => a.assignment_status === tab.id).length;
            const active = selectedStatusTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatusTab(tab.id)}
                className={`whitespace-nowrap px-3 py-2 rounded-t-lg font-medium text-xs transition-colors flex items-center gap-1.5 ${
                  active
                    ? "border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    active ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by ID, student, tutor, subjects..."
            className="pl-9 text-xs h-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Student Filter */}
          <select
            value={selectedStudentFilter}
            onChange={(e) => setSelectedStudentFilter(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Students</option>
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_name} ({s.student_id})
              </option>
            ))}
          </select>

          {/* Tutor Filter */}
          <select
            value={selectedTutorFilter}
            onChange={(e) => setSelectedTutorFilter(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Tutors</option>
            {tutors.map((t) => (
              <option key={t.tutor_id} value={t.tutor_id}>
                {t.full_name} ({t.tutor_id})
              </option>
            ))}
          </select>

          {(searchQuery || selectedStudentFilter !== "ALL" || selectedTutorFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedStudentFilter("ALL");
                setSelectedTutorFilter("ALL");
              }}
              className="text-xs h-9 text-gray-500 hover:text-gray-900"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Main Table or Empty State */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Loading assignments and linkages...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Assignments Found"
              description={
                searchQuery || selectedStatusTab !== "ALL"
                  ? "No assignment records match the chosen search or status filter."
                  : "No assignments have been created yet. Match students with verified tutors from Tutor Finder or click Create Assignment."
              }
              icon={FileCheck2}
              action={{
                label: "Create First Assignment",
                onClick: () => setIsCreateOpen(true),
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Assignment ID</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Tutor</th>
                  <th className="py-3 px-4">Subjects</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Demo Info</th>
                  <th className="py-3 px-4">Agreed Fee</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssignments.map((a) => {
                  const student = students.find((s) => s.student_id === a.student_id);
                  const tutor = tutors.find((t) => t.tutor_id === a.tutor_id);
                  const allowedTransitions = ALLOWED_ASSIGNMENT_TRANSITIONS[a.assignment_status] || [];
                  const isFinal = allowedTransitions.length === 0;

                  return (
                    <tr key={a.assignment_id} className="hover:bg-indigo-50/30 transition-colors">
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-medium text-gray-900">
                        {a.assignment_id}
                      </td>

                      {/* Student */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {student?.student_name || a.student_name || a.student_id}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {student?.class || a.student_class || "N/A"} • {student?.phone || a.student_phone || ""}
                        </div>
                      </td>

                      {/* Tutor */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {tutor?.full_name || a.tutor_name || a.tutor_id}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {tutor?.highest_qualification || "Tutor"} • {tutor?.phone || a.tutor_phone || ""}
                        </div>
                      </td>

                      {/* Subjects */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {a.subjects.split("|").map((subj, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium"
                            >
                              {subj}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={a.assignment_status} />
                      </td>

                      {/* Demo Info */}
                      <td className="py-3 px-4">
                        {a.demo_at ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[11px] text-gray-700 font-medium">
                              <Calendar className="w-3 h-3 text-indigo-500" />
                              {formatDate(a.demo_at)}
                            </div>
                            <div>
                              <StatusBadge status={a.demo_status} className="text-[10px] px-1.5 py-0" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Not scheduled</span>
                        )}
                      </td>

                      {/* Agreed Fee */}
                      <td className="py-3 px-4 font-mono font-medium text-gray-800">
                        {a.agreed_fee ? formatCurrency(Number(a.agreed_fee)) : "—"}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-gray-500 text-[11px]">
                        {formatDate(a.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Update Status Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTransitionModal(a)}
                            disabled={isFinal}
                            className={`h-7 px-2 text-[11px] ${
                              isFinal ? "opacity-40 cursor-not-allowed" : "hover:border-indigo-400"
                            }`}
                            title={isFinal ? "Final state - no further moves" : "Change Status"}
                          >
                            Update
                          </Button>

                          {/* Demo Scheduling Button */}
                          {(!a.demo_at || a.demo_status === "SCHEDULED") && !isFinal && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDemoModal(a)}
                              className="h-7 px-2 text-[11px] text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                              title="Schedule / Reschedule Demo"
                            >
                              <CalendarCheck className="w-3 h-3" />
                            </Button>
                          )}

                          {/* WhatsApp Button */}
                          <a
                            href={getWhatsAppLink(a, "TUTOR")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-7 px-2 rounded border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px]"
                            title="Chat with Tutor on WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>

                          {/* View Details Drawer */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveDetailAssignment(a)}
                            className="h-7 px-1.5 text-gray-500 hover:text-gray-900"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE ASSIGNMENT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Create New Assignment
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {createError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {createError}
                </div>
              )}

              {/* Student Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Student Requirement *
                </label>
                <select
                  required
                  value={createStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose a student lead --</option>
                  {students.map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.student_name} ({s.class} • {s.locality} • {s.student_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tutor Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assign Tutor *
                </label>
                <select
                  required
                  value={createTutorId}
                  onChange={(e) => setCreateTutorId(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose a tutor --</option>
                  {tutors.map((t) => (
                    <option key={t.tutor_id} value={t.tutor_id}>
                      {t.full_name} ({t.highest_qualification} • {t.tutor_id} • {t.verification_status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subjects */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subjects Covered (pipe or comma separated) *
                </label>
                <Input
                  required
                  type="text"
                  placeholder="e.g. Mathematics|Physics"
                  value={createSubjects}
                  onChange={(e) => setCreateSubjects(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* Agreed Fee & Initial Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Agreed Fee (₹)
                  </label>
                  <Input
                    type="number"
                    placeholder="Monthly fee"
                    value={createAgreedFee}
                    onChange={(e) => setCreateAgreedFee(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value as AssignmentStatus)}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="SHORTLISTED">SHORTLISTED</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="DEMO_SCHEDULED">DEMO_SCHEDULED</option>
                    <option value="ACTIVE">ACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Demo Scheduling (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Schedule Demo Class (Optional)</span>
                  <span className="text-[10px] text-gray-400 font-normal">Sets status to DEMO_SCHEDULED</span>
                </label>
                <Input
                  type="datetime-local"
                  value={createDemoAt}
                  onChange={(e) => setCreateDemoAt(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Administrative Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Specific requirements, student preferences, payment agreements..."
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  {createSubmitting ? "Creating..." : "Create Assignment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS TRANSITION MODAL */}
      {activeTransitionAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Update Assignment Status</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  ID: {activeTransitionAssignment.assignment_id}
                </p>
              </div>
              <button
                onClick={() => setActiveTransitionAssignment(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTransitionSubmit} className="p-6 space-y-4">
              {transitionError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {transitionError}
                </div>
              )}

              {/* Current Status Banner */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Current Status:</span>
                <StatusBadge status={activeTransitionAssignment.assignment_status} />
              </div>

              {/* Target Status Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Allowed Target Status *
                </label>
                <select
                  required
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as AssignmentStatus)}
                  className="w-full text-xs h-9 px-3 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(ALLOWED_ASSIGNMENT_TRANSITIONS[activeTransitionAssignment.assignment_status] || []).map(
                    (status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status] || status}
                      </option>
                    )
                  )}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Transitions follow Section 7.2 of the CRM Specification.
                </p>
              </div>

              {/* Dynamic Form: DEMO_SCHEDULED requires demo_at */}
              {targetStatus === "DEMO_SCHEDULED" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Demo Date & Time *
                  </label>
                  <Input
                    required
                    type="datetime-local"
                    value={transitionDemoAt}
                    onChange={(e) => setTransitionDemoAt(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              )}

              {/* Dynamic Form: ACTIVE asks for start_date & agreed_fee */}
              {targetStatus === "ACTIVE" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={transitionStartDate}
                      onChange={(e) => setTransitionStartDate(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Agreed Fee (₹/month)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 5000"
                      value={transitionAgreedFee}
                      onChange={(e) => setTransitionAgreedFee(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Form: COMPLETED / CANCELLED asks for end_date */}
              {(targetStatus === "COMPLETED" || targetStatus === "CANCELLED") && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={transitionEndDate}
                    onChange={(e) => setTransitionEndDate(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              )}

              {/* Dynamic Form: REJECTED asks for reason/notes */}
              {targetStatus === "REJECTED" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Reason for Rejection *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Provide detailed reason for audit trail..."
                    value={transitionNotes}
                    onChange={(e) => setTransitionNotes(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTransitionAssignment(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={transitionSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  {transitionSubmitting ? "Updating..." : "Confirm Transition"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEMO SCHEDULING MODAL */}
      {activeDemoAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                Schedule Demo Class
              </h2>
              <button
                onClick={() => setActiveDemoAssignment(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDemoSubmit} className="p-6 space-y-4">
              {demoError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {demoError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Demo Class Date & Time *
                </label>
                <Input
                  required
                  type="datetime-local"
                  value={demoDateTime}
                  onChange={(e) => setDemoDateTime(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Demo Status
                </label>
                <select
                  value={demoStatusVal}
                  onChange={(e) => setDemoStatusVal(e.target.value as DemoStatus)}
                  className="w-full text-xs h-9 px-3 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {DEMO_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status] || status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveDemoAssignment(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={demoSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  {demoSubmitting ? "Saving..." : "Save Demo"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS DRAWER */}
      {activeDetailAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-gray-200 flex flex-col p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {activeDetailAssignment.assignment_id}
                </span>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">Assignment Record</h2>
              </div>
              <button
                onClick={() => setActiveDetailAssignment(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status overview */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Assignment Status:</span>
                <StatusBadge status={activeDetailAssignment.assignment_status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Demo Status:</span>
                <StatusBadge status={activeDetailAssignment.demo_status} />
              </div>
              {activeDetailAssignment.agreed_fee && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Agreed Monthly Fee:</span>
                  <span className="text-xs font-bold text-gray-900 font-mono">
                    {formatCurrency(Number(activeDetailAssignment.agreed_fee))}
                  </span>
                </div>
              )}
            </div>

            {/* Student & Tutor Card */}
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Student Lead
                </span>
                <div className="text-sm font-semibold text-gray-900">
                  {students.find((s) => s.student_id === activeDetailAssignment.student_id)?.student_name ||
                    activeDetailAssignment.student_id}
                </div>
                <div className="text-xs text-gray-500">
                  Parent: {students.find((s) => s.student_id === activeDetailAssignment.student_id)?.parent_name || "N/A"}
                </div>
                <div className="text-xs text-gray-500">
                  Class: {students.find((s) => s.student_id === activeDetailAssignment.student_id)?.class || "N/A"} • Phone: {students.find((s) => s.student_id === activeDetailAssignment.student_id)?.phone || "N/A"}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Assigned Tutor
                </span>
                <div className="text-sm font-semibold text-gray-900">
                  {tutors.find((t) => t.tutor_id === activeDetailAssignment.tutor_id)?.full_name ||
                    activeDetailAssignment.tutor_id}
                </div>
                <div className="text-xs text-gray-500">
                  Qualification: {tutors.find((t) => t.tutor_id === activeDetailAssignment.tutor_id)?.highest_qualification || "N/A"}
                </div>
                <div className="text-xs text-gray-500">
                  Phone: {tutors.find((t) => t.tutor_id === activeDetailAssignment.tutor_id)?.phone || "N/A"}
                </div>
              </div>
            </div>

            {/* Subjects */}
            <div>
              <span className="text-xs font-bold text-gray-700 block mb-1">Subjects Assigned</span>
              <div className="flex flex-wrap gap-1.5">
                {activeDetailAssignment.subjects.split("|").map((subj, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium"
                  >
                    {subj}
                  </span>
                ))}
              </div>
            </div>

            {/* Demo & Dates */}
            <div className="space-y-2 text-xs text-gray-600 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <span>Demo Date:</span>
                <span className="font-medium text-gray-900">
                  {activeDetailAssignment.demo_at ? formatDate(activeDetailAssignment.demo_at) : "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Start Date:</span>
                <span className="font-medium text-gray-900">
                  {activeDetailAssignment.start_date || "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>End Date:</span>
                <span className="font-medium text-gray-900">
                  {activeDetailAssignment.end_date || "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Created At:</span>
                <span className="font-mono text-gray-500 text-[11px]">
                  {formatDate(activeDetailAssignment.created_at)}
                </span>
              </div>
            </div>

            {/* Admin Notes */}
            {activeDetailAssignment.admin_notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-bold block mb-0.5">Notes:</span>
                {activeDetailAssignment.admin_notes}
              </div>
            )}

            {/* Drawer Actions */}
            <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const item = activeDetailAssignment;
                  setActiveDetailAssignment(null);
                  openTransitionModal(item);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                Change Assignment Status
              </Button>
              <div className="flex gap-2">
                <a
                  href={getWhatsAppLink(activeDetailAssignment, "TUTOR")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium"
                >
                  WhatsApp Tutor
                </a>
                <a
                  href={getWhatsAppLink(activeDetailAssignment, "PARENT")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium"
                >
                  WhatsApp Parent
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Assignments...</div>}>
      <AssignmentsPageContent />
    </React.Suspense>
  );
}
