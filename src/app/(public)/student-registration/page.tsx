"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { translations, Language } from "@/lib/i18n";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StudentRegistrationPage() {
  const [lang, setLang] = useState<Language>("en");
  const t = translations[lang];

  const [parentName, setParentName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [phone, setPhone] = useState("");
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  const [studentClass, setStudentClass] = useState("CLASS_10");
  const [board, setBoard] = useState("CBSE");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    "MATHEMATICS",
    "SCIENCE",
  ]);
  const [tuitionType, setTuitionType] = useState<"HOME" | "ONLINE" | "BOTH">("HOME");
  const [locality, setLocality] = useState("");
  const [genderPref, setGenderPref] = useState<"MALE" | "FEMALE" | "ANY">("ANY");
  const [timing, setTiming] = useState<"MORNING" | "AFTERNOON" | "EVENING" | "FLEXIBLE">("EVENING");
  const [budget, setBudget] = useState("4000");
  const [classesPerWeek, setClassesPerWeek] = useState("3");
  const [academicReqs, setAcademicReqs] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submissionKey, setSubmissionKey] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    studentId: string;
    isDuplicate?: boolean;
  } | null>(null);

  useEffect(() => {
    // Generate idempotency key on page load (Section 9)
    setSubmissionKey(`SUB-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
  }, []);

  const handleSubjectToggle = (subj: string) => {
    if (selectedSubjects.includes(subj)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== subj));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!consent) {
      setErrorMsg("Please accept the terms and consent to submit.");
      return;
    }

    if (phone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!sameAsMobile && whatsapp && whatsapp.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit WhatsApp number.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (tuitionType !== "ONLINE" && !locality.trim()) {
      setErrorMsg("Please enter your locality for home tuition.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        parent_name: parentName,
        student_name: studentName,
        phone,
        whatsapp: sameAsMobile ? phone : whatsapp,
        email,
        class: studentClass,
        board,
        subjects: selectedSubjects,
        tuition_type: tuitionType,
        locality,
        tutor_gender_preference: genderPref,
        preferred_timing: timing,
        budget: Number(budget) || 0,
        classes_per_week: Number(classesPerWeek) || 3,
        academic_requirements: academicReqs,
        consent,
        honeypot,
        submission_key: submissionKey,
      };

      const res = await fetch("/api/public/student-requirement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to submit request.");
      }

      setSuccessResult({
        studentId: data.studentId,
        isDuplicate: data.isDuplicate,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectClassName =
    "flex min-h-[48px] h-12 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50";

  if (successResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {t.successStudentTitle}
          </h2>
          <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
            {t.successStudentMessage}
          </p>
          <div className="p-3.5 bg-gray-100 rounded-xl text-sm font-mono text-gray-800 font-semibold mb-6">
            Reference ID: {successResult.studentId}
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full min-h-[48px] h-12 px-6 py-3 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 transition-colors shadow-sm active:scale-[0.98]"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-10 px-3.5 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm sm:text-base font-semibold text-gray-800 hover:text-black hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Home
          </Link>

          {/* Hindi / English toggle (Section 10.6) */}
          <div className="inline-flex rounded-xl shadow-xs border border-gray-300 bg-white p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg transition-colors ${
                lang === "en"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-700 hover:text-black hover:bg-gray-50"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang("hi")}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg transition-colors ${
                lang === "hi"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-700 hover:text-black hover:bg-gray-50"
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
          <div className="mb-6 pb-5 border-b border-gray-100">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {t.studentFormTitle}
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-gray-600 font-medium">
              {t.studentFormSubtitle}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-sm sm:text-base font-medium flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Honeypot field (hidden from real users, Section 10.4) */}
            <input
              type="text"
              name="b_extra_hp"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Section 1: Contact Details */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  1
                </span>
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-gray-900">
                  Student & Contact Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.parentName} *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="min-h-[48px] text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.studentName} *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Aryan Kumar"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="min-h-[48px] text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.mobileNumber} *{" "}
                    <span className="font-normal text-xs text-gray-500">(10 Digits)</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-base text-gray-700 font-bold select-none pointer-events-none">
                      +91
                    </span>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      className="min-h-[48px] pl-14 text-base font-semibold tracking-wide"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.email}{" "}
                    <span className="font-normal text-xs text-gray-500">(Optional)</span>
                  </label>
                  <Input
                    type="email"
                    inputMode="email"
                    placeholder="parent@example.com"
                    className="min-h-[48px] text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <label
                htmlFor="sameAsMobile"
                className="mt-3 flex items-center gap-3 p-3 -mx-2 rounded-xl hover:bg-gray-50 active:bg-gray-100 cursor-pointer border border-transparent select-none transition-colors"
              >
                <input
                  type="checkbox"
                  id="sameAsMobile"
                  checked={sameAsMobile}
                  onChange={(e) => setSameAsMobile(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                />
                <span className="text-sm sm:text-base font-medium text-gray-900">
                  {t.sameAsMobile}
                </span>
              </label>

              {!sameAsMobile && (
                <div className="mt-3 max-w-sm">
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.whatsappNumber} *{" "}
                    <span className="font-normal text-xs text-gray-500">(10 Digits)</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-base text-gray-700 font-bold select-none pointer-events-none">
                      +91
                    </span>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder="9876543210"
                      className="min-h-[48px] pl-14 text-base font-semibold tracking-wide"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Academic Requirements */}
            <div className="pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  2
                </span>
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-gray-900">
                  Tuition Requirements
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.classGrade} *
                  </label>
                  <select
                    className={selectClassName}
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                  >
                    {[
                      "CLASS_1", "CLASS_2", "CLASS_3", "CLASS_4", "CLASS_5",
                      "CLASS_6", "CLASS_7", "CLASS_8", "CLASS_9", "CLASS_10",
                      "CLASS_11", "CLASS_12", "GRADUATION", "COMPETITIVE_EXAMS"
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.board} *
                  </label>
                  <select
                    className={selectClassName}
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="STATE_BOARD">State Board</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Subjects multiselect chips */}
              <div className="mt-4">
                <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                  {t.subjects} *{" "}
                  <span className="font-normal text-xs text-gray-500">(Tap to select)</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    "MATHEMATICS", "PHYSICS", "CHEMISTRY", "BIOLOGY",
                    "ENGLISH", "HINDI", "SCIENCE", "SOCIAL_SCIENCE", "COMPUTER", "ACCOUNTANCY"
                  ].map((s) => {
                    const active = selectedSubjects.includes(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => handleSubjectToggle(s)}
                        className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm sm:text-base font-semibold border transition-all shadow-xs active:scale-95 ${
                          active
                            ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20"
                            : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                        }`}
                      >
                        {s.replace("_", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.tuitionType} *
                  </label>
                  <select
                    className={selectClassName}
                    value={tuitionType}
                    onChange={(e) => setTuitionType(e.target.value as any)}
                  >
                    <option value="HOME">Home Tuition (At Student&apos;s Home)</option>
                    <option value="ONLINE">Online 1-on-1 Classes</option>
                    <option value="BOTH">Either Home or Online</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.preferredLocality} {tuitionType !== "ONLINE" ? "*" : ""}
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Kankarbagh / Boring Road"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="min-h-[48px] text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.monthlyBudget} *{" "}
                    <span className="font-normal text-xs text-gray-500">(₹ per month)</span>
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="500"
                    step="500"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="min-h-[48px] text-base font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.preferredTiming} *
                  </label>
                  <select
                    className={selectClassName}
                    value={timing}
                    onChange={(e) => setTiming(e.target.value as any)}
                  >
                    <option value="EVENING">Evening (4 PM - 8 PM)</option>
                    <option value="MORNING">Morning (6 AM - 10 AM)</option>
                    <option value="AFTERNOON">Afternoon (11 AM - 3 PM)</option>
                    <option value="FLEXIBLE">Flexible Timings</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.genderPref} *
                  </label>
                  <select
                    className={selectClassName}
                    value={genderPref}
                    onChange={(e) => setGenderPref(e.target.value as any)}
                  >
                    <option value="ANY">No Preference (Any)</option>
                    <option value="FEMALE">Female Tutor Preferred</option>
                    <option value="MALE">Male Tutor Preferred</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.classesPerWeek}
                  </label>
                  <select
                    className={selectClassName}
                    value={classesPerWeek}
                    onChange={(e) => setClassesPerWeek(e.target.value)}
                  >
                    <option value="2">2 Days / Week</option>
                    <option value="3">3 Days / Week (Standard)</option>
                    <option value="4">4 Days / Week</option>
                    <option value="5">5 Days / Week</option>
                    <option value="6">6 Days / Week</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                  {t.academicReqs}{" "}
                  <span className="font-normal text-xs text-gray-500">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full min-h-[96px] rounded-lg border border-gray-300 bg-white p-3.5 text-base text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                  placeholder="e.g. Needs extra focus on trigonometry and physics numericals"
                  value={academicReqs}
                  onChange={(e) => setAcademicReqs(e.target.value)}
                />
              </div>
            </div>

            {/* Consent and Submit (Section 10.1 #18) */}
            <div className="pt-5 border-t border-gray-100">
              <label
                htmlFor="consent"
                className="flex items-start gap-3 p-3 -mx-2 rounded-xl hover:bg-gray-50 active:bg-gray-100 cursor-pointer mb-6 transition-colors"
              >
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1 shrink-0 cursor-pointer"
                />
                <span className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  {t.consentText}{" "}
                  <Link href="/privacy" className="text-blue-600 underline font-medium">
                    Read Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              <Button
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                className="w-full min-h-[52px] h-14 text-base sm:text-lg font-bold py-3 shadow-md active:opacity-90"
              >
                {t.submitRequirement}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
