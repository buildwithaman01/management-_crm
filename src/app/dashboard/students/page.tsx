"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Sparkles,
  MessageSquare,
  Eye,
  Filter,
  X,
  AlertTriangle,
  Archive,
  Pencil,
  Trash2,
  UserPlus,
  Phone,
} from "lucide-react";
import { AddStudentModal } from "@/components/dashboard/add-student-modal";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Student } from "@/types/entities";
import { LEAD_STATUSES, LeadStatus } from "@/types/vocab";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit & Delete modal states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({
    student_name: "",
    parent_name: "",
    phone: "",
    class: "",
    subjects: "",
    locality: "",
    budget: 0,
    academic_requirements: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setEditForm({
      student_name: s.student_name || "",
      parent_name: s.parent_name || "",
      phone: s.phone || "",
      class: s.class || "CLASS_10",
      subjects: s.subjects || "",
      locality: s.locality || "",
      budget: Number(s.budget) || 0,
      academic_requirements: s.academic_requirements || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/students/${editingStudent.student_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStudents((prev) =>
          prev.map((s) => (s.student_id === editingStudent.student_id ? data.student : s))
        );
        if (activeStudent?.student_id === editingStudent.student_id) {
          setActiveStudent(data.student);
        }
        setEditingStudent(null);
      } else {
        alert(data.message || "Failed to update student.");
      }
    } catch {
      alert("Error updating student.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStudents((prev) => prev.filter((s) => s.student_id !== studentId));
        if (activeStudent?.student_id === studentId) {
          setActiveStudent(null);
        }
        setDeleteCandidate(null);
      } else {
        alert(data.message || "Failed to delete student.");
      }
    } catch {
      alert("Error deleting student.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [showArchived]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students?archived=${showArchived}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setStudents(json.students);
        }
      }
    } catch {
      // Empty fallback
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (studentId: string, newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) =>
            s.student_id === studentId ? { ...s, lead_status: newStatus } : s
          )
        );
        if (activeStudent?.student_id === studentId) {
          setActiveStudent({ ...activeStudent, lead_status: newStatus });
        }
      }
    } catch (err) {
      console.error("Status update error", err);
    }
  };

  // Filter & Search logic
  const filteredStudents = students.filter((s) => {
    if (selectedStatus !== "ALL" && s.lead_status !== selectedStatus) {
      return false;
    }
    if (selectedClass !== "ALL" && s.class !== selectedClass) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.student_name?.toLowerCase().includes(q);
      const matchParent = s.parent_name?.toLowerCase().includes(q);
      const matchPhone = s.phone?.includes(q);
      const matchId = s.student_id?.toLowerCase().includes(q);
      const matchLocality = s.locality?.toLowerCase().includes(q);
      return matchName || matchParent || matchPhone || matchId || matchLocality;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Students & Inquiries
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage parent tuition requirements, lead statuses, and tutor dispatch
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Student Form</span>
          </Button>
          <Link
            href="/student-registration"
            target="_blank"
            className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
            title="Open Public Parent Registration Form"
          >
            <span>Public Link ↗</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-card border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Search student, parent, phone, ID..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full sm:w-64"
          />

          <select
            className="h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            {LEAD_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st.replace("_", " ")}
              </option>
            ))}
          </select>

          <select
            className="h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="ALL">All Classes</option>
            {[
              "CLASS_1", "CLASS_2", "CLASS_3", "CLASS_4", "CLASS_5",
              "CLASS_6", "CLASS_7", "CLASS_8", "CLASS_9", "CLASS_10",
              "CLASS_11", "CLASS_12", "GRADUATION", "COMPETITIVE_EXAMS"
            ].map((cls) => (
              <option key={cls} value={cls}>
                {cls.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show Archived</span>
          </label>
          <span className="font-mono text-gray-700 font-medium">
            {filteredStudents.length} records
          </span>
        </div>
      </div>

      {/* Students Data Table (Section 14) */}
      <div className="bg-white rounded-card border border-gray-200 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <EmptyState
            title="No students match criteria"
            description="Try adjusting your search terms, status filters, or add a new student requirement."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student & Parent</th>
                  <th className="py-3 px-4">Class & Board</th>
                  <th className="py-3 px-4">Subjects</th>
                  <th className="py-3 px-4">Locality & Mode</th>
                  <th className="py-3 px-4">Budget</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredStudents.map((s) => (
                  <tr key={s.student_id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-900">
                      {s.student_id}
                      {s.duplicate_of && (
                        <span
                          title={`Potential duplicate of ${s.duplicate_of}`}
                          className="ml-1.5 inline-flex items-center text-amber-600"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{s.student_name}</div>
                      <div className="text-[11px] text-gray-500">
                        Parent: {s.parent_name} • {s.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{s.class?.replace("_", " ")}</div>
                      <div className="text-[11px] text-gray-400">{s.board}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate" title={s.subjects}>
                      {s.subjects?.split("|").join(", ")}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>{s.locality || "—"}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-medium">
                        {s.tuition_type}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-900">
                      {formatCurrency(s.budget)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={s.lead_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Call Button */}
                        {s.phone && (
                          <a
                            href={`tel:${s.phone}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title={`Call ${s.parent_name} (${s.phone})`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}

                        {/* WhatsApp Click-to-Chat (Section 19) */}
                        {s.phone && (
                          <a
                            href={`https://wa.me/${s.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `Hello ${s.parent_name}, this is from Tuition Bureau regarding your home tuition request for ${s.student_name}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        )}

                        {/* Tutor Finder Link (Section 16) */}
                        <Link
                          href={`/dashboard/tutor-finder?studentId=${s.student_id}`}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                          title="Find Matching Tutors"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Link>

                        {/* View Detail Drawer */}
                        <button
                          type="button"
                          onClick={() => setActiveStudent(s)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Student */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Student"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Delete Student */}
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(s)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete Student"
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

      {/* Student Detail Drawer (Section 14) */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
            onClick={() => setActiveStudent(null)}
          />
          <div className="relative w-full max-w-lg bg-white shadow-2xl z-10 flex flex-col h-full overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-mono text-gray-400 uppercase">
                  {activeStudent.student_id}
                </span>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">
                  {activeStudent.student_name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveStudent(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Duplicate Banner */}
              {activeStudent.duplicate_of && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <strong>Duplicate Flag:</strong> This requirement was identified as a possible duplicate of{" "}
                    <span className="font-mono font-bold">{activeStudent.duplicate_of}</span>.
                  </div>
                </div>
              )}

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Update Lead Status
                </label>
                <select
                  className="w-full h-9 rounded border border-gray-300 px-3 text-xs bg-white text-gray-900 font-medium"
                  value={activeStudent.lead_status}
                  onChange={(e) =>
                    handleStatusChange(activeStudent.student_id, e.target.value as LeadStatus)
                  }
                >
                  {LEAD_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic & Tuition Summary */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <span className="text-gray-400 block mb-0.5">Parent / Contact</span>
                  <span className="font-semibold text-gray-900">{activeStudent.parent_name}</span>
                  <div className="text-gray-600 font-mono mt-0.5">{activeStudent.phone}</div>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Grade & Board</span>
                  <span className="font-semibold text-gray-900">
                    {activeStudent.class?.replace("_", " ")}
                  </span>
                  <div className="text-gray-600 mt-0.5">{activeStudent.board}</div>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Locality</span>
                  <span className="font-semibold text-gray-900">
                    {activeStudent.locality || "Online"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Monthly Budget</span>
                  <span className="font-semibold text-gray-900 font-mono">
                    {formatCurrency(activeStudent.budget)}
                  </span>
                </div>
              </div>

              {/* Subjects */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Required Subjects
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {activeStudent.subjects?.split("|").map((subj) => (
                    <span
                      key={subj}
                      className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium"
                    >
                      {subj.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Requirements & Notes */}
              {activeStudent.academic_requirements && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Academic Focus Areas
                  </h3>
                  <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded border border-gray-100 leading-relaxed">
                    {activeStudent.academic_requirements}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <Link
                  href={`/dashboard/tutor-finder?studentId=${activeStudent.student_id}`}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Tutor Finder for this Student</span>
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${activeStudent.phone}`}
                    className="w-full py-2 px-3 rounded-lg border border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Parent</span>
                  </a>
                  <a
                    href={`https://wa.me/${activeStudent.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Hello ${activeStudent.parent_name}, this is from Tuition Bureau regarding your request for ${activeStudent.student_name}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-lg border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenEdit(activeStudent)}
                  className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit Student</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteCandidate(activeStudent)}
                  className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Student</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => !isSavingEdit && setEditingStudent(null)}
          />
          <div className="relative bg-white rounded-card max-w-lg w-full p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Edit Student Record</h3>
                <p className="text-xs text-gray-500 font-mono">{editingStudent.student_id}</p>
              </div>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => setEditingStudent(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Student Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.student_name}
                    onChange={(e) => setEditForm({ ...editForm, student_name: e.target.value })}
                    className="w-full h-9 px-3 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Parent Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.parent_name}
                    onChange={(e) => setEditForm({ ...editForm, parent_name: e.target.value })}
                    className="w-full h-9 px-3 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Class / Grade *</label>
                  <select
                    value={editForm.class}
                    onChange={(e) => setEditForm({ ...editForm, class: e.target.value })}
                    className="w-full h-9 px-3 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                  >
                    {[
                      "CLASS_1", "CLASS_2", "CLASS_3", "CLASS_4", "CLASS_5",
                      "CLASS_6", "CLASS_7", "CLASS_8", "CLASS_9", "CLASS_10",
                      "CLASS_11", "CLASS_12", "GRADUATION", "COMPETITIVE_EXAMS"
                    ].map((cls) => (
                      <option key={cls} value={cls}>
                        {cls.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Subjects (pipe or comma separated)
                </label>
                <input
                  type="text"
                  value={editForm.subjects}
                  onChange={(e) => setEditForm({ ...editForm, subjects: e.target.value })}
                  placeholder="e.g. MATHEMATICS|PHYSICS or MATHEMATICS, PHYSICS"
                  className="w-full h-9 px-3 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Locality</label>
                  <input
                    type="text"
                    value={editForm.locality}
                    onChange={(e) => setEditForm({ ...editForm, locality: e.target.value })}
                    placeholder="e.g. Indiranagar, Koramangala"
                    className="w-full h-9 px-3 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Monthly Budget (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editForm.budget}
                    onChange={(e) => setEditForm({ ...editForm, budget: Number(e.target.value) || 0 })}
                    className="w-full h-9 px-3 rounded border border-gray-300 font-mono text-gray-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Academic Requirements / Notes</label>
                <textarea
                  rows={3}
                  value={editForm.academic_requirements}
                  onChange={(e) => setEditForm({ ...editForm, academic_requirements: e.target.value })}
                  placeholder="Specific learning goals, weak topics, or test prep needs..."
                  className="w-full p-2.5 rounded border border-gray-300 text-gray-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSavingEdit}
                  onClick={() => setEditingStudent(null)}
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

      {/* Delete Confirmation Modal */}
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
                <h3 className="text-base font-bold text-gray-900">Delete Student Record</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
              Are you sure you want to permanently delete the student requirement for{" "}
              <strong className="text-gray-900">{deleteCandidate.student_name}</strong> (ID:{" "}
              <span className="font-mono font-medium">{deleteCandidate.student_id}</span>)?
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
                onClick={() => handleDeleteStudent(deleteCandidate.student_id)}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Internal In-Panel Student Registration Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newStudent) => {
          setStudents((prev) => [newStudent, ...prev]);
        }}
      />
    </div>
  );
}
