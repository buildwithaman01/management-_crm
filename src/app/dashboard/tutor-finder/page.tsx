"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Compass,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MessageCircle,
  UserCheck,
  Award,
  ChevronDown,
  ChevronUp,
  Sliders,
  Scale,
  Sparkles,
  ArrowRight,
  User,
  X,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Student, Tutor } from "@/types/entities";
import {
  MatchResult,
  VerificationPolicy,
  ReasonChip,
} from "@/features/matching/matching-engine";
import { formatCurrency, formatPhoneNumber, cleanPhoneNumber } from "@/lib/utils";

function TutorFinderInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryStudentId = searchParams.get("studentId");

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(queryStudentId || "");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [policy, setPolicy] = useState<VerificationPolicy>("VERIFIED_ONLY");
  const [minScore, setMinScore] = useState<number>(30);
  const [showExcluded, setShowExcluded] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [excluded, setExcluded] = useState<{ tutor: Tutor; reason: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detail Drawer state
  const [activeDetail, setActiveDetail] = useState<MatchResult | null>(null);

  // Comparison state (up to 3 tutors)
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Student search filter
  const [studentSearch, setStudentSearch] = useState<string>("");

  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await fetch("/api/admin/students");
        const json = await res.json();
        if (json.success && Array.isArray(json.students)) {
          setStudents(json.students);
          if (queryStudentId) {
            const found = json.students.find((s: Student) => s.student_id === queryStudentId);
            if (found) setSelectedStudent(found);
          }
        }
      } catch (err) {
        console.error("Failed to load students", err);
      }
    }
    loadStudents();
  }, [queryStudentId]);

  useEffect(() => {
    if (selectedStudentId && students.length > 0) {
      const found = students.find((s) => s.student_id === selectedStudentId);
      setSelectedStudent(found || null);
    }
  }, [selectedStudentId, students]);

  useEffect(() => {
    if (!selectedStudentId) {
      setMatches([]);
      setExcluded([]);
      return;
    }

    async function runMatching() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/admin/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: selectedStudentId,
            policy,
            minScore,
            includeExcluded: showExcluded,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setMatches(data.results || []);
          if (data.excluded) setExcluded(data.excluded);
        } else {
          setErrorMsg(data.message || "Matching engine returned an error");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to fetch matches");
      } finally {
        setLoading(false);
      }
    }

    runMatching();
  }, [selectedStudentId, policy, minScore, showExcluded]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.student_name.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.locality?.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const handleToggleCompare = (tutorId: string) => {
    if (compareIds.includes(tutorId)) {
      setCompareIds(compareIds.filter((id) => id !== tutorId));
    } else {
      if (compareIds.length >= 3) {
        alert("You can compare up to 3 tutors at a time.");
        return;
      }
      setCompareIds([...compareIds, tutorId]);
    }
  };

  const comparedTutors = useMemo(() => {
    return matches.filter((m) => compareIds.includes(m.tutor.tutor_id));
  }, [matches, compareIds]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-300";
    if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-300";
    if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-300";
    return "text-slate-600 bg-slate-50 border-slate-300";
  };

  const getChipStyle = (tone: ReasonChip["tone"]) => {
    switch (tone) {
      case "success":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "warning":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "danger":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "info":
        return "bg-sky-50 text-sky-800 border-sky-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Compass className="w-7 h-7 text-indigo-600" />
            Tutor Finder & Smart Match
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Section 16 Dynamic Scoring Engine — match students with verified tutors in seconds.
          </p>
        </div>

        {compareIds.length > 0 && (
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
            <span className="text-xs font-semibold text-indigo-900">
              {compareIds.length} candidate{compareIds.length > 1 ? "s" : ""} selected
            </span>
            <Button
              size="sm"
              onClick={() => setIsComparing(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7"
            >
              <Scale className="w-3.5 h-3.5 mr-1" /> Compare Now
            </Button>
            <button
              onClick={() => setCompareIds([])}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Control Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Selector Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            1. Select Student Requirement
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              type="text"
              placeholder="Filter students by name, ID or locality..."
              className="pl-9 text-xs h-9"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border rounded-lg p-2 border-slate-100 bg-slate-50">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No matching students found</p>
            ) : (
              filteredStudents.map((s) => (
                <div
                  key={s.student_id}
                  onClick={() => {
                    setSelectedStudentId(s.student_id);
                    router.push(`/dashboard/tutor-finder?studentId=${s.student_id}`);
                  }}
                  className={`p-2 rounded-md cursor-pointer text-xs transition-colors flex items-center justify-between ${
                    selectedStudentId === s.student_id
                      ? "bg-indigo-600 text-white font-medium"
                      : "hover:bg-slate-200/60 text-slate-800 bg-white border border-slate-100"
                  }`}
                >
                  <div className="truncate">
                    <p className="font-semibold truncate">{s.student_name}</p>
                    <p
                      className={`text-[11px] truncate ${
                        selectedStudentId === s.student_id ? "text-indigo-100" : "text-slate-500"
                      }`}
                    >
                      Class {s.class} • {s.subjects} • {s.locality}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                      selectedStudentId === s.student_id
                        ? "bg-indigo-700 text-indigo-100"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {s.student_id}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Student Details Card */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Student Requirement Context
              </span>
              {selectedStudent && (
                <StatusBadge status={selectedStudent.lead_status} />
              )}
            </div>

            {selectedStudent ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Student / Parent</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedStudent.student_name}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Parent: {selectedStudent.parent_name || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Class & Board</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    Class {selectedStudent.class} ({selectedStudent.board || "Any Board"})
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Subjects Requested</span>
                  <p className="font-semibold text-indigo-700 mt-0.5">
                    {selectedStudent.subjects || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Locality & Mode</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedStudent.locality || "—"} ({selectedStudent.tuition_type})
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Budget & Schedule</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedStudent.budget ? formatCurrency(selectedStudent.budget) + "/mo" : "Flexible"}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {selectedStudent.preferred_timing || "Flexible timing"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Gender Preference</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedStudent.tutor_gender_preference || "ANY"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Select a student from the left panel to preview their requirement profile.
              </div>
            )}
          </div>

          {/* Engine Parameters */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Verification Filter
                </label>
                <select
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value as VerificationPolicy)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="VERIFIED_ONLY">Verified Only (Strict)</option>
                  <option value="INCLUDE_UNDER_REVIEW">Include Under Review</option>
                  <option value="INCLUDE_PENDING">Include Pending & Unverified</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Min Match Score: <span className="font-bold text-indigo-600">{minScore}%</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-28 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={showExcluded}
                  onChange={(e) => setShowExcluded(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px]">Show Excluded Tutors</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Ranked Recommendations ({matches.length})
          </h2>
          {matches.length > 0 && (
            <span className="text-xs text-slate-500">
              Sorted by Match Score & Availability
            </span>
          )}
        </div>

        {loading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Calculating locality, subject, and budget affinity...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        ) : !selectedStudent ? (
          <EmptyState
            title="No Student Selected"
            description="Choose a student lead from the panel above to run smart matching against all registered tutors."
            icon={Compass}
          />
        ) : matches.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-4">
            <EmptyState
              title="No Matching Tutors Found"
              description={`Zero tutors met the hard criteria for ${selectedStudent.student_name} (${selectedStudent.subjects || "Subjects"} in ${selectedStudent.locality || "City"}).`}
              icon={AlertCircle}
            />
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPolicy("INCLUDE_PENDING")}
                className="text-xs"
              >
                Include Unverified / Pending Tutors
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMinScore(15)}
                className="text-xs"
              >
                Lower Min Score to 15%
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {matches.map((res, idx) => {
              const tutor = res.tutor;
              const isSelectedForCompare = compareIds.includes(tutor.tutor_id);

              return (
                <div
                  key={tutor.tutor_id}
                  className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  {/* Left: Score Badge & Identity */}
                  <div className="flex items-start gap-4">
                    {/* Rank & Score Circle */}
                    <div className="flex flex-col items-center">
                      <div
                        onClick={() => setActiveDetail(res)}
                        className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 ${getScoreColor(
                          res.score
                        )}`}
                        title="Click to view full factor breakdown"
                      >
                        <span className="text-base font-black leading-none">{res.score}%</span>
                        <span className="text-[9px] font-bold uppercase tracking-tighter mt-0.5">
                          Match
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Tutor Details */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{tutor.full_name}</h3>
                        <StatusBadge status={tutor.verification_status} />
                        <span className="text-xs font-mono text-slate-400">
                          {tutor.tutor_id}
                        </span>
                        {res.activeAssignmentsCount > 0 && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium border border-indigo-100">
                            {res.activeAssignmentsCount} active students
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          <strong>Locality:</strong> {tutor.current_locality || tutor.localities || "—"}
                        </span>
                        <span>
                          <strong>Exp:</strong> {tutor.experience_years ? `${tutor.experience_years} yrs` : "Fresher"}
                        </span>
                        <span>
                          <strong>Fee:</strong> {tutor.expected_fee ? formatCurrency(tutor.expected_fee) + "/mo" : "Negotiable"}
                        </span>
                        <span>
                          <strong>Mode:</strong> {tutor.teaching_mode}
                        </span>
                      </div>

                      {/* Reason Chips (Section 16.4) */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {res.reasonChips.map((chip, cIdx) => (
                          <span
                            key={cIdx}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getChipStyle(
                              chip.tone
                            )}`}
                            title={chip.detail || chip.label}
                          >
                            {chip.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap md:flex-col items-center md:items-end gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/dashboard/assignments?new=true&studentId=${selectedStudent.student_id}&tutorId=${tutor.tutor_id}`
                          )
                        }
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                      >
                        Shortlist & Assign <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>

                      {tutor.phone && (
                        <a
                          href={`https://wa.me/${cleanPhoneNumber(tutor.whatsapp || tutor.phone)}?text=${encodeURIComponent(
                            `Hello ${tutor.full_name}, we have a home-tuition requirement for Class ${selectedStudent.class} (${selectedStudent.subjects}) in ${selectedStudent.locality}. Are you interested?`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveDetail(res)}
                        className="text-slate-600 hover:text-slate-900 text-xs h-7 px-2"
                      >
                        View Breakdown
                      </Button>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-500 hover:text-slate-800">
                        <input
                          type="checkbox"
                          checked={isSelectedForCompare}
                          onChange={() => handleToggleCompare(tutor.tutor_id)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        Compare
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Excluded Tutors Drawer / Accordion */}
        {showExcluded && excluded.length > 0 && (
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-slate-500" />
              Excluded Tutors ({excluded.length}) & Disqualification Reasons
            </h3>
            <div className="divide-y divide-slate-200">
              {excluded.map((item) => (
                <div
                  key={item.tutor.tutor_id}
                  className="py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {item.tutor.full_name}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.tutor.tutor_id}
                    </span>
                    <StatusBadge status={item.tutor.verification_status} />
                  </div>
                  <span className="text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                    {item.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Drawer */}
      {isComparing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600" /> Candidate Comparison Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Comparing {comparedTutors.length} shortlisted tutors for {selectedStudent?.student_name}
                </p>
              </div>
              <button
                onClick={() => setIsComparing(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {comparedTutors.map((res) => (
                <div
                  key={res.tutor.tutor_id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3"
                >
                  <div className="text-center border-b pb-3">
                    <div
                      className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center font-black text-sm border-2 ${getScoreColor(
                        res.score
                      )}`}
                    >
                      {res.score}%
                    </div>
                    <h4 className="font-bold text-slate-900 mt-2 text-sm">{res.tutor.full_name}</h4>
                    <p className="text-[11px] text-slate-500">{res.tutor.tutor_id}</p>
                    <div className="mt-1 flex justify-center">
                      <StatusBadge status={res.tutor.verification_status} />
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Locality
                      </span>
                      <span className="font-semibold text-slate-800">
                        {res.tutor.current_locality || res.tutor.localities}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Expected Fee
                      </span>
                      <span className="font-semibold text-slate-800">
                        {res.tutor.expected_fee ? formatCurrency(res.tutor.expected_fee) + "/mo" : "Negotiable"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Experience & Qualification
                      </span>
                      <span className="font-semibold text-slate-800">
                        {res.tutor.experience_years} yrs • {res.tutor.highest_qualification || "Graduate"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Subjects Taught
                      </span>
                      <span className="font-medium text-slate-700">{res.tutor.subjects}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Reason Chips
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {res.reasonChips.map((c, i) => (
                          <span
                            key={i}
                            className={`text-[9px] px-1.5 py-0.5 rounded border ${getChipStyle(
                              c.tone
                            )}`}
                          >
                            {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setIsComparing(false);
                      router.push(
                        `/dashboard/assignments?new=true&studentId=${selectedStudent?.student_id}&tutorId=${res.tutor.tutor_id}`
                      );
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 mt-2"
                  >
                    Select & Assign
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Factor Breakdown Modal */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Score Breakdown: {activeDetail.tutor.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Total Match: <span className="font-bold text-indigo-600">{activeDetail.score}%</span> (Normalized)
                </p>
              </div>
              <button
                onClick={() => setActiveDetail(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Locality Affinity (Max 30)</span>
                <span className="font-bold text-slate-900">
                  {activeDetail.breakdown.locality.earned} / {activeDetail.breakdown.locality.max} pts
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Subject Coverage (Max 25)</span>
                <span className="font-bold text-slate-900">
                  {activeDetail.breakdown.subject.earned} / {activeDetail.breakdown.subject.max} pts
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Class Match (Max 10)</span>
                <span className="font-bold text-slate-900">
                  {activeDetail.breakdown.class.earned} / {activeDetail.breakdown.class.max} pts
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Board Alignment (Max 10)</span>
                <span className="font-bold text-slate-900">
                  {activeDetail.breakdown.board.earned} / {activeDetail.breakdown.board.max} pts
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Budget / Fee Alignment (Max 10)</span>
                <span className="font-bold text-slate-900">
                  {activeDetail.breakdown.fee.earned} / {activeDetail.breakdown.fee.max} pts
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Timing Preference (Max 5)</span>
                <span className="font-bold text-slate-900">
                  {activeDetail.breakdown.timing.earned} / {activeDetail.breakdown.timing.max} pts
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Teaching Experience (Max 5)</span>
                <span className="font-bold text-slate-900">
                  {activeDetail.breakdown.experience.earned} / {activeDetail.breakdown.experience.max} pts
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Profile Freshness (Max 5)</span>
                <span className="font-bold text-slate-900">
                  {activeDetail.breakdown.freshness.earned} / {activeDetail.breakdown.freshness.max} pts
                </span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setActiveDetail(null)}
              className="w-full bg-slate-900 hover:bg-black text-white text-xs h-8"
            >
              Close Breakdown
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TutorFinderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Tutor Finder...</div>}>
      <TutorFinderInner />
    </Suspense>
  );
}
