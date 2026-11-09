import React, { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            "flex min-h-[48px] w-full rounded-lg border bg-white px-3.5 py-2.5 text-base shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900",
            error
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500 text-rose-900"
              : "border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs sm:text-sm font-medium text-rose-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
