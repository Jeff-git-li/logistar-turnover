"use client";

import { useState } from "react";

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
  granularity?: string;
  onGranularityChange?: (g: string) => void;
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  granularity,
  onGranularityChange,
}: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-500">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChange(e.target.value, dateTo)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-500">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onChange(dateFrom, e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      {granularity && onGranularityChange && (
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {["day", "week", "month"].map((g) => (
            <button
              key={g}
              onClick={() => onGranularityChange(g)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                granularity === g
                  ? "bg-white text-slate-900 shadow-sm font-medium"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
