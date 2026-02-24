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
    { period: string; inbound_qty: number; outbound_qty: number; inbound_events: number; outbound_events: number }
  >();

  for (const row of data.inbound || []) {
    const existing = periodMap.get(row.period) || {
      period: row.period,
      inbound_qty: 0,
      outbound_qty: 0,
      inbound_events: 0,
      outbound_events: 0,
    };
    existing.inbound_qty = row.total_qty;
    existing.inbound_events = row.event_count;
    periodMap.set(row.period, existing);
  }

  for (const row of data.outbound || []) {
    const existing = periodMap.get(row.period) || {
      period: row.period,
      inbound_qty: 0,
      outbound_qty: 0,
      inbound_events: 0,
      outbound_events: 0,
    };
    existing.outbound_qty = row.total_qty;
    existing.outbound_events = row.event_count;
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
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
          formatter={(value: number, name: string) => [
            value.toLocaleString(),
            name,
          ]}
        />
        <Legend />
        <Bar
          dataKey="inbound_qty"
          name="Inbound Qty"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="outbound_qty"
          name="Outbound Qty"
          fill="#f97316"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
