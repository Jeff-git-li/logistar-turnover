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

interface VolumeChartProps {
  outbound: Array<{ period: string; order_count: number; parcel_count: number; total_cbm: number }>;
  inbound: Array<{ period: string; receiving_count: number; total_received_qty: number }>;
}

export function VolumeChart({ outbound, inbound }: VolumeChartProps) {
  // Merge inbound and outbound by period
  const periodMap = new Map<string, { period: string; outbound_qty: number; inbound_qty: number; outbound_cbm: number }>();

  for (const o of outbound) {
    const existing = periodMap.get(o.period) || { period: o.period, outbound_qty: 0, inbound_qty: 0, outbound_cbm: 0 };
    existing.outbound_qty = o.parcel_count;
    existing.outbound_cbm = o.total_cbm;
    periodMap.set(o.period, existing);
  }

  for (const i of inbound) {
    const existing = periodMap.get(i.period) || { period: i.period, outbound_qty: 0, inbound_qty: 0, outbound_cbm: 0 };
    existing.inbound_qty = i.total_received_qty;
    periodMap.set(i.period, existing);
  }

  const data = Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period));

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
        />
        <Legend />
        <Bar dataKey="inbound_qty" name="Inbound Qty" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="outbound_qty" name="Outbound Qty" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
