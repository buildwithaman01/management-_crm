import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon?: LucideIcon;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  description,
  trend,
  icon: Icon,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-white p-5 rounded-card border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow transition-shadow",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {Icon && (
          <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-gray-900 font-mono">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded",
              trend.positive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
};
