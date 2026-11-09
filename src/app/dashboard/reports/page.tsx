"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  GraduationCap,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  BookOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { ReportsData } from "@/features/analytics/reports-engine";

export default function ReportsPage() {
  const [period, setPeriod] = useState<"all" | "this_month" | "last_30_days">("all");
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(
    async (selectedPeriod: "all" | "this_month" | "last_30_days", isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/reports?period=${selectedPeriod}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Admin session expired or unauthorized. Please re-login.");
          }
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.message || `Failed to fetch reports (${res.status})`);
        }

        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          throw new Error(json.message || "Invalid reports data received.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load reports.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchReports(period);
  }, [fetchReports, period]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/reports?period=${period}&format=csv`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to export report CSV.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tuition-bureau-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Could not export CSV. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Reports & Analytics
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Conversion funnel progression, subject shortage analysis, locality coverage, and bureau revenue
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm text-xs font-medium">
            <button
              type="button"
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                period === "all"
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setPeriod("this_month")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                period === "this_month"
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setPeriod("last_30_days")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                period === "last_30_days"
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Last 30 Days
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchReports(period, true)}
            disabled={refreshing || loading}
            title="Refresh analytics data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Export Report Summary Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || loading || !data}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? "Exporting..." : "Export Report Summary"}</span>
          </button>
        </div>
      </div>

      {/* 2. Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchReports(period)}
            className="text-xs font-semibold underline hover:no-underline text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Loading Skeletons */}
      {loading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-72 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      )}

      {/* 4. Loaded Analytics Content */}
      {data && (
        <div className="space-y-8">
          {/* A. Revenue & Financial Summary Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Financial & Operational Health
              </h2>
              <span className="text-xs text-gray-400">
                Commission based on {data.revenueSummary.commissionPercentage}% standard bureau rate
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Active Assignments Fee Sum"
                value={formatCurrency(data.revenueSummary.totalActiveAssignmentsFeeSum)}
                description={`${data.revenueSummary.activeAssignmentsCount} active teaching engagement(s)`}
                icon={IndianRupee}
              />
              <MetricCard
                label="Estimated Bureau Commission"
                value={formatCurrency(data.revenueSummary.estimatedCommission)}
                description={`${data.revenueSummary.commissionPercentage}% of monthly active fees`}
                icon={TrendingUp}
                trend={{
                  value: `${data.revenueSummary.commissionPercentage}%`,
                  positive: true,
                }}
              />
              <MetricCard
                label="Received Payments"
                value={formatCurrency(data.revenueSummary.receivedPayments)}
                description={`${data.revenueSummary.totalPaymentsCount} total payment transactions recorded`}
                icon={CheckCircle2}
              />
              <MetricCard
                label="Lead Conversion Rate"
                value={`${data.funnel.conversionRate}%`}
                description={`${data.funnel.converted} converted of ${data.funnel.totalLeads} student leads`}
                icon={Sparkles}
                trend={{
                  value: data.funnel.conversionRate > 20 ? "Healthy" : "Needs Attention",
                  positive: data.funnel.conversionRate > 20,
                }}
              />
            </div>
          </div>

          {/* B. Conversion Funnel Visual Progression */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 gap-2">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Conversion Funnel Progression
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Visual stage-by-stage progression from initial lead inquiry to active tuition start
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Conversion Rate: {data.funnel.conversionRate}%
                </span>
                <span className="text-gray-400">Total Leads: {data.funnel.totalLeads}</span>
              </div>
            </div>

            {data.funnel.totalLeads === 0 ? (
              <EmptyState
                icon={Layers}
                title="No Lead Data Recorded"
                description="Once parents submit tuition requirements, conversion funnel analytics will visualize here."
              />
            ) : (
              <div className="mt-6 space-y-6">
                {/* Horizontal Progression Pipeline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {data.funnel.stages
                    .filter((s) => s.stage !== "Lost")
                    .map((stage, idx) => {
                      const colors = [
                        { border: "border-blue-200", bg: "bg-blue-50/70", text: "text-blue-700", bar: "bg-blue-500" },
                        { border: "border-indigo-200", bg: "bg-indigo-50/70", text: "text-indigo-700", bar: "bg-indigo-500" },
                        { border: "border-purple-200", bg: "bg-purple-50/70", text: "text-purple-700", bar: "bg-purple-500" },
                        { border: "border-amber-200", bg: "bg-amber-50/70", text: "text-amber-700", bar: "bg-amber-500" },
                        { border: "border-emerald-200", bg: "bg-emerald-50/70", text: "text-emerald-700", bar: "bg-emerald-500" },
                      ][idx] || { border: "border-gray-200", bg: "bg-gray-50", text: "text-gray-700", bar: "bg-gray-500" };

                      return (
                        <div
                          key={stage.stage}
                          className={`p-4 rounded-xl border ${colors.border} ${colors.bg} relative flex flex-col justify-between`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-gray-500">Step {idx + 1}</span>
                              <span className={`font-bold ${colors.text}`}>{stage.percentage}%</span>
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">{stage.stage}</h3>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{stage.description}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-black/5">
                            <div className="flex items-baseline justify-between">
                              <span className="text-2xl font-black text-gray-900 font-mono">{stage.count}</span>
                              <span className="text-[11px] text-gray-400">leads</span>
                            </div>

                            {/* Mini Progress Bar */}
                            <div className="w-full bg-black/10 rounded-full h-1.5 mt-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                                style={{ width: `${Math.max(4, stage.percentage)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Additional lost leads banner if any */}
                {data.funnel.lost > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                    <span className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Lost / Cancelled Requirements: {data.funnel.lost} students ({data.funnel.stages.find((s) => s.stage === "Lost")?.percentage || 0}%)
                    </span>
                    <span className="text-rose-600">Consider re-engaging with updated tutor matches</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* C. Subject Demand vs Supply (Shortage Analysis) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 gap-2">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  Subject Shortage Analysis (Demand vs Supply)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Compares active student subject requirements against verified active tutor availability. Sorted by biggest shortage.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium border border-rose-200">
                  Deficit (Recruit Tutors)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                  Surplus (Ready Tutors)
                </span>
              </div>
            </div>

            {data.subjectDemandSupply.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No Subject Data Available"
                description="Subject demand and tutor supply will appear once students and tutors are registered."
              />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/75 text-gray-600 border-b border-gray-200 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Student Demand</th>
                      <th className="py-3 px-4">Tutor Supply</th>
                      <th className="py-3 px-4 min-w-[180px]">Demand vs Supply Ratio</th>
                      <th className="py-3 px-4 text-center">Net Gap</th>
                      <th className="py-3 px-4 text-center">Recruitment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.subjectDemandSupply.map((item) => {
                      const maxVal = Math.max(item.demand, item.supply, 1);
                      const demandBarWidth = Math.round((item.demand / maxVal) * 100);
                      const supplyBarWidth = Math.round((item.supply / maxVal) * 100);

                      return (
                        <tr key={item.subject} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            {item.subject}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-gray-700">
                            {item.demand} student{item.demand === 1 ? "" : "s"}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-gray-700">
                            {item.supply} tutor{item.supply === 1 ? "" : "s"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {/* Demand Bar (Blue) */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 w-12">Demand</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${demandBarWidth}%` }}
                                  />
                                </div>
                              </div>
                              {/* Supply Bar (Green) */}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 w-12">Supply</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${supplyBarWidth}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            {item.gap > 0 ? (
                              <span className="text-rose-600">+{item.gap}</span>
                            ) : item.gap < 0 ? (
                              <span className="text-emerald-600">{item.gap}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.status === "DEFICIT" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                Shortage (+{item.gap} needed)
                              </span>
                            )}
                            {item.status === "SURPLUS" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Surplus ({Math.abs(item.gap)} excess)
                              </span>
                            )}
                            {item.status === "BALANCED" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                                Balanced
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* D. Locality Distribution & Coverage Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Student Localities */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Top Student Localities (Demand Hubs)
                  </h3>
                  <span className="text-xs text-gray-400">
                    {data.localityDistribution.studentLocalities.length} active zones
                  </span>
                </div>

                {data.localityDistribution.studentLocalities.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No student locality data available.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.localityDistribution.studentLocalities.slice(0, 7).map((loc, idx) => (
                      <div key={loc.locality} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-800">
                            {idx + 1}. {loc.locality}
                          </span>
                          <span className="font-mono text-gray-500">
                            {loc.count} student{loc.count === 1 ? "" : "s"} ({loc.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(4, loc.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Tutor Localities */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    Top Tutor Localities (Supply Coverage)
                  </h3>
                  <span className="text-xs text-gray-400">
                    {data.localityDistribution.tutorLocalities.length} covered zones
                  </span>
                </div>

                {data.localityDistribution.tutorLocalities.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No verified tutor locality data available.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.localityDistribution.tutorLocalities.slice(0, 7).map((loc, idx) => (
                      <div key={loc.locality} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-800">
                            {idx + 1}. {loc.locality}
                          </span>
                          <span className="font-mono text-gray-500">
                            {loc.count} tutor{loc.count === 1 ? "" : "s"} ({loc.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(4, loc.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
