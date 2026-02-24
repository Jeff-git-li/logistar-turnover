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
import type { InvlogCustomerData } from "@/lib/api";

interface InvlogCustomerChartProps {
  data: InvlogCustomerData[];
}

export function InvlogCustomerChart({ data }: InvlogCustomerChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        No data available
      </div>
    );
  }

  const chartData = data.slice(0, 15).map((d) => ({
    customer: d.customer_code,
    outbound: d.outbound_qty,
    inbound: d.inbound_qty,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="customer"
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
          formatter={(value: number) => value.toLocaleString()}
        />
        <Legend />
        <Bar
          dataKey="inbound"
          name="Inbound Qty"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="outbound"
          name="Outbound Qty"
          fill="#f97316"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
