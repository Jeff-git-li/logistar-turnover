"use client";

import { WAREHOUSES } from "@/lib/api";

interface WarehouseSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function WarehouseSelect({ value, onChange }: WarehouseSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
    >
      <option value="">All Warehouses</option>
      {WAREHOUSES.map((wh) => (
        <option key={wh.id} value={wh.id}>
          {wh.name} (WH {wh.id})
        </option>
      ))}
    </select>
  );
}
