"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Compass,
  FileCheck2,
  CalendarCheck2,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  ExternalLink,
  PlusCircle,
  Search,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [bureauName, setBureauName] = useState("Tuition Bureau");

  React.useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((json) => {
        if (json?.settings?.branding?.bureauName) {
          setBureauName(json.settings.branding.bureauName);
        }
      })
      .catch(() => {});
  }, []);

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Students", href: "/dashboard/students", icon: GraduationCap },
    { name: "Tutors", href: "/dashboard/tutors", icon: Users },
    { name: "Tutor Finder", href: "/dashboard/tutor-finder", icon: Compass },
    { name: "Assignments", href: "/dashboard/assignments", icon: FileCheck2 },
    { name: "Follow-ups", href: "/dashboard/followups", icon: CalendarCheck2 },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore error and redirect
    }
    router.push("/login");
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      router.push(`/dashboard/students?q=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar (Section 13) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm uppercase shrink-0">
            {bureauName ? bureauName.slice(0, 2) : "TB"}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 leading-tight truncate">{bureauName}</h2>
            <p className="text-[10px] text-gray-400 font-medium">ADMIN PORTAL</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 rounded hover:bg-gray-50 transition-colors"
          >
            <span>Public Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Section 13) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-64 bg-white shadow-xl z-10">
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
              <span className="font-bold text-sm text-gray-900 truncate">{bureauName}</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar (Section 13) */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded text-gray-500 hover:text-gray-800 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Box (Section 13.1) */}
            <form onSubmit={handleGlobalSearch} className="relative hidden sm:block w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search students, tutors, phone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </form>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student-registration"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Student</span>
            </Link>
            <Link
              href="/tutor-registration"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Tutor</span>
            </Link>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
