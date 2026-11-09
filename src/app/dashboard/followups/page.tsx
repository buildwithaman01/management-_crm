"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck2,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Phone,
  Calendar,
  Filter,
  X,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { FollowUp } from "@/types/entities";
import {
  TEMPLATE_LIST,
  interpolateTemplate,
  buildWhatsAppUrl,
  WhatsAppTemplate,
  TemplateVariables,
} from "@/lib/whatsapp/templates";

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "OVERDUE" | "TODAY" | "UPCOMING" | "COMPLETED">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [entityFilter, setEntityFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Create Follow-up Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    related_type: "STUDENT" as "STUDENT" | "TUTOR" | "ASSIGNMENT",
    related_id: "",
    due_at: "",
    followup_type: "Call",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    description: "",
  });

  // WhatsApp Dialog State
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMPLATE_LIST[0].id);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [templateVars, setTemplateVars] = useState<TemplateVariables>({
    student_name: "",
    tutor_name: "",
    subject: "",
    class: "",
    demo_date: "",
    demo_time: "",
    address: "",
    bureau_name: "Tuition Bureau",
    phone: "",
  });
  const [targetFollowup, setTargetFollowup] = useState<FollowUp | null>(null);

  useEffect(() => {
    loadFollowups();
  }, []);

  const loadFollowups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/followups");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setFollowups(json.followups || []);
        }
      }
    } catch (err) {
      console.error("Failed to load follow-ups:", err);
    } finally {
      setLoading(false);
    }
  };

  // Quick complete action
  const handleQuickComplete = async (followupId: string) => {
    try {
      const res = await fetch(`/api/admin/followups/${followupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setFollowups((prev) =>
            prev.map((f) =>
              f.followup_id === followupId
                ? { ...f, status: "DONE", completed_at: json.followup.completed_at }
                : f
            )
          );
        }
      }
    } catch (err) {
      console.error("Failed to mark done:", err);
    }
  };

  // Cancel action
  const handleCancelFollowup = async (followupId: string) => {
    try {
      const res = await fetch(`/api/admin/followups/${followupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setFollowups((prev) =>
            prev.map((f) =>
              f.followup_id === followupId
                ? { ...f, status: "CANCELLED", completed_at: json.followup.completed_at }
                : f
            )
          );
        }
      }
    } catch (err) {
      console.error("Failed to cancel followup:", err);
    }
  };

  // Create submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!createForm.related_id.trim()) {
      setCreateError("Please provide a Related ID (e.g. Student ID, Tutor ID).");
      return;
    }
    if (!createForm.due_at) {
      setCreateError("Please select a valid Due Date & Time.");
      return;
    }
    if (!createForm.description.trim()) {
      setCreateError("Please enter follow-up description / notes.");
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/admin/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          related_type: createForm.related_type,
          related_id: createForm.related_id.trim(),
          due_at: new Date(createForm.due_at).toISOString(),
          followup_type: createForm.followup_type,
          priority: createForm.priority,
          description: createForm.description.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create follow-up");
      }

      setFollowups((prev) => [json.followup, ...prev]);
      setCreateModalOpen(false);
      setCreateForm({
        related_type: "STUDENT",
        related_id: "",
        due_at: "",
        followup_type: "Call",
        priority: "MEDIUM",
        description: "",
      });
    } catch (err: any) {
      setCreateError(err.message || "Failed to create follow-up");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // WhatsApp Dialog opener
  const openWhatsAppDialog = (followup?: FollowUp) => {
    setTargetFollowup(followup || null);
    if (followup) {
      // Pick template based on entity type
      if (followup.related_type === "TUTOR") {
        setSelectedTemplateId("TUTOR_WELCOME");
        setTemplateVars((prev) => ({
          ...prev,
          tutor_name: followup.related_id,
        }));
      } else {
        setSelectedTemplateId("FOLLOWUP_CHECKIN");
        setTemplateVars((prev) => ({
          ...prev,
          student_name: followup.related_id,
        }));
      }
    }
    setCopiedFeedback(false);
    setWaModalOpen(true);
  };

  // Computed counts & overdue logic
  const now = new Date().getTime();
  const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

  const counts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    let completed = 0;

    followups.forEach((f) => {
      const due = new Date(f.due_at).getTime();
      if (f.status === "DONE") {
        completed++;
      } else if (f.status === "OPEN") {
        if (!isNaN(due) && due < now) {
          overdue++;
        } else if (!isNaN(due) && due >= startOfToday && due <= endOfToday) {
          today++;
        } else if (!isNaN(due) && due > endOfToday) {
          upcoming++;
        }
      }
    });

    return { overdue, today, upcoming, completed, total: followups.length };
  }, [followups, now, startOfToday, endOfToday]);

  // Filtering
  const filteredFollowups = useMemo(() => {
    return followups.filter((f) => {
      const due = new Date(f.due_at).getTime();

      // Tab filter
      if (activeTab === "OVERDUE") {
        if (f.status !== "OPEN" || isNaN(due) || due >= now) return false;
      } else if (activeTab === "TODAY") {
        if (f.status !== "OPEN" || isNaN(due) || due < startOfToday || due > endOfToday) return false;
      } else if (activeTab === "UPCOMING") {
        if (f.status !== "OPEN" || isNaN(due) || due <= endOfToday) return false;
      } else if (activeTab === "COMPLETED") {
        if (f.status !== "DONE") return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && f.status !== statusFilter) {
        return false;
      }

      // Entity filter
      if (entityFilter !== "ALL" && f.related_type !== entityFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "ALL" && (f.priority || "MEDIUM") !== priorityFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = f.description?.toLowerCase().includes(q);
        const matchRel = f.related_id?.toLowerCase().includes(q);
        const matchId = f.followup_id?.toLowerCase().includes(q);
        const matchType = f.followup_type?.toLowerCase().includes(q);
        return matchDesc || matchRel || matchId || matchType;
      }

      return true;
    });
  }, [followups, activeTab, statusFilter, entityFilter, priorityFilter, searchQuery, now, startOfToday, endOfToday]);

  // Active selected WhatsApp Template & preview message
  const activeTemplate = useMemo(() => {
    return TEMPLATE_LIST.find((t) => t.id === selectedTemplateId) || TEMPLATE_LIST[0];
  }, [selectedTemplateId]);

  const previewMessage = useMemo(() => {
    return interpolateTemplate(activeTemplate.body, templateVars);
  }, [activeTemplate, templateVars]);

  const handleLaunchWhatsApp = async () => {
    const url = buildWhatsAppUrl(recipientPhone, previewMessage);
    if (!url) {
      alert("Please enter a valid recipient phone number.");
      return;
    }

    // Log WHATSAPP_OPENED adhering to Section 19
    try {
      await fetch("/api/admin/whatsapp/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: activeTemplate.name,
          entityType: targetFollowup?.related_type || "STUDENT",
          entityId: targetFollowup?.related_id || "DIRECT",
          recipientPhone,
        }),
      });
    } catch {
      // non-blocking
    }

    window.open(url, "_blank");
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(previewMessage);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-6 h-6 text-blue-600" />
            Follow-ups & WhatsApp
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track inquiries, demo calls, feedback check-ins and send formatted WhatsApp messages.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => openWhatsAppDialog()}
            className="flex items-center gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            WhatsApp Templates
          </Button>
          <Button
            type="button"
            onClick={() => {
              // Pre-fill due_at to tomorrow 10:00 AM
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(10, 0, 0, 0);
              const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
              setCreateForm((prev) => ({ ...prev, due_at: localIso }));
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + Add Follow-up
          </Button>
        </div>
      </div>

      {/* Prominent Red Banner for Overdue Tasks (Spec Section 20) */}
      {counts.overdue > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-lg shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Action Required: {counts.overdue} Overdue Follow-up Task{counts.overdue > 1 ? "s" : ""}
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                These tasks have passed their scheduled due date. Complete or reschedule them now to prevent lead loss.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setActiveTab("OVERDUE");
              setStatusFilter("ALL");
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs whitespace-nowrap self-start sm:self-auto"
          >
            View Overdue Tasks ({counts.overdue})
          </Button>
        </div>
      )}

      {/* Quick KPI Tabs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`p-3 text-left rounded-lg border transition-all ${
            activeTab === "ALL"
              ? "bg-blue-50/70 border-blue-400 ring-1 ring-blue-400 shadow-sm"
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-medium text-gray-500">All Tasks</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{counts.total}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("OVERDUE")}
          className={`p-3 text-left rounded-lg border transition-all ${
            activeTab === "OVERDUE"
              ? "bg-rose-50 border-rose-400 ring-1 ring-rose-400 shadow-sm"
              : "bg-white border-gray-200 hover:border-rose-300"
          }`}
        >
          <div className="text-xs font-semibold text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Overdue
          </div>
          <div className="text-xl font-bold text-rose-700 mt-1">{counts.overdue}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TODAY")}
          className={`p-3 text-left rounded-lg border transition-all ${
            activeTab === "TODAY"
              ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400 shadow-sm"
              : "bg-white border-gray-200 hover:border-amber-300"
          }`}
        >
          <div className="text-xs font-medium text-amber-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Due Today
          </div>
          <div className="text-xl font-bold text-amber-800 mt-1">{counts.today}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("UPCOMING")}
          className={`p-3 text-left rounded-lg border transition-all ${
            activeTab === "UPCOMING"
              ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400 shadow-sm"
              : "bg-white border-gray-200 hover:border-emerald-300"
          }`}
        >
          <div className="text-xs font-medium text-emerald-700 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            Upcoming
          </div>
          <div className="text-xl font-bold text-emerald-800 mt-1">{counts.upcoming}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("COMPLETED")}
          className={`p-3 text-left rounded-lg border transition-all col-span-2 sm:col-span-1 ${
            activeTab === "COMPLETED"
              ? "bg-gray-100 border-gray-400 ring-1 ring-gray-400 shadow-sm"
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
            Completed
          </div>
          <div className="text-xl font-bold text-gray-800 mt-1">{counts.completed}</div>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search description, related student, tutor ID, type..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="DONE">Done Only</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Entities</option>
              <option value="STUDENT">Student Only</option>
              <option value="TUTOR">Tutor Only</option>
              <option value="ASSIGNMENT">Assignment</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadFollowups}
              className="text-xs text-gray-600"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            Loading follow-up tasks...
          </div>
        ) : filteredFollowups.length === 0 ? (
          <EmptyState
            title="No follow-up tasks found"
            description={
              searchQuery || activeTab !== "ALL" || statusFilter !== "ALL"
                ? "Try clearing your search query or filters."
                : "You have no scheduled follow-up tasks at this time. Create one to stay organized!"
            }
            action={{
              label: "+ Add New Follow-up",
              onClick: () => setCreateModalOpen(true),
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase border-b border-gray-200 font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Task ID / Type</th>
                  <th className="px-4 py-3">Related Entity</th>
                  <th className="px-4 py-3">Description & Notes</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Due Date & Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredFollowups.map((item) => {
                  const dueTime = new Date(item.due_at).getTime();
                  const isOverdue = item.status === "OPEN" && !isNaN(dueTime) && dueTime < now;
                  const isToday =
                    item.status === "OPEN" &&
                    !isNaN(dueTime) &&
                    dueTime >= startOfToday &&
                    dueTime <= endOfToday;

                  const priorityColors: Record<string, string> = {
                    URGENT: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
                    HIGH: "bg-orange-100 text-orange-800 border-orange-300 font-semibold",
                    MEDIUM: "bg-blue-50 text-blue-800 border-blue-200",
                    LOW: "bg-gray-100 text-gray-700 border-gray-200",
                  };

                  return (
                    <tr
                      key={item.followup_id}
                      className={`hover:bg-gray-50 transition-colors ${
                        isOverdue ? "bg-rose-50/30" : ""
                      }`}
                    >
                      {/* ID / Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{item.followup_id}</div>
                        <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          {item.followup_type === "Call" && <Phone className="w-2.5 h-2.5" />}
                          {item.followup_type === "WhatsApp" && <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />}
                          {item.followup_type || "Follow-up"}
                        </span>
                      </td>

                      {/* Related Entity */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.related_type === "STUDENT"
                              ? "bg-purple-100 text-purple-800"
                              : item.related_type === "TUTOR"
                              ? "bg-teal-100 text-teal-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {item.related_type}
                        </span>
                        <div className="font-medium text-gray-900 mt-0.5 text-xs">
                          {item.related_id}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="line-clamp-2 text-gray-900 font-medium">
                          {item.description}
                        </p>
                        {item.assigned_admin && (
                          <span className="text-[10px] text-gray-400">
                            Assigned: {item.assigned_admin}
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] border ${
                            priorityColors[item.priority || "MEDIUM"] || priorityColors.MEDIUM
                          }`}
                        >
                          {item.priority || "MEDIUM"}
                        </span>
                      </td>

                      {/* Due Date & Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div
                          className={`flex items-center gap-1 font-medium ${
                            isOverdue
                              ? "text-rose-600 font-bold"
                              : isToday
                              ? "text-amber-700 font-semibold"
                              : "text-gray-700"
                          }`}
                        >
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
                          {isToday && <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                          <span>{formatDate(item.due_at, "Asia/Kolkata", true)}</span>
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-rose-500 font-semibold">
                            OVERDUE
                          </span>
                        )}
                        {isToday && !isOverdue && (
                          <span className="text-[10px] text-amber-600 font-semibold">
                            TODAY
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                        {item.completed_at && item.status === "DONE" && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Done: {formatDate(item.completed_at, "Asia/Kolkata", false)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-right space-x-1.5">
                        {/* Quick Complete Action */}
                        {item.status === "OPEN" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickComplete(item.followup_id)}
                            className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-[11px] h-7 px-2"
                            title="Mark as completed"
                          >
                            <Check className="w-3 h-3 text-emerald-600 mr-1" />
                            Done
                          </Button>
                        )}

                        {/* WhatsApp Message Opener */}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openWhatsAppDialog(item)}
                          className="text-emerald-800 border-gray-200 hover:bg-emerald-50 text-[11px] h-7 px-2"
                          title="Open WhatsApp template dialog"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                        </Button>

                        {/* Cancel Action if open */}
                        {item.status === "OPEN" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelFollowup(item.followup_id)}
                            className="text-gray-400 hover:text-rose-600 border-transparent hover:border-gray-200 text-[11px] h-7 px-2"
                            title="Cancel follow-up"
                          >
                            <X className="w-3 h-3" />
                          </Button>
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

      {/* CREATE FOLLOW-UP MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setCreateModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                Schedule New Follow-up
              </h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Related Type */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Related Entity Type *
                  </label>
                  <select
                    value={createForm.related_type}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        related_type: e.target.value as any,
                      }))
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="TUTOR">Tutor</option>
                    <option value="ASSIGNMENT">Assignment</option>
                  </select>
                </div>

                {/* Related ID */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Related Record ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STU-2611-ABCD"
                    value={createForm.related_id}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, related_id: e.target.value }))
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Follow-up Type */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Action Type *
                  </label>
                  <select
                    value={createForm.followup_type}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, followup_type: e.target.value }))
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp Message</option>
                    <option value="Visit">In-Person Visit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        priority: e.target.value as any,
                      }))
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Time */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Scheduled Due Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={createForm.due_at}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, due_at: e.target.value }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Description / Follow-up Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Call parent regarding feedback on yesterday's demo class with tutor."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSubmitting}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createSubmitting ? "Saving..." : "Save Follow-up"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP CLICK-TO-CHAT TEMPLATE DIALOG (Spec Section 19) */}
      {waModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setWaModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 z-10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Send WhatsApp Message
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Select a template, customize placeholders, and preview before launching WhatsApp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Phone and Template Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Recipient Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="+91 9876543210 or 10 digits"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-gray-400">
                  Formatted automatically to Indian standard (+91)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Select Template *
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                >
                  {TEMPLATE_LIST.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.audience})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-400">
                  {activeTemplate.description}
                </span>
              </div>
            </div>

            {/* Dynamic Template Variables */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
              <span className="text-xs font-bold text-gray-700 block">
                Template Variables (Optional Fill)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-gray-600">Student Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={templateVars.student_name || ""}
                    onChange={(e) =>
                      setTemplateVars((prev) => ({ ...prev, student_name: e.target.value }))
                    }
                    className="w-full bg-white border border-gray-200 rounded p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600">Tutor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Anita Verma"
                    value={templateVars.tutor_name || ""}
                    onChange={(e) =>
                      setTemplateVars((prev) => ({ ...prev, tutor_name: e.target.value }))
                    }
                    className="w-full bg-white border border-gray-200 rounded p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics"
                    value={templateVars.subject || ""}
                    onChange={(e) =>
                      setTemplateVars((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    className="w-full bg-white border border-gray-200 rounded p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600">Class</label>
                  <input
                    type="text"
                    placeholder="e.g. 10"
                    value={templateVars.class || ""}
                    onChange={(e) =>
                      setTemplateVars((prev) => ({ ...prev, class: e.target.value }))
                    }
                    className="w-full bg-white border border-gray-200 rounded p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600">Demo Date & Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 12th Nov at 5:00 PM"
                    value={templateVars.demo_date || ""}
                    onChange={(e) =>
                      setTemplateVars((prev) => ({
                        ...prev,
                        demo_date: e.target.value,
                        demo_time: e.target.value,
                      }))
                    }
                    className="w-full bg-white border border-gray-200 rounded p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600">Bureau Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={templateVars.phone || ""}
                    onChange={(e) =>
                      setTemplateVars((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full bg-white border border-gray-200 rounded p-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Live WhatsApp Preview Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-semibold flex items-center gap-1 text-emerald-800">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Live Message Preview
                </span>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-[11px]"
                >
                  {copiedFeedback ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>

              {/* Chat Bubble Simulation */}
              <div className="bg-[#EFEAE2] p-4 rounded-xl border border-gray-200 shadow-inner">
                <div className="bg-white rounded-lg p-3 max-w-lg shadow-sm border border-emerald-100/50 space-y-2">
                  <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {previewMessage}
                  </p>
                  <div className="flex justify-end text-[10px] text-gray-400">
                    Just now · Read
                  </div>
                </div>
              </div>
            </div>

            {/* Notice Section 19 */}
            <div className="text-[11px] text-gray-400 italic">
              Note: Clicking &quot;Open WhatsApp&quot; launches the chat window with pre-filled text. The action is logged in Activity History as WHATSAPP_OPENED.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWaModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleLaunchWhatsApp}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
