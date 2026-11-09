import React from "react";
import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/types/vocab";

export type BadgeTone = "green" | "amber" | "blue" | "gray" | "red";

export interface StatusBadgeProps {
  status: string;
  tone?: BadgeTone;
  label?: string;
  className?: string;
}

const GREEN_STATUSES = new Set([
  "VERIFIED",
  "ACTIVE",
  "PAID",
  "CONVERTED",
  "DONE",
  "COMPLETED",
]);

const AMBER_STATUSES = new Set([
  "PENDING",
  "UNDER_REVIEW",
  "NEW",
  "SHORTLISTED",
  "DEMO_SCHEDULED",
  "PARTIALLY_PAID",
  "OPEN",
]);

const BLUE_STATUSES = new Set([
  "CONTACTED",
  "ACCEPTED",
  "DEMO_COMPLETED",
  "TUTOR_SHORTLISTED",
]);

const GRAY_STATUSES = new Set([
  "INACTIVE",
  "ON_HOLD",
  "TEMPORARILY_UNAVAILABLE",
  "CANCELLED",
  "NOT_SCHEDULED",
  "NOT_STARTED",
  "REFUNDED",
]);

const RED_STATUSES = new Set([
  "REJECTED",
  "BLACKLISTED",
  "FAILED",
  "LOST",
  "NO_SHOW",
  "OVERDUE",
]);

export function getStatusTone(status: string): BadgeTone {
  const upper = status.toUpperCase();
  if (GREEN_STATUSES.has(upper)) return "green";
  if (AMBER_STATUSES.has(upper)) return "amber";
  if (BLUE_STATUSES.has(upper)) return "blue";
  if (RED_STATUSES.has(upper)) return "red";
  if (GRAY_STATUSES.has(upper)) return "gray";
  return "gray";
}

const toneStyles: Record<BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  amber: "bg-amber-50 text-amber-900 border-amber-200",
  blue: "bg-blue-50 text-blue-800 border-blue-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
  red: "bg-rose-50 text-rose-800 border-rose-200",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  tone,
  label,
  className,
}) => {
  const finalTone = tone || getStatusTone(status);
  const displayLabel = label || STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        toneStyles[finalTone],
        className
      )}
    >
      {displayLabel}
    </span>
  );
};
