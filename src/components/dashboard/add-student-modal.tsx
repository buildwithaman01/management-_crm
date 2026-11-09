"use client";

import React, { useState } from "react";
import { X, UserPlus, Phone, MapPin, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Student } from "@/types/entities";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: Student) => void;
}

const CLASS_OPTIONS = [
  { value: "CLASS_NURSERY", label: "Nursery / KG" },
  { value: "CLASS_1", label: "Class 1" },
  { value: "CLASS_2", label: "Class 2" },
  { value: "CLASS_3", label: "Class 3" },
  { value: "CLASS_4", label: "Class 4" },
  { value: "CLASS_5", label: "Class 5" },
  { value: "CLASS_6", label: "Class 6" },
  { value: "CLASS_7", label: "Class 7" },
  { value: "CLASS_8", label: "Class 8" },
  { value: "CLASS_9", label: "Class 9" },
  { value: "CLASS_10", label: "Class 10" },
  { value: "CLASS_11", label: "Class 11" },
  { value: "CLASS_12", label: "Class 12" },
  { value: "COMPETITIVE", label: "Competitive Exams / IIT / NEET" },
];

const BOARD_OPTIONS = [
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "BIHAR_BOARD", label: "Bihar State Board" },
  { value: "OTHER", label: "Other Board" },
];

export function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentName, setStudentName] = useState("");
  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [selectedClass, setSelectedClass] = useState("CLASS_10");
  const [board, setBoard] = useState("CBSE");
  const [subjects, setSubjects] = useState("MATHEMATICS|SCIENCE");
  const [tuitionType, setTuitionType] = useState<"HOME" | "ONLINE" | "BOTH">("HOME");
  const [locality, setLocality] = useState("");
  const [genderPref, setGenderPref] = useState<"ANY" | "MALE" | "FEMALE">("ANY");
  const [timing, setTiming] = useState("EVENING");
  const [budget, setBudget] = useState("4500");
  const [classesPerWeek, setClassesPerWeek] = useState("3");
  const [leadSource, setLeadSource] = useState("PHONE_CALL");
  const [academicNeeds, setAcademicNeeds] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!studentName.trim() || !parentName.trim() || !phone.trim()) {
      setError("Please fill in Student Name, Parent Name, and Mobile Phone.");
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        student_name: studentName.trim(),
        parent_name: parentName.trim(),
        phone: cleanPhone,
        whatsapp: sameAsPhone ? cleanPhone : (whatsapp.replace(/[^0-9]/g, "") || cleanPhone),
        class: selectedClass,
        board,
        subjects,
        tuition_type: tuitionType,
        locality: locality.trim(),
        tutor_gender_preference: genderPref,
        preferred_timing: timing,
        budget: Number(budget) || 0,
        classes_per_week: Number(classesPerWeek) || 3,
        academic_requirements: academicNeeds.trim(),
        admin_notes: adminNotes.trim(),
        lead_source: leadSource,
      };

      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create student inquiry.");
      }

      onSuccess(data.student);
      onClose();
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[92vh] flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50/70 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Add New Student Requirement
              </h2>
              <p className="text-xs text-gray-500">
                Log a student lead directly into the CRM from calls, walk-ins, or WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Student & Parent Core */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Parent / Guardian Name *
              </label>
              <input
                type="text"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Contact Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Parent Mobile Phone *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">
                  WhatsApp Number
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsPhone}
                    onChange={(e) => setSameAsPhone(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Same as phone</span>
                </label>
              </div>
              <input
                type="tel"
                disabled={sameAsPhone}
                value={sameAsPhone ? phone : whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp number"
                className={`w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${
                  sameAsPhone ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                }`}
              />
            </div>
          </div>

          {/* Academic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Class / Standard *
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                {CLASS_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Board *
              </label>
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                {BOARD_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tuition Mode *
              </label>
              <select
                value={tuitionType}
                onChange={(e) => setTuitionType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                <option value="HOME">Home Tuition</option>
                <option value="ONLINE">Online 1-on-1</option>
                <option value="BOTH">Both / Either</option>
              </select>
            </div>
          </div>

          {/* Subjects & Locality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Subjects Needed *
              </label>
              <input
                type="text"
                required
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder="e.g. Mathematics, Science, English"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Separate with commas or vertical bar |</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Locality / Area in City *
              </label>
              <input
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Kankarbagh, Boring Road, Bailey Road"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Budget, Classes, Tutor Gender & Timing */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Budget (₹ / mo)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="4500"
                className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Days / Week
              </label>
              <select
                value={classesPerWeek}
                onChange={(e) => setClassesPerWeek(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                <option value="2">2 Days/week</option>
                <option value="3">3 Days/week (Standard)</option>
                <option value="4">4 Days/week</option>
                <option value="5">5 Days/week</option>
                <option value="6">6 Days/week</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tutor Gender
              </label>
              <select
                value={genderPref}
                onChange={(e) => setGenderPref(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                <option value="ANY">Any / No Pref</option>
                <option value="FEMALE">Female Only</option>
                <option value="MALE">Male Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Preferred Timing
              </label>
              <select
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                <option value="EVENING">Evening (4 PM - 8 PM)</option>
                <option value="MORNING">Morning (7 AM - 10 AM)</option>
                <option value="AFTERNOON">Afternoon</option>
                <option value="FLEXIBLE">Flexible</option>
              </select>
            </div>
          </div>

          {/* Lead Source & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lead Intake Channel
              </label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                <option value="PHONE_CALL">Direct Phone Call</option>
                <option value="WHATSAPP_CHAT">WhatsApp Inquiry</option>
                <option value="WALK_IN">Walk-in at Office</option>
                <option value="REFERRAL">Referral / Word of Mouth</option>
                <option value="ADMIN_PANEL">Admin Manual Entry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal Admin Notes
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Urgent requirement, parent called at 11 AM"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Academic Requirements */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Specific Student Academic Needs / Weak Areas
            </label>
            <textarea
              rows={2}
              value={academicNeeds}
              onChange={(e) => setAcademicNeeds(e.target.value)}
              placeholder="e.g. Student is weak in Mathematics algebra and needs regular tests and homework tracking."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
            >
              {loading ? "Saving Inquiry..." : "Save Student Requirement"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
