"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DateRangePicker } from "@/components/DateRangePicker";
import { getInvlogWarehouses, type InvlogWarehouseData } from "@/lib/api";
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

export default function WarehousesPage() {
  const [dateFrom, setDateFrom] = useState("2025-08-24");
  const [dateTo, setDateTo] = useState("2025-09-24");
  const [customerCode, setCustomerCode] = useState("");
  const [data, setData] = useState<InvlogWarehouseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setData(
          await getInvlogWarehouses({
            dateFrom,
            dateTo,
            customerCode: customerCode || undefined,
          })
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateFrom, dateTo, customerCode]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Warehouse Comparison
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Compare inbound/outbound across warehouses
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Customer code..."
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(f, t) => {
                setDateFrom(f);
                setDateTo(t);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Bar chart comparing warehouses */}
            <div className="chart-container mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Quantity Comparison
              </h3>
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={data.map((d) => ({
                      name: d.warehouse_name,
                      inbound: d.inbound_qty,
                      outbound: d.outbound_qty,
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
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
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-400">
                  No data available
                </div>
              )}
            </div>

            {/* Warehouse cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.map((wh) => (
                <div key={wh.warehouse_id} className="chart-container">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {wh.warehouse_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        WH #{wh.warehouse_id} &middot; {wh.timezone}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-xs text-orange-600 font-medium">
                        Outbound Events
                      </p>
                      <p className="text-xl font-bold text-orange-900">
                        {wh.outbound_events.toLocaleString()}
                      </p>
                      <p className="text-xs text-orange-600 mt-0.5">
                        {wh.outbound_qty.toLocaleString()} units
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-600 font-medium">
                        Inbound Events
                      </p>
                      <p className="text-xl font-bold text-blue-900">
                        {wh.inbound_events.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        {wh.inbound_qty.toLocaleString()} units
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 font-medium">
                        Unique SKUs
                      </p>
                      <p className="text-xl font-bold text-slate-900">
                        {wh.unique_skus.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-600 font-medium">
                        Customers
                      </p>
                      <p className="text-xl font-bold text-green-900">
                        {wh.unique_customers.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
