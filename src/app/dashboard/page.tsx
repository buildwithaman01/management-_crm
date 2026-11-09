"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  ShieldCheck,
  FileCheck2,
  CalendarCheck,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Clock,
  RefreshCw,
  UserPlus,
  Phone,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AddStudentModal } from "@/components/dashboard/add-student-modal";

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("Just now");
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  const [data, setData] = useState<any>({
    metrics: {
      totalStudents: 0,
      totalTutors: 0,
      verifiedTutors: 0,
      pendingTutors: 0,
      newLeads: 0,
      activeAssignments: 0,
      scheduledDemos: 0,
    },
    recentStudents: [],
    recentTutors: [],
    recentAssignments: [],
  });

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/overview", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          const now = new Date();
          setLastUpdated(
            now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          );
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-poll every 15 seconds so new student & tutor leads reflect live
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const { metrics, recentStudents, recentTutors, recentAssignments } = data;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Dashboard Overview
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time bureau operations, lead intake, and tutor matchmaking • Last updated: {lastUpdated}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 bg-white"
            title="Refresh overview metrics and recent leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>{refreshing ? "Updating..." : "Refresh"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddStudentOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Student</span>
          </Button>

          <Link
            href="/dashboard/tutor-finder"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tutor Finder</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid (Section 13.1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Students"
          value={metrics.totalStudents}
          description="Parents requesting tutors"
          icon={GraduationCap}
        />
        <MetricCard
          label="New Leads"
          value={metrics.newLeads}
          description="Uncontacted requirements"
          icon={PhoneCall}
        />
        <MetricCard
          label="Verified Tutors"
          value={metrics.verifiedTutors}
          description="Aadhaar-verified & ready"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Active Assignments"
          value={metrics.activeAssignments}
          description="Ongoing tuition classes"
          icon={FileCheck2}
        />
      </div>

      {/* Secondary Status Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-card border border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Verification</p>
              <p className="text-xl font-bold font-mono text-gray-900">{metrics.pendingTutors}</p>
            </div>
          </div>
          <Link href="/dashboard/tutors" className="text-xs text-blue-600 hover:underline">
            Review →
          </Link>
        </div>

        <div className="bg-white p-4 rounded-card border border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Upcoming Demos</p>
              <p className="text-xl font-bold font-mono text-gray-900">{metrics.scheduledDemos}</p>
            </div>
          </div>
          <Link href="/dashboard/assignments" className="text-xs text-blue-600 hover:underline">
            View →
          </Link>
        </div>

        <div className="bg-white p-4 rounded-card border border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Tutor Pool</p>
              <p className="text-xl font-bold font-mono text-gray-900">{metrics.totalTutors}</p>
            </div>
          </div>
          <Link href="/dashboard/tutors" className="text-xs text-blue-600 hover:underline">
            All Tutors →
          </Link>
        </div>
      </div>

      {/* Two Column Layout: Recent Students & Recent Tutors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Students */}
        <div className="bg-white rounded-card border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">Recent Student Inquiries</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                {recentStudents.length}
              </span>
            </div>
            <Link href="/dashboard/students" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentStudents.length === 0 ? (
            <EmptyState
              title="No student inquiries yet"
              description="Student requirements submitted via the website form or added manually will appear here."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {recentStudents.map((s: any) => (
                <div key={s.student_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/75 p-2 rounded-lg transition-colors gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/students?search=${encodeURIComponent(s.student_id)}`}
                        className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                        title="Open student details"
                      >
                        {s.student_name}
                        <ExternalLink className="w-3 h-3 text-blue-400" />
                      </Link>
                      <span className="text-[10px] font-mono text-gray-400">({s.student_id})</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {s.class?.replace("_", " ")} • {s.locality || "Patna"} • {s.subjects?.split("|").join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                    {s.phone && (
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${s.phone}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-xs"
                          title={`Call Student/Parent (${s.phone})`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${s.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                            `Hello ${s.student_name}, this is regarding your home tuition requirement.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs"
                          title="WhatsApp Chat"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                    <div className="text-right flex flex-col items-end gap-0.5">
                      <StatusBadge status={s.lead_status || "NEW"} />
                      <span className="text-[10px] text-gray-400">{formatDate(s.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tutors */}
        <div className="bg-white rounded-card border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">Recent Tutor Applications</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                {recentTutors.length}
              </span>
            </div>
            <Link href="/dashboard/tutors" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentTutors.length === 0 ? (
            <EmptyState
              title="No tutor registrations yet"
              description="Tutors who register online with their qualifications and documents will appear here."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {recentTutors.map((t: any) => {
                const hasPhoto = t.photo_file_id && (t.photo_file_id.startsWith("data:image") || t.photo_file_id.startsWith("http") || t.photo_file_id.startsWith("/"));
                return (
                  <div key={t.tutor_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/75 p-2 rounded-lg transition-colors gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {hasPhoto ? (
                        <img
                          src={t.photo_file_id}
                          alt={t.full_name}
                          className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {t.full_name?.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/tutors?search=${encodeURIComponent(t.tutor_id)}`}
                            className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                            title="Open tutor profile"
                          >
                            {t.full_name}
                            <ExternalLink className="w-3 h-3 text-blue-400" />
                          </Link>
                          <span className="text-[10px] font-mono text-gray-400">({t.tutor_id})</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {t.highest_qualification} • {t.experience_years} yrs exp • ₹{t.expected_fee}/mo
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                      {t.phone && (
                        <div className="flex items-center gap-1">
                          <a
                            href={`tel:${t.phone}`}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-xs"
                            title={`Call Tutor (${t.phone})`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/${t.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `Hello ${t.full_name}, this is from Tuition Bureau regarding your tutor registration.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs"
                            title="WhatsApp Chat"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                      <div className="text-right flex flex-col items-end gap-0.5">
                        <StatusBadge status={t.verification_status || "PENDING"} />
                        <span className="text-[10px] text-gray-400">{formatDate(t.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Student Inquiry Modal */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onSuccess={() => {
          loadData(true);
        }}
      />
    </div>
  );
}
