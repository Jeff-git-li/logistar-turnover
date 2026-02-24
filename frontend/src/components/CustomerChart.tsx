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
  Cell,
} from "recharts";
import type { CustomerData } from "@/lib/api";

const COLORS = ["#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#f59e0b", "#ec4899"];

interface CustomerChartProps {
  data: CustomerData[];
}

export function CustomerChart({ data }: CustomerChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>;
  }

  const chartData = data.slice(0, 15).map((d) => ({
    customer: d.customer_code,
    outbound: d.outbound_parcels,
    inbound: d.inbound_qty,
    cbm: d.outbound_cbm,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="customer"
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
        <Legend />
        <Bar dataKey="inbound" name="Inbound Qty" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="outbound" name="Outbound Parcels" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
