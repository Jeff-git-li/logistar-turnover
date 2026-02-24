"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/StatCard";
import { InvlogVolumeChart } from "@/components/InvlogVolumeChart";
import { InvlogTurnoverGauge } from "@/components/InvlogTurnoverGauge";
import { DateRangePicker } from "@/components/DateRangePicker";
import { WarehouseSelect } from "@/components/WarehouseSelect";
import {
  getInvlogDashboard,
  getInvlogVolume,
  getInvlogTurnover,
  getInvlogCustomers,
  type InvlogDashboardSummary,
  type InvlogVolumeData,
  type InvlogTurnoverData,
  type InvlogCustomerData,
} from "@/lib/api";

export default function DashboardPage() {
  const [dateFrom, setDateFrom] = useState("2025-08-24");
  const [dateTo, setDateTo] = useState("2025-09-24");
  const [granularity, setGranularity] = useState("day");
  const [warehouseId, setWarehouseId] = useState("");

  const [summary, setSummary] = useState<InvlogDashboardSummary | null>(null);
  const [volume, setVolume] = useState<InvlogVolumeData | null>(null);
  const [turnover, setTurnover] = useState<InvlogTurnoverData | null>(null);
  const [customers, setCustomers] = useState<InvlogCustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const wid = warehouseId || undefined;
        const [s, v, t, c] = await Promise.all([
          getInvlogDashboard({ dateFrom, dateTo, warehouseId: wid }),
          getInvlogVolume({ dateFrom, dateTo, granularity, warehouseId: wid }),
          getInvlogTurnover({ dateFrom, dateTo, warehouseId: wid }),
          getInvlogCustomers({ dateFrom, dateTo, warehouseId: wid }),
        ]);
        setSummary(s);
        setVolume(v);
        setTurnover(t);
        setCustomers(c);
      } catch (e: any) {
        setError(e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateFrom, dateTo, granularity, warehouseId]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Warehouse turnover overview & key metrics (from inventory logs)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <WarehouseSelect value={warehouseId} onChange={setWarehouseId} />
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(f, t) => {
                setDateFrom(f);
                setDateTo(t);
              }}
              granularity={granularity}
              onGranularityChange={setGranularity}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                  title="Outbound Events"
                  value={summary.outbound.total_events.toLocaleString()}
                  subtitle={`${summary.outbound.total_qty.toLocaleString()} units`}
                  icon={<span className="text-2xl">📤</span>}
                />
                <StatCard
                  title="Inbound Events"
                  value={summary.inbound.total_events.toLocaleString()}
                  subtitle={`${summary.inbound.total_qty.toLocaleString()} units`}
                  icon={<span className="text-2xl">📥</span>}
                />
                <StatCard
                  title="Active SKUs"
                  value={summary.active_skus.toLocaleString()}
                  subtitle={`of ${summary.total_products.toLocaleString()} total`}
                  icon={<span className="text-2xl">🏷️</span>}
                />
                <StatCard
                  title="Customers"
                  value={summary.unique_customers}
                  icon={<span className="text-2xl">👥</span>}
                />
                <StatCard
                  title="Warehouses"
                  value={summary.active_warehouses}
                  icon={<span className="text-2xl">🏭</span>}
                />
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Volume Chart */}
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Inbound vs Outbound Volume
                </h3>
                {volume && <InvlogVolumeChart data={volume} />}
              </div>

              {/* Turnover Rate */}
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Inventory Turnover Rate
                </h3>
                {turnover && <InvlogTurnoverGauge data={turnover} />}
              </div>
            </div>

            {/* Top Customers Table */}
            <div className="chart-container">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Top Customers by Outbound ({customers.length})
              </h3>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b text-left">
                      <th className="pb-2 font-semibold text-slate-600">Customer</th>
                      <th className="pb-2 font-semibold text-slate-600 text-right">Out Events</th>
                      <th className="pb-2 font-semibold text-slate-600 text-right">Out Qty</th>
                      <th className="pb-2 font-semibold text-slate-600 text-right">In Events</th>
                      <th className="pb-2 font-semibold text-slate-600 text-right">In Qty</th>
                      <th className="pb-2 font-semibold text-slate-600 text-right">SKUs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.slice(0, 15).map((c) => (
                      <tr key={c.customer_code} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2">
                          <span className="inline-block bg-brand-100 text-brand-700 px-2 py-0.5 rounded text-xs font-medium">
                            {c.customer_code}
                          </span>
                        </td>
                        <td className="py-2 text-right">{c.outbound_events.toLocaleString()}</td>
                        <td className="py-2 text-right">{c.outbound_qty.toLocaleString()}</td>
                        <td className="py-2 text-right">{c.inbound_events.toLocaleString()}</td>
                        <td className="py-2 text-right">{c.inbound_qty.toLocaleString()}</td>
                        <td className="py-2 text-right">{c.outbound_skus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
