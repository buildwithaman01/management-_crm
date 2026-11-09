import Link from "next/link";
import { getClientConfig } from "@/config/client-config";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Users, GraduationCap, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

export default function HomePage() {
  const config = getClientConfig();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50/50">
      {/* Top Navigation */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 text-base"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              {config.shortName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 text-sm sm:text-base leading-tight truncate">
                {config.businessName}
              </h1>
              <p className="text-xs text-gray-600 font-medium">{config.contact.city}, India</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/student-registration"
              className="min-h-[40px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-white shadow-xs transition-all hover:opacity-95 active:scale-95 inline-flex items-center justify-center"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Request Tutor
            </Link>
            <Link
              href="/tutor-registration"
              className="min-h-[40px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 active:scale-95 transition-all inline-flex items-center justify-center"
            >
              Join as Tutor
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-3.5 sm:px-6 py-8 sm:py-14 w-full">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4 sm:mb-5">
            <StatusBadge
              status="ACTIVE"
              label="Verified Home & Online Tutors"
              tone="green"
              className="px-3 py-1 text-xs sm:text-sm font-semibold shadow-xs"
            />
            <StatusBadge
              status="VERIFIED"
              label="Aadhaar Checked"
              tone="blue"
              className="px-3 py-1 text-xs sm:text-sm font-semibold shadow-xs"
            />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-gray-950 tracking-tight leading-[1.18] mb-4 sm:mb-5">
            Find the Best Verified Tutors in{" "}
            <span style={{ color: "var(--brand-primary)" }}>{config.contact.city}</span>
          </h2>
          <p className="text-base sm:text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto font-normal">
            Personalized home tuition and online classes for all boards (CBSE, ICSE, State Boards).
            Connect directly with verified, background-checked subject experts.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 sm:gap-4 max-w-md sm:max-w-none mx-auto">
            <Link
              href="/student-registration"
              className="w-full sm:w-auto min-h-[52px] h-14 px-6 sm:px-8 text-base sm:text-lg font-bold rounded-xl text-white shadow-md hover:opacity-95 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2.5"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Request a Home Tutor <ArrowRight className="w-5 h-5 shrink-0" />
            </Link>
            <Link
              href="/tutor-registration"
              className="w-full sm:w-auto min-h-[52px] h-14 px-6 sm:px-8 text-base sm:text-lg font-bold rounded-xl border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2.5 shadow-xs"
            >
              Apply as a Tutor
            </Link>
          </div>
        </div>

        {/* Feature Highlights using MetricCard & UI components */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 my-8 sm:my-12">
          <MetricCard
            label="Verified Subject Experts"
            value="100%"
            description="Every tutor is personally verified with photo and Aadhaar verification."
            icon={ShieldCheck}
            className="p-5 sm:p-6 rounded-2xl"
          />
          <MetricCard
            label="Free Demo Class"
            value="1-on-1"
            description="Experience a trial class before finalizing any regular tuition schedule."
            icon={GraduationCap}
            className="p-5 sm:p-6 rounded-2xl"
          />
          <MetricCard
            label="Student Satisfaction"
            value="4.9 / 5"
            description="High parent satisfaction across all grades from Nursery to Class 12."
            icon={Users}
            className="p-5 sm:p-6 rounded-2xl"
          />
        </div>

        {/* Bureau Trust Markers */}
        <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-200 shadow-xs mt-6 sm:mt-10">
          <h3 className="text-lg sm:text-xl font-bold text-gray-950 mb-4 sm:mb-6">
            Why Parents and Tutors Trust {config.shortName}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base text-gray-700">
            <div className="flex items-start gap-3 p-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">Strict identity verification — government photo ID checked before dispatch.</span>
            </div>
            <div className="flex items-start gap-3 p-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">Transparent fee structure with direct monthly billing options.</span>
            </div>
            <div className="flex items-start gap-3 p-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">Smart matching tailored to locality, board syllabus, and timing.</span>
            </div>
            <div className="flex items-start gap-3 p-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">Zero spam policy: your contact numbers are never shared publicly.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer (100% public — no admin links) */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 gap-3 text-center sm:text-left">
          <p>© {new Date().getFullYear()} {config.businessName}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="min-h-[44px] inline-flex items-center hover:underline font-semibold text-gray-700 hover:text-black"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
