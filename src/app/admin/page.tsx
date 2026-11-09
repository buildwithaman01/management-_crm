import Link from "next/link";
import { getClientConfig } from "@/config/client-config";
import { ShieldCheck, Lock, ArrowRight, Database, Users, GraduationCap } from "lucide-react";

export const metadata = {
  title: "Admin Portal Gateway",
  description: "Secure administrative management for tuition bureau operations.",
};

export default function AdminGatewayPage() {
  const config = getClientConfig();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col justify-between p-3.5 sm:p-6">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-3 sm:py-4 gap-2">
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
            <p className="text-xs text-gray-600 font-medium">Administrative Operations</p>
          </div>
        </div>

        <Link
          href="/"
          className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg text-gray-700 hover:text-black hover:bg-white/80 transition-colors shrink-0"
        >
          ← Public Website
        </Link>
      </header>

      {/* Main Card */}
      <main className="max-w-md mx-auto w-full my-auto py-6">
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xl p-6 sm:p-8 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm text-white"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight leading-tight">
            Staff & Admin Portal
          </h2>
          <p className="text-sm sm:text-base text-gray-700 mt-2.5 mb-6 leading-relaxed font-normal">
            Authorized administrative access for managing student requirements, tutor KYC verifications, matching engine, and bureau billing.
          </p>

          <div className="space-y-3 mb-6 text-left">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs sm:text-sm text-gray-800 font-medium">
              <Users className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Direct Student & Tutor CRM Database</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs sm:text-sm text-gray-800 font-medium">
              <GraduationCap className="w-5 h-5 text-purple-600 shrink-0" />
              <span>100-Point Smart Matching & Demo Scheduling</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs sm:text-sm text-gray-800 font-medium">
              <Database className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Full Data Export & DPDP Privacy Compliance</span>
            </div>
          </div>

          <Link
            href="/login"
            className="w-full min-h-[52px] h-14 py-3.5 px-5 rounded-xl font-bold text-white shadow-md hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-base sm:text-lg"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <Lock className="w-5 h-5" /> Secure Admin Sign-In <ArrowRight className="w-5 h-5" />
          </Link>

          <p className="text-xs sm:text-sm text-gray-500 mt-4 font-medium leading-normal">
            Protected by HTTP-only session tokens and IP-scoped brute force prevention.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center py-4 text-xs sm:text-sm text-gray-500 font-medium">
        <p>© {new Date().getFullYear()} {config.businessName} • Internal Admin Gateway</p>
      </footer>
    </div>
  );
}
