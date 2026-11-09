"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Sliders,
  ToggleLeft,
  Database,
  Download,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Lock,
  FileSpreadsheet,
  ShieldAlert,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { MatchWeights, DEFAULT_MATCH_WEIGHTS } from "@/features/matching/matching-engine";
import { ActivityLog } from "@/types/entities";
import { SettingsData, TutorFieldConfig } from "@/lib/settings/settings-service";

type SettingsTab = "branding" | "weights" | "tutor-fields" | "backup";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("branding");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form states
  const [branding, setBranding] = useState({
    bureauName: "",
    city: "",
    phone: "",
    supportEmail: "",
    currency: "INR",
    currencySymbol: "₹",
    address: "",
    website: "",
  });

  const [weights, setWeights] = useState<MatchWeights & { minScore: number }>({
    ...DEFAULT_MATCH_WEIGHTS,
    minScore: 30,
  });

  const [tutorFields, setTutorFields] = useState<Record<string, TutorFieldConfig>>({});
  const [fieldSearch, setFieldSearch] = useState("");
  const [selectedPack, setSelectedPack] = useState<string>("ALL");

  const [systemInfo, setSystemInfo] = useState({
    retentionMonths: 24,
    lastBackupAt: null as string | null,
    schemaVersion: "1",
  });

  // Backup & Activity logs state
  const [backupFormat, setBackupFormat] = useState<"zip" | "json">("zip");
  const [backupDownloading, setBackupDownloading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logFilterEntity, setLogFilterEntity] = useState("ALL");

  // Load initial settings
  useEffect(() => {
    loadSettings();
    loadActivityLogs();
  }, []);

  const showNotification = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.settings) {
          const s: SettingsData = json.settings;
          setBranding({
            bureauName: s.branding.bureauName || "",
            city: s.branding.city || "",
            phone: s.branding.phone || "",
            supportEmail: s.branding.supportEmail || "",
            currency: s.branding.currency || "INR",
            currencySymbol: s.branding.currencySymbol || "₹",
            address: s.branding.address || "",
            website: s.branding.website || "",
          });
          setWeights(s.matchingWeights);
          setTutorFields(s.tutorFields);
          setSystemInfo(s.system);
        }
      }
    } catch (err: any) {
      showNotification("error", "Failed to load current settings.");
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/admin/activity-logs?limit=50");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.logs) {
          setActivityLogs(json.logs);
        }
      }
    } catch {
      // Keep empty if failed
    } finally {
      setLogsLoading(false);
    }
  };

  // 1. Save Bureau Branding
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branding }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showNotification("success", "Bureau branding and profile saved successfully.");
        loadActivityLogs();
      } else {
        showNotification("error", json.message || "Failed to save branding.");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  // 2. Save Matching Weights
  const handleSaveWeights = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchingWeights: weights }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showNotification("success", "Matching engine weights updated successfully.");
        loadActivityLogs();
      } else {
        showNotification("error", json.message || "Failed to save weights.");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetWeights = () => {
    setWeights({
      ...DEFAULT_MATCH_WEIGHTS,
      minScore: 30,
    });
    showNotification("success", "Reset to spec default matching weights (Locality 30, Subject 25, Class 10...).");
  };

  // 3. Save Tutor Fields
  const handleToggleField = (key: string, enabled: boolean) => {
    setTutorFields((prev) => {
      const item = prev[key];
      if (!item || item.isLocked) return prev;
      return {
        ...prev,
        [key]: { ...item, enabled },
      };
    });
  };

  const handleChangeRequiredAt = (
    key: string,
    requiredAt: "submit" | "verify" | "optional"
  ) => {
    setTutorFields((prev) => {
      const item = prev[key];
      if (!item) return prev;
      return {
        ...prev,
        [key]: { ...item, requiredAt },
      };
    });
  };

  const handleSaveTutorFields = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorFields }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showNotification("success", "Tutor field visibility and requirements updated.");
        loadActivityLogs();
      } else {
        showNotification("error", json.message || "Failed to update tutor fields.");
      }
    } catch (err: any) {
      showNotification("error", err.message || "Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  // 4. Download Full Data Backup
  const handleDownloadBackup = async () => {
    setBackupDownloading(true);
    try {
      const response = await fetch(`/api/admin/backup?format=${backupFormat}`);
      if (!response.ok) {
        throw new Error("Failed to generate backup export from server");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `tuition-bureau-backup-${new Date().toISOString().split("T")[0]}.${backupFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      setSystemInfo((prev) => ({
        ...prev,
        lastBackupAt: new Date().toISOString(),
      }));

      showNotification("success", `Full CRM backup downloaded successfully (${filename})`);
      loadActivityLogs();
    } catch (err: any) {
      showNotification("error", err.message || "Error generating backup file.");
    } finally {
      setBackupDownloading(false);
    }
  };

  // Calculate sum of weights
  const totalWeight =
    weights.locality +
    weights.subject +
    weights.class +
    weights.board +
    weights.fee +
    weights.timing +
    weights.experience +
    weights.freshness;

  const isWeightBalanced = totalWeight === 100;

  // Filter tutor fields
  const filteredFields = Object.values(tutorFields).filter((field) => {
    const matchesSearch =
      field.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      field.key.toLowerCase().includes(fieldSearch.toLowerCase());
    const matchesPack = selectedPack === "ALL" || field.pack === selectedPack;
    return matchesSearch && matchesPack;
  });

  const availablePacks = [
    "ALL",
    ...Array.from(new Set(Object.values(tutorFields).map((f) => f.pack))),
  ];

  // Filter activity logs
  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch =
      log.action?.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.description?.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.admin_id?.toLowerCase().includes(logSearch.toLowerCase());
    const matchesEntity =
      logFilterEntity === "ALL" ||
      log.entity_type?.toUpperCase() === logFilterEntity.toUpperCase();
    return matchesSearch && matchesEntity;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm">Loading Bureau CRM Settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage bureau branding, matching algorithms, tutor fields, and disaster recovery backups.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Schema v{systemInfo.schemaVersion}
          </span>
        </div>
      </div>

      {/* Global Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto space-x-1 sm:space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab("branding")}
          className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "branding"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Bureau Branding & Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("weights")}
          className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "weights"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Matching Weights</span>
          <span
            className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
              isWeightBalanced ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
            }`}
          >
            {totalWeight}%
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tutor-fields")}
          className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "tutor-fields"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <ToggleLeft className="w-4 h-4" />
          <span>Tutor Fields Toggles</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "backup"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Data & Backup</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Bureau Branding & Profile                                          */}
      {/* ========================================================================= */}
      {activeTab === "branding" && (
        <form onSubmit={handleSaveBranding} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Bureau Contact & Identity</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                These settings configure outward-facing communications, client invoices, and notification headers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Bureau Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={branding.bureauName}
                  onChange={(e) => setBranding({ ...branding, bureauName: e.target.value })}
                  placeholder="e.g. Swati Home Tuitions"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Operating City *
                </label>
                <input
                  type="text"
                  required
                  value={branding.city}
                  onChange={(e) => setBranding({ ...branding, city: e.target.value })}
                  placeholder="e.g. Bhopal"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Bureau Helpline / Phone *
                </label>
                <input
                  type="text"
                  required
                  value={branding.phone}
                  onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Support Email Address
                </label>
                <input
                  type="email"
                  value={branding.supportEmail}
                  onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
                  placeholder="e.g. support@swatituitions.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Currency Standard
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={branding.currency}
                    onChange={(e) => setBranding({ ...branding, currency: e.target.value })}
                    placeholder="INR"
                    className="w-1/2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={branding.currencySymbol}
                    onChange={(e) => setBranding({ ...branding, currencySymbol: e.target.value })}
                    placeholder="₹"
                    className="w-1/2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Website URL
                </label>
                <input
                  type="text"
                  value={branding.website}
                  onChange={(e) => setBranding({ ...branding, website: e.target.value })}
                  placeholder="https://swatituitions.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Physical Bureau Address
                </label>
                <textarea
                  rows={2}
                  value={branding.address}
                  onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                  placeholder="Plot 42, MP Nagar Zone 2, Bhopal, Madhya Pradesh"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button type="submit" isLoading={saving} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>Save Bureau Profile</span>
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Matching Weights                                                   */}
      {/* ========================================================================= */}
      {activeTab === "weights" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Dynamic Matching Weights</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tune how candidate tutors are ranked when matching against student requirements (Section 16.3).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                    isWeightBalanced
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }`}
                >
                  {isWeightBalanced ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <span>Total Weight: {totalWeight} / 100</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetWeights}
                  className="flex items-center gap-1.5 text-xs text-gray-600"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </Button>
              </div>
            </div>

            {/* Weights Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Locality */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
                  <span>Locality Proximity</span>
                  <span className="text-blue-600 font-bold">{weights.locality}%</span>
                </div>
                <p className="text-xs text-gray-500">
                  Full score for exact locality; 60% score if connected via LocalityLinks.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={weights.locality}
                    onChange={(e) => setWeights({ ...weights, locality: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.locality}
                    onChange={(e) => setWeights({ ...weights, locality: Number(e.target.value) })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center font-bold"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
                  <span>Subject Coverage</span>
                  <span className="text-blue-600 font-bold">{weights.subject}%</span>
                </div>
                <p className="text-xs text-gray-500">
                  Proportion of requested subjects tutor is qualified and verified to teach.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={weights.subject}
                    onChange={(e) => setWeights({ ...weights, subject: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.subject}
                    onChange={(e) => setWeights({ ...weights, subject: Number(e.target.value) })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center font-bold"
                  />
                </div>
              </div>

              {/* Class */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
                  <span>Class / Grade Level</span>
                  <span className="text-blue-600 font-bold">{weights.class}%</span>
                </div>
                <p className="text-xs text-gray-500">
                  Tutor explicitly offers the student&apos;s class (e.g. Class 10, Class 12).
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={weights.class}
                    onChange={(e) => setWeights({ ...weights, class: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.class}
                    onChange={(e) => setWeights({ ...weights, class: Number(e.target.value) })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center font-bold"
                  />
                </div>
              </div>

              {/* Board */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
                  <span>Education Board Match</span>
                  <span className="text-blue-600 font-bold">{weights.board}%</span>
                </div>
                <p className="text-xs text-gray-500">
                  Tutor is familiar with CBSE, ICSE, or State Board curriculum.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={weights.board}
                    onChange={(e) => setWeights({ ...weights, board: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.board}
                    onChange={(e) => setWeights({ ...weights, board: Number(e.target.value) })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center font-bold"
                  />
                </div>
              </div>

              {/* Fee */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
                  <span>Fee / Budget Compatibility</span>
                  <span className="text-blue-600 font-bold">{weights.fee}%</span>
                </div>
                <p className="text-xs text-gray-500">
                  Calculated against student budget (penalty scales if expected fee exceeds budget).
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={weights.fee}
                    onChange={(e) => setWeights({ ...weights, fee: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.fee}
                    onChange={(e) => setWeights({ ...weights, fee: Number(e.target.value) })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center font-bold"
                  />
                </div>
              </div>

              {/* Timing */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
                  <span>Timing Availability</span>
                  <span className="text-blue-600 font-bold">{weights.timing}%</span>
                </div>
                <p className="text-xs text-gray-500">
                  Overlap in Morning, Afternoon, or Evening slot preferences.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={weights.timing}
                    onChange={(e) => setWeights({ ...weights, timing: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.timing}
                    onChange={(e) => setWeights({ ...weights, timing: Number(e.target.value) })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center font-bold"
                  />
                </div>
              </div>

              {/* Experience */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
                  <span>Teaching Experience</span>
                  <span className="text-blue-600 font-bold">{weights.experience}%</span>
                </div>
                <p className="text-xs text-gray-500">
                  Reward for documented years of classroom and private tutoring experience.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={weights.experience}
                    onChange={(e) => setWeights({ ...weights, experience: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.experience}
                    onChange={(e) => setWeights({ ...weights, experience: Number(e.target.value) })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center font-bold"
                  />
                </div>
              </div>

              {/* Freshness */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-900">
                  <span>Availability Freshness</span>
                  <span className="text-blue-600 font-bold">{weights.freshness}%</span>
                </div>
                <p className="text-xs text-gray-500">
                  Recency bonus if tutor confirmed availability within last 30 days.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={weights.freshness}
                    onChange={(e) => setWeights({ ...weights, freshness: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.freshness}
                    onChange={(e) => setWeights({ ...weights, freshness: Number(e.target.value) })}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Minimum Threshold Score */}
            <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-gray-900">Minimum Score Cutoff</span>
                <p className="text-xs text-gray-600">
                  Tutors scoring below this threshold are omitted from automatic recommendation lists.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={weights.minScore}
                  onChange={(e) => setWeights({ ...weights, minScore: Number(e.target.value) })}
                  className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-center font-bold bg-white"
                />
                <span className="text-xs font-semibold text-gray-500">points</span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button onClick={handleSaveWeights} isLoading={saving} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>Save Matching Configuration</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Tutor Fields Toggles                                               */}
      {/* ========================================================================= */}
      {activeTab === "tutor-fields" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Tutor Field Registry & Verification</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure field collection on public registration forms and verification prerequisites (Section 8).
                </p>
              </div>

              <Button onClick={handleSaveTutorFields} isLoading={saving} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>Save Field Rules</span>
              </Button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  placeholder="Filter fields by name or key..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1">
                {availablePacks.map((pack) => (
                  <button
                    key={pack}
                    type="button"
                    onClick={() => setSelectedPack(pack)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedPack === pack
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {pack}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Field Name</th>
                      <th className="py-3 px-4">Category Pack</th>
                      <th className="py-3 px-4">Field Status</th>
                      <th className="py-3 px-4">Requirement Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredFields.map((field) => (
                      <tr key={field.key} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{field.label}</span>
                            {field.isLocked && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                <Lock className="w-3 h-3" /> Core
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-gray-400">{field.key}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                            {field.pack}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.enabled}
                              disabled={field.isLocked}
                              onChange={(e) => handleToggleField(field.key, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                            <span className="ml-2 text-xs font-medium text-gray-700">
                              {field.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </label>
                        </td>

                        <td className="py-3 px-4">
                          <select
                            value={field.requiredAt}
                            onChange={(e) =>
                              handleChangeRequiredAt(
                                field.key,
                                e.target.value as "submit" | "verify" | "optional"
                              )
                            }
                            className="text-xs border border-gray-300 rounded px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="submit">Required on Registration</option>
                            <option value="verify">Required for Verification</option>
                            <option value="optional">Optional Information</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Data & Backup                                                      */}
      {/* ========================================================================= */}
      {activeTab === "backup" && (
        <div className="space-y-6">
          {/* Backup Action Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">CRM Full Data Backup & Disaster Recovery</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Download an offline snapshot of all 11 database tabs. Every text cell is sanitized against CSV formula injection.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-600">
                  Last Backup:{" "}
                  <strong className="text-gray-900">
                    {systemInfo.lastBackupAt ? formatDate(systemInfo.lastBackupAt, "Asia/Kolkata", true) : "Never"}
                  </strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>11 Core Tabs</span>
                </div>
                <p className="text-xs text-gray-500">
                  Students, Tutors, Assignments, FollowUps, Payments, ActivityLog, Lookups, LocalityLinks, Settings, Templates, Meta.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <ShieldAlert className="w-4 h-4 text-emerald-600" />
                  <span>Formula Sanitization</span>
                </div>
                <p className="text-xs text-gray-500">
                  Cells starting with =, +, -, @, or tab characters are neutralized to safeguard spreadsheets against malware.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Archive Structure</span>
                </div>
                <p className="text-xs text-gray-500">
                  Formatted for clean re-import into new spreadsheets using the setup script documented in docs/BACKUP-RESTORE.md.
                </p>
              </div>
            </div>

            {/* Export Format Selector and Button */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Format:</span>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="backupFormat"
                    value="zip"
                    checked={backupFormat === "zip"}
                    onChange={() => setBackupFormat("zip")}
                    className="accent-blue-600"
                  />
                  <span>ZIP Archive (.zip with 11 CSVs)</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="backupFormat"
                    value="json"
                    checked={backupFormat === "json"}
                    onChange={() => setBackupFormat("json")}
                    className="accent-blue-600"
                  />
                  <span>JSON Package (.json)</span>
                </label>
              </div>

              <Button
                onClick={handleDownloadBackup}
                isLoading={backupDownloading}
                className="flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Full Data Backup</span>
              </Button>
            </div>
          </div>

          {/* Activity Log Audit Trail Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Recent Activity Log (Audit Trail)</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Immutable audit records of all administrative actions, data edits, verifications, and backups.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadActivityLogs}
                isLoading={logsLoading}
                className="flex items-center gap-1.5 text-xs text-gray-600"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Audit Logs</span>
              </Button>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search logs by action or description..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={logFilterEntity}
                onChange={(e) => setLogFilterEntity(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Entities</option>
                <option value="SETTINGS">SETTINGS</option>
                <option value="STUDENT">STUDENT</option>
                <option value="TUTOR">TUTOR</option>
                <option value="ASSIGNMENT">ASSIGNMENT</option>
                <option value="PAYMENT">PAYMENT</option>
                <option value="AUTH">AUTH</option>
              </select>
            </div>

            {/* Logs Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Admin</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          No activity log records match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr key={log.activity_id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2.5 px-4 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                            {formatDate(log.timestamp, "Asia/Kolkata", true)}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap font-medium text-gray-900">
                            {log.admin_id}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                              {log.entity_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-blue-700">
                            {log.action}
                          </td>
                          <td className="py-2.5 px-4 text-gray-600 max-w-md truncate">
                            {log.description}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
