"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { translations, Language } from "@/lib/i18n";
import { ArrowLeft, CheckCircle2, AlertCircle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TutorRegistrationPage() {
  const [lang, setLang] = useState<Language>("en");
  const t = translations[lang];

  const [step, setStep] = useState(1);
  const [submissionKey, setSubmissionKey] = useState("");

  // Personal Info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY">("MALE");
  const [currentCity, setCurrentCity] = useState("Patna");
  const [currentLocality, setCurrentLocality] = useState("");

  // Qualifications
  const [highestQual, setHighestQual] = useState("BACHELORS");
  const [specialization, setSpecialization] = useState("");
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");

  // Teaching
  const [subjects, setSubjects] = useState<string[]>(["MATHEMATICS"]);
  const [classes, setClasses] = useState<string[]>(["CLASS_9", "CLASS_10"]);
  const [teachingMode, setTeachingMode] = useState<"HOME" | "ONLINE" | "BOTH">("HOME");
  const [localities, setLocalities] = useState<string[]>(["Kankarbagh", "Boring Road"]);
  const [localityInput, setLocalityInput] = useState("");
  const [experienceYears, setExperienceYears] = useState("3");
  const [expectedFee, setExpectedFee] = useState("5000");
  const [introduction, setIntroduction] = useState("");

  // Documents & Consent (Section 8.3 & 10.2)
  const [idType, setIdType] = useState("AADHAAR");
  const [idNumber, setIdNumber] = useState("");
  const [photoFileId, setPhotoFileId] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [idProofFileId, setIdProofFileId] = useState("");
  const [idProofFrontName, setIdProofFrontName] = useState("");
  const [idProofBackFileId, setIdProofBackFileId] = useState("");
  const [idProofBackName, setIdProofBackName] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    tutorId?: string;
    isExisting?: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    setSubmissionKey(`TUT-SUB-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
  }, []);

  const handleAddLocality = () => {
    if (localityInput.trim() && !localities.includes(localityInput.trim())) {
      setLocalities([...localities, localityInput.trim()]);
      setLocalityInput("");
    }
  };

  const handleRemoveLocality = (loc: string) => {
    setLocalities(localities.filter((l) => l !== loc));
  };

  const handleSubjectToggle = (subj: string) => {
    if (subjects.includes(subj)) {
      if (subjects.length > 1) setSubjects(subjects.filter((s) => s !== subj));
    } else {
      setSubjects([...subjects, subj]);
    }
  };

  const handleClassToggle = (cls: string) => {
    if (classes.includes(cls)) {
      if (classes.length > 1) setClasses(classes.filter((c) => c !== cls));
    } else {
      setClasses([...classes, cls]);
    }
  };

  // Real file uploads from laptop / phone
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
        setPhotoFileId(`cld_photo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdProofFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdProofFrontName(file.name);
      setIdProofFileId(`cld_aadhaar_front_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`);
    }
  };

  const handleIdProofBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdProofBackName(file.name);
      setIdProofBackFileId(`cld_aadhaar_back_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!consent) {
      setErrorMsg("You must accept the terms and consent for verification.");
      return;
    }

    if (phone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (whatsapp && whatsapp.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit WhatsApp number.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (idType === "AADHAAR" && idNumber.length !== 12) {
      setErrorMsg("Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    if (!photoFileId) {
      setErrorMsg("Profile photo is required for tutor identity verification.");
      return;
    }

    if (!idNumber || !idProofFileId) {
      setErrorMsg("Aadhaar / ID number and front copy are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: fullName,
        phone,
        whatsapp: whatsapp || phone,
        email,
        gender,
        current_city: currentCity,
        current_locality: currentLocality,
        highest_qualification: highestQual,
        specialization,
        university,
        course,
        subjects,
        classes,
        teaching_mode: teachingMode,
        localities,
        experience_years: Number(experienceYears) || 0,
        expected_fee: Number(expectedFee) || 0,
        introduction,
        photo_file_id: photoFileId,
        id_type: idType,
        id_number: idNumber,
        id_proof_file_id: idProofFileId,
        id_proof_back_file_id: idProofBackFileId,
        consent,
        honeypot,
        submission_key: submissionKey,
      };

      const res = await fetch("/api/public/tutor-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to submit application.");
      }

      setSuccessResult({
        tutorId: data.tutorId,
        isExisting: data.isExisting,
        message: data.message,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
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
            {successResult.isExisting ? "Already Registered" : t.successTutorTitle}
          </h2>
          <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
            {successResult.message || t.successTutorMessage}
          </p>
          {successResult.tutorId && (
            <div className="p-3.5 bg-gray-100 rounded-xl text-sm font-mono text-gray-800 font-semibold mb-6">
              Application ID: {successResult.tutorId}
            </div>
          )}
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
          <div className="mb-6 pb-4 border-b border-gray-100">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {t.tutorFormTitle}
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-gray-600 font-medium">
              {t.tutorFormSubtitle}
            </p>

            {/* Step Progress Indicator (Section 10.2) */}
            <div className="flex items-center justify-between mt-6">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex-1 flex items-center">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-xs transition-colors ${
                      step >= s
                        ? "bg-blue-600 text-white ring-2 ring-blue-600/20"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`flex-1 h-1.5 mx-1.5 sm:mx-2 rounded-full transition-colors ${
                        step > s ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm font-bold text-gray-800 mt-2.5">
              {step === 1 && "Step 1 of 4: Personal Details"}
              {step === 2 && "Step 2 of 4: Educational Qualifications"}
              {step === 3 && "Step 3 of 4: Subjects & Teaching Preferences"}
              {step === 4 && "Step 4 of 4: ID Verification & Consent"}
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-sm sm:text-base font-medium flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
            />

            {/* STEP 1: Personal */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.fullName} *
                  </label>
                  <Input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alok Verma"
                    className="min-h-[48px] text-base"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="9876543210"
                        className="min-h-[48px] pl-14 text-base font-semibold tracking-wide"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      {t.whatsappNumber}{" "}
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
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="Leave blank if same as mobile"
                        className="min-h-[48px] pl-14 text-base font-semibold tracking-wide"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      {t.gender} *
                    </label>
                    <select
                      className={selectClassName}
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="NON_BINARY">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      {t.email}{" "}
                      <span className="font-normal text-xs text-gray-500">(Optional)</span>
                    </label>
                    <Input
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tutor@example.com"
                      className="min-h-[48px] text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      {t.currentCity} *
                    </label>
                    <Input
                      required
                      value={currentCity}
                      onChange={(e) => setCurrentCity(e.target.value)}
                      className="min-h-[48px] text-base font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      {t.currentLocality}
                    </label>
                    <Input
                      value={currentLocality}
                      onChange={(e) => setCurrentLocality(e.target.value)}
                      placeholder="e.g. Boring Road"
                      className="min-h-[48px] text-base"
                    />
                  </div>
                </div>

                <div className="pt-5 flex justify-end">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full sm:w-auto min-h-[48px] h-12 px-6 text-base font-semibold"
                    onClick={() => {
                      if (!fullName.trim()) {
                        setErrorMsg("Please enter your full name.");
                        return;
                      }
                      if (phone.length !== 10) {
                        setErrorMsg("Please enter a valid 10-digit mobile number.");
                        return;
                      }
                      if (whatsapp && whatsapp.length !== 10) {
                        setErrorMsg("Please enter a valid 10-digit WhatsApp number.");
                        return;
                      }
                      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        setErrorMsg("Please enter a valid email address.");
                        return;
                      }
                      setErrorMsg(null);
                      setStep(2);
                    }}
                  >
                    Next: Qualifications →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Qualifications */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    {t.highestQual} *
                  </label>
                  <select
                    className={selectClassName}
                    value={highestQual}
                    onChange={(e) => setHighestQual(e.target.value)}
                  >
                    <option value="BACHELORS">Bachelor&apos;s Degree (B.Sc / B.Tech / B.A / B.Com)</option>
                    <option value="MASTERS">Master&apos;s Degree (M.Sc / M.Tech / M.A / M.Com)</option>
                    <option value="BED">B.Ed (Bachelor of Education)</option>
                    <option value="PHD">Ph.D.</option>
                    <option value="12TH_PASS">12th Pass</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      Specialization / Major
                    </label>
                    <Input
                      placeholder="e.g. Physics / Mathematics"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="min-h-[48px] text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      College / University
                    </label>
                    <Input
                      placeholder="e.g. Patna University"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className="min-h-[48px] text-base"
                    />
                  </div>
                </div>

                <div className="pt-5 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto min-h-[48px] h-12 px-6 text-base font-semibold"
                    onClick={() => setStep(1)}
                  >
                    ← Back
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="w-full sm:w-auto min-h-[48px] h-12 px-6 text-base font-semibold"
                    onClick={() => setStep(3)}
                  >
                    Next: Teaching Preferences →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Teaching Preferences */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                    Primary Subjects Taught *{" "}
                    <span className="font-normal text-xs text-gray-500">(Tap to select)</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      "MATHEMATICS", "PHYSICS", "CHEMISTRY", "BIOLOGY",
                      "ENGLISH", "HINDI", "SCIENCE", "SOCIAL_SCIENCE", "COMPUTER", "ACCOUNTANCY"
                    ].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => handleSubjectToggle(s)}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm sm:text-base font-semibold border transition-all shadow-xs active:scale-95 ${
                          subjects.includes(s)
                            ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20"
                            : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                    Classes Taught *{" "}
                    <span className="font-normal text-xs text-gray-500">(Tap to select)</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      "CLASS_1", "CLASS_2", "CLASS_3", "CLASS_4", "CLASS_5",
                      "CLASS_6", "CLASS_7", "CLASS_8", "CLASS_9", "CLASS_10",
                      "CLASS_11", "CLASS_12"
                    ].map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => handleClassToggle(c)}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm sm:text-base font-semibold border transition-all shadow-xs active:scale-95 ${
                          classes.includes(c)
                            ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20"
                            : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {c.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      {t.teachingMode} *
                    </label>
                    <select
                      className={selectClassName}
                      value={teachingMode}
                      onChange={(e) => setTeachingMode(e.target.value as any)}
                    >
                      <option value="HOME">Home Tuition</option>
                      <option value="ONLINE">Online</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      {t.teachingExperience} *{" "}
                      <span className="font-normal text-xs text-gray-500">(Years)</span>
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="40"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="min-h-[48px] text-base font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      {t.expectedFee} *{" "}
                      <span className="font-normal text-xs text-gray-500">(₹ / Month)</span>
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      step="500"
                      value={expectedFee}
                      onChange={(e) => setExpectedFee(e.target.value)}
                      className="min-h-[48px] text-base font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                    Preferred Localities (Areas you can travel to) *
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add locality, e.g. Kankarbagh"
                      value={localityInput}
                      onChange={(e) => setLocalityInput(e.target.value)}
                      className="min-h-[48px] text-base"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddLocality();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="min-h-[48px] h-12 px-5 text-base font-semibold shrink-0"
                      onClick={handleAddLocality}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {localities.map((loc) => (
                      <span
                        key={loc}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-900"
                      >
                        {loc}
                        <button
                          type="button"
                          onClick={() => handleRemoveLocality(loc)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600 hover:text-rose-600 font-bold"
                          title="Remove locality"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-5 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto min-h-[48px] h-12 px-6 text-base font-semibold"
                    onClick={() => setStep(2)}
                  >
                    ← Back
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="w-full sm:w-auto min-h-[48px] h-12 px-6 text-base font-semibold"
                    onClick={() => setStep(4)}
                  >
                    Next: Verification & Documents →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: Verification Documents & Consent (Section 8.3 & 10.2) */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-950 leading-relaxed font-medium">
                  <strong>Mandatory Verification Policy:</strong> To protect student safety and uphold bureau trust, all tutors must provide an Aadhaar/Government ID number, an ID copy, and a profile photo. These are stored privately and verified solely by the bureau admin.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      Government ID Type *
                    </label>
                    <select
                      className={selectClassName}
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                    >
                      <option value="AADHAAR">Aadhaar Card (12 Digits)</option>
                      <option value="PAN">PAN Card</option>
                      <option value="VOTER_ID">Voter ID</option>
                      <option value="PASSPORT">Passport</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1.5">
                      {idType === "AADHAAR" ? "Aadhaar Number (Exact 12 Digits) *" : "ID Number *"}
                    </label>
                    <Input
                      required
                      inputMode={idType === "AADHAAR" ? "numeric" : "text"}
                      maxLength={idType === "AADHAAR" ? 12 : 20}
                      placeholder={idType === "AADHAAR" ? "12-digit number e.g. 543212345678" : "ID Document Number"}
                      value={idNumber}
                      onChange={(e) => {
                        if (idType === "AADHAAR") {
                          setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 12));
                        } else {
                          setIdNumber(e.target.value);
                        }
                      }}
                      className="min-h-[48px] text-base font-mono font-medium"
                    />
                  </div>
                </div>

                {/* 3 Real Upload Pickers: Profile Photo, Aadhaar Front, Aadhaar Back */}
                <div className="space-y-4">
                  {/* 1. Profile Photo */}
                  <div className="p-4 sm:p-5 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/70 flex flex-col sm:flex-row items-center gap-4">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile preview"
                        className="w-18 h-18 rounded-full object-cover border-2 border-emerald-500 shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-base font-bold text-gray-900">1. Tutor Profile Photo *</p>
                      <p className="text-xs sm:text-sm text-gray-600 mb-3">
                        Clear face headshot or passport-size photo from your phone/laptop
                      </p>
                      {photoFileId ? (
                        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                          <span className="text-xs sm:text-sm text-emerald-800 font-semibold bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg">
                            ✓ Photo Selected: {photoFileId.split("_").slice(3).join("_") || "Ready"}
                          </span>
                          <label
                            htmlFor="photo-upload-input"
                            className="min-h-[40px] inline-flex items-center text-sm font-semibold text-blue-700 hover:underline cursor-pointer px-2 py-1"
                          >
                            Change Photo
                          </label>
                        </div>
                      ) : (
                        <label
                          htmlFor="photo-upload-input"
                          className="min-h-[48px] h-12 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm"
                        >
                          <UploadCloud className="w-5 h-5" /> Choose Photo from Device
                        </label>
                      )}
                      <input
                        id="photo-upload-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </div>
                  </div>

                  {/* 2 & 3. Aadhaar Front & Back */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Aadhaar Front */}
                    <div className="p-4 sm:p-5 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/70 text-center flex flex-col items-center justify-between">
                      <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm sm:text-base font-bold text-gray-900">
                        2. Aadhaar / ID Card (Front) *
                      </p>
                      <p className="text-xs text-gray-600 mb-3">
                        Clear photo showing name, photo & ID number
                      </p>
                      {idProofFileId ? (
                        <div className="space-y-1.5 w-full">
                          <span className="text-xs sm:text-sm text-emerald-800 font-semibold bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 rounded-lg block truncate">
                            ✓ {idProofFrontName || "Front attached"}
                          </span>
                          <label
                            htmlFor="aadhaar-front-input"
                            className="min-h-[36px] inline-flex items-center justify-center text-xs sm:text-sm text-blue-700 hover:underline font-semibold cursor-pointer"
                          >
                            Change Front File
                          </label>
                        </div>
                      ) : (
                        <label
                          htmlFor="aadhaar-front-input"
                          className="min-h-[48px] h-12 px-5 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-xl text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition-all shadow-xs w-full sm:w-auto"
                        >
                          Upload Front Side
                        </label>
                      )}
                      <input
                        id="aadhaar-front-input"
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleIdProofFrontUpload}
                      />
                    </div>

                    {/* Aadhaar Back */}
                    <div className="p-4 sm:p-5 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/70 text-center flex flex-col items-center justify-between">
                      <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm sm:text-base font-bold text-gray-900">
                        3. Aadhaar / ID Card (Back) *
                      </p>
                      <p className="text-xs text-gray-600 mb-3">
                        Clear photo showing address & barcode
                      </p>
                      {idProofBackFileId ? (
                        <div className="space-y-1.5 w-full">
                          <span className="text-xs sm:text-sm text-emerald-800 font-semibold bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 rounded-lg block truncate">
                            ✓ {idProofBackName || "Back attached"}
                          </span>
                          <label
                            htmlFor="aadhaar-back-input"
                            className="min-h-[36px] inline-flex items-center justify-center text-xs sm:text-sm text-blue-700 hover:underline font-semibold cursor-pointer"
                          >
                            Change Back File
                          </label>
                        </div>
                      ) : (
                        <label
                          htmlFor="aadhaar-back-input"
                          className="min-h-[48px] h-12 px-5 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-xl text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition-all shadow-xs w-full sm:w-auto"
                        >
                          Upload Back Side
                        </label>
                      )}
                      <input
                        id="aadhaar-back-input"
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleIdProofBackUpload}
                      />
                    </div>
                  </div>
                </div>

                {/* Consent */}
                <div className="pt-3">
                  <label
                    htmlFor="tutorConsent"
                    className="flex items-start gap-3 p-3 -mx-2 rounded-xl hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      id="tutorConsent"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1 shrink-0 cursor-pointer"
                    />
                    <span className="text-sm sm:text-base text-gray-700 leading-relaxed font-medium">
                      {t.tutorConsentText}{" "}
                      <Link href="/privacy" className="text-blue-600 underline font-semibold">
                        Read Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                <div className="pt-5 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto min-h-[48px] h-12 px-6 text-base font-semibold"
                    onClick={() => setStep(3)}
                  >
                    ← Back
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    isLoading={isSubmitting}
                    className="w-full sm:w-auto min-h-[52px] h-14 px-8 text-base sm:text-lg font-bold shadow-md active:opacity-90"
                  >
                    {t.applyNow}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
