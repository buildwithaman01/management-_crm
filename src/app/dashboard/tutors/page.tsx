"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Ban,
  MessageSquare,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Pencil,
  Trash2,
  Camera,
  UploadCloud,
  ZoomIn,
  Download,
  Phone,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Tutor } from "@/types/entities";
import { TUTOR_VERIFICATION_STATUSES, TutorVerificationStatus } from "@/types/vocab";

export default function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<string>("ALL");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [selectedLocality, setSelectedLocality] = useState<string>("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [activeTutor, setActiveTutor] = useState<Tutor | null>(null);

  // Verification modal state
  const [verifyModalAction, setVerifyModalAction] = useState<"VERIFY" | "REJECT" | "BLACKLIST" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);

  // Edit & Delete modal states
  const [editingTutor, setEditingTutor] = useState<Tutor | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    subjects: "",
    teaching_mode: "HOME",
    localities: "",
    expected_fee: 0,
    experience_years: 0,
    highest_qualification: "",
    introduction: "",
    id_number: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Tutor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Document & Photo inspection and upload states
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState<string | null>(null);

  // Extract all unique localities across tutors & standard Patna areas
  const allLocalities = useMemo(() => {
    const locSet = new Set<string>();
    [
      "Kankarbagh", "Boring Road", "Bailey Road", "Rajendra Nagar", "Anisabad",
      "Ashiana Nagar", "Danapur", "Patliputra", "Fraser Road", "Saguna More",
      "Kadamkuan", "Exhibition Road", "Digha", "Gardanibagh", "Raja Bazar", "Phulwari Sharif"
    ].forEach((l) => locSet.add(l));

    tutors.forEach((t) => {
      if (t.current_locality) locSet.add(t.current_locality);
      if (t.localities) {
        t.localities.split("|").forEach((l) => {
          const trimmed = l.trim();
          if (trimmed) locSet.add(trimmed);
        });
      }
    });
    return Array.from(locSet).sort();
  }, [tutors]);

  function getDocViewUrl(val?: string, tutorName = "Tutor", type = "document"): string {
    if (!val) return "";
    if (val.startsWith("data:image") || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/")) {
      return val;
    }
    return `/api/admin/files/view?id=${encodeURIComponent(val)}&name=${encodeURIComponent(tutorName)}&type=${encodeURIComponent(type)}`;
  }

  function isImageUrl(val?: string): boolean {
    return Boolean(val && val.trim().length > 0);
  }

  function readFileAsDataUrl(file: File, maxWidth = 1200): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => resolve(reader.result as string);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  const handleUploadTutorDocument = async (
    tutorId: string,
    field: "photo_file_id" | "id_proof_file_id" | "address_proof_file_id",
    file: File
  ) => {
    setIsUploadingDoc(field);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch(`/api/admin/tutors/${tutorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: dataUrl }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setTutors((prev) =>
          prev.map((t) => (t.tutor_id === tutorId ? json.tutor : t))
        );
        if (activeTutor?.tutor_id === tutorId) {
          setActiveTutor(json.tutor);
        }
      } else {
        alert(json.message || "Failed to upload document.");
      }
    } catch {
      alert("Error reading and saving document.");
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const handleOpenEdit = (t: Tutor) => {
    setEditingTutor(t);
    setEditForm({
      full_name: t.full_name || "",
      phone: t.phone || "",
      subjects: t.subjects || "",
      teaching_mode: t.teaching_mode || "HOME",
      localities: t.localities || "",
      expected_fee: Number(t.expected_fee) || 0,
      experience_years: Number(t.experience_years) || 0,
      highest_qualification: t.highest_qualification || "",
      introduction: t.introduction || "",
      id_number: t.id_number || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTutor) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/tutors/${editingTutor.tutor_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTutors((prev) =>
          prev.map((t) => (t.tutor_id === editingTutor.tutor_id ? data.tutor : t))
        );
        if (activeTutor?.tutor_id === editingTutor.tutor_id) {
          setActiveTutor(data.tutor);
        }
        setEditingTutor(null);
      } else {
        alert(data.message || "Failed to update tutor.");
      }
    } catch {
      alert("Error updating tutor.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteTutor = async (tutorId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/tutors/${tutorId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTutors((prev) => prev.filter((t) => t.tutor_id !== tutorId));
        if (activeTutor?.tutor_id === tutorId) {
          setActiveTutor(null);
        }
        setDeleteCandidate(null);
      } else {
        alert(data.message || "Failed to delete tutor.");
      }
    } catch {
      alert("Error deleting tutor.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadTutors();
  }, [showArchived]);

  const loadTutors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tutors?archived=${showArchived}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTutors(json.tutors);
        }
      }
    } catch {
      // Empty fallback
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!activeTutor || !verifyModalAction) return;
    setVerifyError(null);
    setIsSubmittingVerify(true);

    const effectiveReason = actionReason.trim() || (
      verifyModalAction === "VERIFY"
        ? "Manually verified by admin"
        : verifyModalAction === "REJECT"
        ? "Application rejected by admin"
        : "Blacklisted by admin"
    );

    try {
      const res = await fetch(`/api/admin/tutors/${activeTutor.tutor_id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: verifyModalAction,
          reason: effectiveReason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Action failed");
      }

      // Update state
      const newStatus =
        verifyModalAction === "VERIFY"
          ? "VERIFIED"
          : verifyModalAction === "REJECT"
          ? "REJECTED"
          : "BLACKLISTED";

      const updatedTutor = json.tutor || {
        ...activeTutor,
        verification_status: newStatus as TutorVerificationStatus,
      };

      setTutors((prev) =>
        prev.map((t) =>
          t.tutor_id === activeTutor.tutor_id ? updatedTutor : t
        )
      );

      setActiveTutor(updatedTutor);
      setVerifyModalAction(null);
      setActionReason("");
      loadTutors();
    } catch (err: any) {
      setVerifyError(err.message || "Failed to update verification status.");
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const filteredTutors = tutors.filter((t) => {
    if (!showArchived && t.archived) return false;

    // 1. Verification status filter
    if (selectedVerification !== "ALL" && t.verification_status !== selectedVerification) {
      return false;
    }

    // 2. Locality filter
    if (selectedLocality !== "ALL") {
      const targetLoc = selectedLocality.toLowerCase();
      const tutorLocs = (t.localities || "").toLowerCase();
      const currentLoc = (t.current_locality || "").toLowerCase();
      if (!tutorLocs.includes(targetLoc) && !currentLoc.includes(targetLoc)) {
        return false;
      }
    }

    // 3. Subject filter with intelligent "All Subjects" support
    if (selectedSubject !== "ALL") {
      const tutorSubjs = (t.subjects || "").toUpperCase();
      const isAllSubjectsTutor =
        tutorSubjs.includes("ALL_SUBJECTS") ||
        tutorSubjs.includes("ALL SUBJECTS") ||
        tutorSubjs.includes("ALL") ||
        (t.subjects?.split("|").length || 0) >= 4;

      if (selectedSubject === "ALL_SUBJECTS") {
        if (!isAllSubjectsTutor) return false;
      } else {
        // Teacher teaches selected subject OR teaches "ALL_SUBJECTS" (very common for Class 1-5 primary teachers)
        const hasSpecific = tutorSubjs.includes(selectedSubject.toUpperCase());
        if (!hasSpecific && !isAllSubjectsTutor) {
          return false;
        }
      }
    }

    // 4. Class filter with intelligent "1 to 5 / All Classes" support
    if (selectedClass !== "ALL") {
      const tutorClasses = (t.classes || "").toUpperCase();
      const isAllClassesTutor = tutorClasses.includes("ALL") || tutorClasses.includes("CLASS_ALL");

      if (selectedClass === "CLASS_1_TO_5") {
        const primaryRegex = /(CLASS_[1-5]|1_TO_5|PRIMARY)/;
        const matchesPrimary = primaryRegex.test(tutorClasses) || isAllClassesTutor;
        if (!matchesPrimary) return false;
      } else if (selectedClass === "CLASS_6_TO_8") {
        const middleRegex = /(CLASS_[6-8]|6_TO_8|MIDDLE)/;
        const matchesMiddle = middleRegex.test(tutorClasses) || isAllClassesTutor;
        if (!matchesMiddle) return false;
      } else if (selectedClass === "CLASS_9_TO_10") {
        const highRegex = /(CLASS_9|CLASS_10|9_TO_10|SECONDARY)/;
        const matchesHigh = highRegex.test(tutorClasses) || isAllClassesTutor;
        if (!matchesHigh) return false;
      } else if (selectedClass === "CLASS_11_TO_12") {
        const seniorRegex = /(CLASS_11|CLASS_12|11_TO_12|SENIOR)/;
        const matchesSenior = seniorRegex.test(tutorClasses) || isAllClassesTutor;
        if (!matchesSenior) return false;
      } else {
        // Individual class like CLASS_5
        const num = selectedClass.replace("CLASS_", "");
        const isPrimaryClass = ["1", "2", "3", "4", "5"].includes(num);
        const matchesClass =
          tutorClasses.includes(selectedClass) ||
          (isPrimaryClass && (tutorClasses.includes("1_TO_5") || tutorClasses.includes("PRIMARY"))) ||
          isAllClassesTutor;
        if (!matchesClass) return false;
      }
    }

    // 5. Search query (searches across name, phone, ID, city, locality, subjects, classes)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (t.full_name || "").toLowerCase().includes(q);
      const matchPhone = (t.phone || "").includes(q);
      const matchId = (t.tutor_id || "").toLowerCase().includes(q);
      const matchCity = (t.current_city || "").toLowerCase().includes(q);
      const matchLocality = (t.current_locality || "").toLowerCase().includes(q) || (t.localities || "").toLowerCase().includes(q);
      const matchSubjects = (t.subjects || "").toLowerCase().includes(q);
      const matchClasses = (t.classes || "").toLowerCase().includes(q);
      return matchName || matchPhone || matchId || matchCity || matchLocality || matchSubjects || matchClasses;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Tutors & Verification
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Screen tutor profiles, inspect Aadhaar & photos, and verify teaching credentials
          </p>
        </div>

        <Link
          href="/tutor-registration"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm self-start"
        >
          <span>+ Add Tutor Form</span>
        </Link>
      </div>

      {/* Enhanced Multi-Criteria Filters Bar */}
      <div className="bg-white p-4 rounded-card border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          {/* 1. Text Search */}
          <div className="md:col-span-1">
            <SearchInput
              placeholder="Search name, phone, ID, area..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full"
            />
          </div>

          {/* 2. Class Filter */}
          <div>
            <select
              className="w-full h-9 px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="ALL">All Classes / Grades</option>
              <option value="CLASS_1_TO_5">★ Class 1 to 5 (Primary - All Subjects)</option>
              <option value="CLASS_6_TO_8">Class 6 to 8 (Middle)</option>
              <option value="CLASS_9_TO_10">Class 9 & 10 (High School)</option>
              <option value="CLASS_11_TO_12">Class 11 & 12 (Senior Secondary)</option>
              <option disabled>──────────</option>
              {Array.from({ length: 12 }, (_, i) => `CLASS_${i + 1}`).map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls.replace("CLASS_", "")}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Subject Filter */}
          <div>
            <select
              className="w-full h-9 px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="ALL">All Subjects</option>
              <option value="ALL_SUBJECTS">★ All Subjects (Primary / General)</option>
              <option disabled>──────────</option>
              {[
                "MATHEMATICS", "PHYSICS", "CHEMISTRY", "BIOLOGY",
                "SCIENCE", "ENGLISH", "HINDI", "SOCIAL_SCIENCE",
                "COMPUTER", "ACCOUNTANCY", "ECONOMICS", "BUSINESS_STUDIES",
                "SANSKRIT", "EVS"
              ].map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Location / Locality Filter */}
          <div>
            <select
              className="w-full h-9 px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              value={selectedLocality}
              onChange={(e) => setSelectedLocality(e.target.value)}
            >
              <option value="ALL">All Localities / Areas</option>
              {allLocalities.map((loc: string) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Verification Status Filter */}
          <div>
            <select
              className="w-full h-9 px-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              value={selectedVerification}
              onChange={(e) => setSelectedVerification(e.target.value)}
            >
              <option value="ALL">All Verification Statuses</option>
              {TUTOR_VERIFICATION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary & Active Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-gray-700 font-bold">
              {filteredTutors.length} {filteredTutors.length === 1 ? "tutor matches" : "tutors match"}
            </span>
            {(selectedClass !== "ALL" || selectedSubject !== "ALL" || selectedLocality !== "ALL" || selectedVerification !== "ALL" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClass("ALL");
                  setSelectedSubject("ALL");
                  setSelectedLocality("ALL");
                  setSelectedVerification("ALL");
                  setSearchQuery("");
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] underline ml-2"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-gray-500">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show Archived</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tutors Table (Section 15) */}
      <div className="bg-white rounded-card border border-gray-200 shadow-sm overflow-hidden">
        {filteredTutors.length === 0 ? (
          <EmptyState
            title="No tutors found"
            description="No tutor records match the selected filters or search parameters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tutor Profile</th>
                  <th className="py-3 px-4">Phone & City</th>
                  <th className="py-3 px-4">Qualification</th>
                  <th className="py-3 px-4">Subjects & Classes</th>
                  <th className="py-3 px-4">Experience & Fee</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredTutors.map((t) => (
                  <tr key={t.tutor_id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {isImageUrl(t.photo_file_id) ? (
                          <img
                            src={getDocViewUrl(t.photo_file_id, t.full_name, "photo")}
                            alt={t.full_name}
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                            {t.full_name?.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">{t.full_name}</div>
                          <div className="text-[10px] font-mono text-gray-400">{t.tutor_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-gray-900">
                        <span>{t.phone}</span>
                        {t.phone && (
                          <a
                            href={`tel:${t.phone}`}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title={`Call ${t.phone}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400">{t.current_city}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900">{t.highest_qualification}</div>
                      <div className="text-[11px] text-gray-400">{t.specialization || "General"}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate" title={t.subjects}>
                      <div>{t.subjects?.split("|").join(", ")}</div>
                      <div className="text-[11px] text-gray-400">
                        {t.classes?.split("|").map((c) => c.replace("CLASS_", "")).join(", ")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{t.experience_years} yrs exp</div>
                      <div className="font-mono font-medium text-gray-900">
                        {formatCurrency(t.expected_fee)}/mo
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.verification_status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.availability_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Quick Direct Verify / Reject on row */}
                        {t.verification_status !== "VERIFIED" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTutor(t);
                                setVerifyModalAction("VERIFY");
                                setActionReason("");
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded"
                              title="Verify Tutor"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTutor(t);
                                setVerifyModalAction("REJECT");
                                setActionReason("");
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded"
                              title="Reject Tutor"
                            >
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        )}

                        {/* Direct Call Button */}
                        {t.phone && (
                          <a
                            href={`tel:${t.phone}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title={`Call ${t.full_name} (${t.phone})`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}

                        {/* WhatsApp Button */}
                        {t.phone && (
                          <a
                            href={`https://wa.me/${t.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `Hello ${t.full_name}, this is from Tuition Bureau regarding your tutor profile.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        )}

                        {/* Quick View Aadhaar / Docs Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTutor(t);
                            const docUrl = getDocViewUrl(
                              t.id_proof_file_id || t.photo_file_id || "",
                              t.full_name,
                              t.id_proof_file_id ? "aadhaar" : "photo"
                            );
                            if (docUrl) {
                              setLightboxImage({
                                url: docUrl,
                                title: `${t.full_name} - ${t.id_proof_file_id ? "Aadhaar Card" : "Profile Photo"}`,
                              });
                            }
                          }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                          title="View Aadhaar & Profile Photo"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTutor(t)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                          title="View Profile & Verification Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Tutor Profile"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(t)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete Tutor Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tutor Detail & Verification Drawer (Section 15.2 & 15.3) */}
      {activeTutor && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
            onClick={() => setActiveTutor(null)}
          />
          <div className="relative w-full max-w-xl bg-white shadow-2xl z-10 flex flex-col h-full overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                {isImageUrl(activeTutor.photo_file_id) ? (
                  <img
                    src={activeTutor.photo_file_id}
                    alt={activeTutor.full_name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-sm shrink-0 cursor-pointer"
                    onClick={() =>
                      setLightboxImage({
                        url: activeTutor.photo_file_id,
                        title: `${activeTutor.full_name} - Profile Photo`,
                      })
                    }
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                    {activeTutor.full_name?.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-mono text-gray-400">{activeTutor.tutor_id}</span>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    {activeTutor.full_name}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTutor(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Verification Bar */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 block">Current Verification Status</span>
                  <div className="mt-1">
                    <StatusBadge status={activeTutor.verification_status} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeTutor.verification_status !== "VERIFIED" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setVerifyModalAction("VERIFY");
                        setActionReason("");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verify Tutor
                    </Button>
                  )}
                  {activeTutor.verification_status !== "REJECTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setVerifyModalAction("REJECT");
                        setActionReason("");
                      }}
                      className="text-amber-700 border-amber-300 hover:bg-amber-50"
                    >
                      Reject
                    </Button>
                  )}
                  {activeTutor.verification_status !== "BLACKLISTED" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setVerifyModalAction("BLACKLIST");
                        setActionReason("");
                      }}
                    >
                      Blacklist
                    </Button>
                  )}
                </div>
              </div>

              {/* Sensitive KYC & Aadhaar Box (Section 8.3 & 15.3 - Interactive Document Inspection) */}
              <div className="p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 rounded-xl border border-blue-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>Administrative KYC & Identity Inspection</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Confidential
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-white/90 rounded-lg border border-blue-100 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[11px]">ID Type</span>
                    <span className="font-semibold text-gray-900">{activeTutor.id_type || "Aadhaar Card"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Aadhaar / ID Number</span>
                    <span className="font-mono font-bold text-gray-900 text-sm tracking-wide">
                      {activeTutor.id_number || "—"}
                    </span>
                  </div>
                </div>

                {/* Document & Photo Visual Inspection Cards */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                    <span>Teacher Photos & KYC Documents</span>
                    {isUploadingDoc && (
                      <span className="text-[11px] text-blue-600 animate-pulse font-medium">
                        Saving document...
                      </span>
                    )}
                  </div>

                  {/* 1. Teacher Profile Photo */}
                  <div className="p-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {isImageUrl(activeTutor.photo_file_id) ? (
                        <div
                          className="relative group cursor-pointer shrink-0"
                          onClick={() =>
                            setLightboxImage({
                              url: getDocViewUrl(activeTutor.photo_file_id, activeTutor.full_name, "photo"),
                              title: `${activeTutor.full_name} - Profile Photo`,
                            })
                          }
                        >
                          <img
                            src={getDocViewUrl(activeTutor.photo_file_id, activeTutor.full_name, "photo")}
                            alt="Profile"
                            className="w-14 h-14 rounded-lg object-cover border border-gray-300 group-hover:opacity-90 shadow-2xs"
                          />
                          <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 shrink-0">
                          <Camera className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px]">No Photo</span>
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">Profile Photo</span>
                          {isImageUrl(activeTutor.photo_file_id) ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-medium">Uploaded</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-medium">Pending</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5" title={activeTutor.photo_file_id}>
                          {activeTutor.photo_file_id ? (activeTutor.photo_file_id.length > 35 ? activeTutor.photo_file_id.slice(0, 35) + "..." : activeTutor.photo_file_id) : "No photo uploaded yet"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isImageUrl(activeTutor.photo_file_id) && (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              url: getDocViewUrl(activeTutor.photo_file_id, activeTutor.full_name, "photo"),
                              title: `${activeTutor.full_name} - Profile Photo`,
                            })
                          }
                          className="px-2 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 inline-flex items-center gap-1"
                          title="View Full Size"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      )}
                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isImageUrl(activeTutor.photo_file_id) ? "Change" : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadTutorDocument(activeTutor.tutor_id, "photo_file_id", file);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* 2. Aadhaar Card (Front Side) */}
                  <div className="p-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {isImageUrl(activeTutor.id_proof_file_id) ? (
                        <div
                          className="relative group cursor-pointer shrink-0"
                          onClick={() =>
                            setLightboxImage({
                              url: getDocViewUrl(activeTutor.id_proof_file_id, activeTutor.full_name, "aadhaar"),
                              title: `${activeTutor.full_name} - Aadhaar (Front Side)`,
                            })
                          }
                        >
                          <img
                            src={getDocViewUrl(activeTutor.id_proof_file_id, activeTutor.full_name, "aadhaar")}
                            alt="Aadhaar Front"
                            className="w-14 h-14 rounded-lg object-cover border border-gray-300 group-hover:opacity-90 shadow-2xs"
                          />
                          <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 shrink-0">
                          <FileText className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px]">Aadhaar Front</span>
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">Aadhaar (Front Side)</span>
                          {isImageUrl(activeTutor.id_proof_file_id) ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-medium">Uploaded</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-medium">Pending</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5" title={activeTutor.id_proof_file_id}>
                          {activeTutor.id_proof_file_id ? (activeTutor.id_proof_file_id.length > 35 ? activeTutor.id_proof_file_id.slice(0, 35) + "..." : activeTutor.id_proof_file_id) : "No front document"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isImageUrl(activeTutor.id_proof_file_id) && (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              url: getDocViewUrl(activeTutor.id_proof_file_id, activeTutor.full_name, "aadhaar"),
                              title: `${activeTutor.full_name} - Aadhaar (Front Side)`,
                            })
                          }
                          className="px-2 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 inline-flex items-center gap-1"
                          title="View Full Size"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Aadhaar</span>
                        </button>
                      )}
                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isImageUrl(activeTutor.id_proof_file_id) ? "Replace" : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadTutorDocument(activeTutor.tutor_id, "id_proof_file_id", file);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* 3. Aadhaar Card (Back Side / Address Proof) */}
                  <div className="p-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      {isImageUrl(activeTutor.address_proof_file_id) ? (
                        <div
                          className="relative group cursor-pointer shrink-0"
                          onClick={() =>
                            setLightboxImage({
                              url: getDocViewUrl(activeTutor.address_proof_file_id, activeTutor.full_name, "aadhaar_back"),
                              title: `${activeTutor.full_name} - Aadhaar (Back / Address)`,
                            })
                          }
                        >
                          <img
                            src={getDocViewUrl(activeTutor.address_proof_file_id, activeTutor.full_name, "aadhaar_back")}
                            alt="Aadhaar Back"
                            className="w-14 h-14 rounded-lg object-cover border border-gray-300 group-hover:opacity-90 shadow-2xs"
                          />
                          <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 shrink-0">
                          <FileText className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px]">Aadhaar Back</span>
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">Aadhaar (Back / Address)</span>
                          {isImageUrl(activeTutor.address_proof_file_id) ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-medium">Uploaded</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-medium">Pending</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5" title={activeTutor.address_proof_file_id}>
                          {activeTutor.address_proof_file_id ? (activeTutor.address_proof_file_id.length > 35 ? activeTutor.address_proof_file_id.slice(0, 35) + "..." : activeTutor.address_proof_file_id) : "No back document"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isImageUrl(activeTutor.address_proof_file_id) && (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              url: getDocViewUrl(activeTutor.address_proof_file_id, activeTutor.full_name, "aadhaar_back"),
                              title: `${activeTutor.full_name} - Aadhaar (Back / Address)`,
                            })
                          }
                          className="px-2 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 inline-flex items-center gap-1"
                          title="View Full Size"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Back</span>
                        </button>
                      )}
                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isImageUrl(activeTutor.address_proof_file_id) ? "Replace" : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadTutorDocument(activeTutor.tutor_id, "address_proof_file_id", file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Teaching Profile Details */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <span className="text-gray-400 block mb-0.5">Mobile Phone</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-gray-900">{activeTutor.phone}</span>
                    {activeTutor.phone && (
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${activeTutor.phone}`}
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 inline-flex items-center gap-1 text-[11px] font-semibold"
                          title="Call Tutor"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${activeTutor.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                            `Hello ${activeTutor.full_name}, this is from Tuition Bureau.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center gap-1 text-[11px] font-semibold"
                          title="WhatsApp Tutor"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Location</span>
                  <span className="font-semibold text-gray-900">
                    {activeTutor.current_locality ? `${activeTutor.current_locality}, ` : ""}
                    {activeTutor.current_city}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Qualification</span>
                  <span className="font-semibold text-gray-900">
                    {activeTutor.highest_qualification}
                  </span>
                  <div className="text-gray-500">{activeTutor.university}</div>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Expected Monthly Fee</span>
                  <span className="font-semibold text-gray-900 font-mono text-sm">
                    {formatCurrency(activeTutor.expected_fee)}
                  </span>
                </div>
              </div>

              {/* Subjects & Localities */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Subjects Taught
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {activeTutor.subjects?.split("|").map((subj) => (
                    <span
                      key={subj}
                      className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium"
                    >
                      {subj.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Teaching Localities
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {activeTutor.localities?.split("|").map((loc) => (
                    <span
                      key={loc}
                      className="px-2.5 py-1 rounded bg-gray-100 text-gray-800 text-xs"
                    >
                      {loc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Introduction */}
              {activeTutor.introduction && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Tutor Self-Introduction
                  </h3>
                  <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded border border-gray-100 leading-relaxed">
                    {activeTutor.introduction}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenEdit(activeTutor)}
                  className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit Tutor Profile</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteCandidate(activeTutor)}
                  className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Tutor Record</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Confirmation Modal (Section 15.2) */}
      {verifyModalAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setVerifyModalAction(null)}
          />
          <div className="relative bg-white rounded-card max-w-md w-full p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center gap-3">
              {verifyModalAction === "VERIFY" && (
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              )}
              {verifyModalAction === "REJECT" && (
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              )}
              {verifyModalAction === "BLACKLIST" && (
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Ban className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Confirm {verifyModalAction === "VERIFY" ? "Tutor Verification" : verifyModalAction}
                </h3>
                <p className="text-xs text-gray-500">
                  {verifyModalAction === "VERIFY"
                    ? "Ensure photo and Aadhaar credentials have been manually verified."
                    : "Please state the reason for this action. It will be recorded in the audit log."}
                </p>
              </div>
            </div>

            {verifyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {verifyError}
              </div>
            )}

            {(verifyModalAction === "REJECT" || verifyModalAction === "BLACKLIST") && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for {verifyModalAction} (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder={`Reason for ${verifyModalAction.toLowerCase()}ing this tutor...`}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmittingVerify}
                onClick={() => setVerifyModalAction(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                isLoading={isSubmittingVerify}
                disabled={isSubmittingVerify}
                variant={verifyModalAction === "BLACKLIST" ? "danger" : "primary"}
                onClick={handleVerificationSubmit}
              >
                Confirm {verifyModalAction}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tutor Modal */}
      {editingTutor && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => !isSavingEdit && setEditingTutor(null)}
          />
          <div className="relative bg-white rounded-card max-w-lg w-full p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Edit Tutor Profile</h3>
                <p className="text-xs text-gray-500 font-mono">{editingTutor.tutor_id}</p>
              </div>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => setEditingTutor(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full h-9 px-3 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full h-9 px-3 rounded border border-gray-300 font-mono text-gray-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Subjects Taught (pipe or comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.subjects}
                  onChange={(e) => setEditForm({ ...editForm, subjects: e.target.value })}
                  placeholder="e.g. MATHEMATICS|PHYSICS or MATHEMATICS, PHYSICS"
                  className="w-full h-9 px-3 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Teaching Mode *</label>
                  <select
                    value={editForm.teaching_mode}
                    onChange={(e) => setEditForm({ ...editForm, teaching_mode: e.target.value })}
                    className="w-full h-9 px-3 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="HOME">Home Tuition</option>
                    <option value="ONLINE">Online</option>
                    <option value="BOTH">Both (Home & Online)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Highest Qualification *</label>
                  <input
                    type="text"
                    required
                    value={editForm.highest_qualification}
                    onChange={(e) => setEditForm({ ...editForm, highest_qualification: e.target.value })}
                    placeholder="e.g. M.Sc, B.Tech, Ph.D"
                    className="w-full h-9 px-3 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Aadhaar / Government ID Number
                </label>
                <input
                  type="text"
                  value={editForm.id_number}
                  onChange={(e) => setEditForm({ ...editForm, id_number: e.target.value })}
                  placeholder="e.g. 1234-5678-9012"
                  className="w-full h-9 px-3 rounded border border-gray-300 font-mono text-gray-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Teaching Localities (pipe or comma separated)
                </label>
                <input
                  type="text"
                  value={editForm.localities}
                  onChange={(e) => setEditForm({ ...editForm, localities: e.target.value })}
                  placeholder="e.g. Indiranagar|Koramangala|Whitefield"
                  className="w-full h-9 px-3 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Expected Monthly Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editForm.expected_fee}
                    onChange={(e) => setEditForm({ ...editForm, expected_fee: Number(e.target.value) || 0 })}
                    className="w-full h-9 px-3 rounded border border-gray-300 font-mono text-gray-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editForm.experience_years}
                    onChange={(e) => setEditForm({ ...editForm, experience_years: Number(e.target.value) || 0 })}
                    className="w-full h-9 px-3 rounded border border-gray-300 font-mono text-gray-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Tutor Self-Introduction / Bio</label>
                <textarea
                  rows={3}
                  value={editForm.introduction}
                  onChange={(e) => setEditForm({ ...editForm, introduction: e.target.value })}
                  placeholder="Teaching philosophy, background, experience summary..."
                  className="w-full p-2.5 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSavingEdit}
                  onClick={() => setEditingTutor(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSavingEdit}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Tutor Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => !isDeleting && setDeleteCandidate(null)}
          />
          <div className="relative bg-white rounded-card max-w-md w-full p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Tutor Record</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
              Are you sure you want to permanently delete the tutor profile for{" "}
              <strong className="text-gray-900">{deleteCandidate.full_name}</strong> (ID:{" "}
              <span className="font-mono font-medium">{deleteCandidate.tutor_id}</span>)?
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                onClick={() => handleDeleteTutor(deleteCandidate.tutor_id)}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Full-size Lightbox / Zoom Modal for Photo & Aadhaar Inspection */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-gray-900 rounded-2xl p-4 flex flex-col max-h-[90vh] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 text-white">
              <span className="text-sm font-semibold">{lightboxImage.title}</span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  download="document.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-xs rounded-lg text-gray-200 flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-auto p-4 bg-black/40 rounded-xl mt-3">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
