"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { InvlogVolumeData } from "@/lib/api";

interface InvlogVolumeChartProps {
  data: InvlogVolumeData;
}

export function InvlogVolumeChart({ data }: InvlogVolumeChartProps) {
  // Merge inbound and outbound by period
  const periodMap = new Map<
    string,
    { period: string; inbound_vol: number; outbound_vol: number }
  >();

  for (const row of data.inbound || []) {
    const existing = periodMap.get(row.period) || {
      period: row.period,
      inbound_vol: 0,
      outbound_vol: 0,
    };
    existing.inbound_vol = row.total_volume_cbm;
    periodMap.set(row.period, existing);
  }

  for (const row of data.outbound || []) {
    const existing = periodMap.get(row.period) || {
      period: row.period,
      inbound_vol: 0,
      outbound_vol: 0,
    };
    existing.outbound_vol = row.total_volume_cbm;
    periodMap.set(row.period, existing);
  }

  const chartData = Array.from(periodMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toLocaleString()}`} />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
          formatter={(value: number, name: string) => [
            `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} CBM`,
            name,
          ]}
        />
        <Legend />
        <Bar
          dataKey="inbound_vol"
          name="Inbound Volume (CBM)"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="outbound_vol"
          name="Outbound Volume (CBM)"
          fill="#f97316"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
