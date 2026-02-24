"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CustomerData } from "@/lib/api";

const COLORS = ["#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#f59e0b", "#ec4899", "#6366f1", "#14b8a6"];

interface CBMPieChartProps {
  data: CustomerData[];
}

export function CBMPieChart({ data }: CBMPieChartProps) {
  const pieData = data
    .filter((d) => d.outbound_cbm > 0)
    .sort((a, b) => b.outbound_cbm - a.outbound_cbm)
    .slice(0, 10)
    .map((d) => ({
      name: d.customer_code,
      value: Math.round(d.outbound_cbm * 1000) / 1000,
    }));

  if (pieData.length === 0) {
    return <div className="flex items-center justify-center h-64 text-slate-400">No CBM data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
          labelLine
        >
          {pieData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `${value} CBM`} />
      </PieChart>
    </ResponsiveContainer>
  );
}
