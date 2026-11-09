import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value: initialValue = "",
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className,
}) => {
  const [query, setQuery] = useState(initialValue);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(query);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [query, debounceMs, onChange]);

  return (
    <div className={cn("relative flex items-center w-full max-w-sm", className)}>
      <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            onChange("");
          }}
          className="absolute right-2.5 p-0.5 rounded text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
