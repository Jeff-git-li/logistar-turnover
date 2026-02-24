"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/StatCard";
import { VolumeChart } from "@/components/VolumeChart";
import { TurnoverGauge } from "@/components/TurnoverGauge";
import { CBMPieChart } from "@/components/CBMPieChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  getDashboardSummary,
  getInboundOutbound,
  getTurnover,
  getCustomerBreakdown,
  type DashboardSummary,
  type InboundOutboundData,
  type TurnoverData,
  type CustomerData,
} from "@/lib/api";

export default function DashboardPage() {
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState("2026-02-23");
  const [granularity, setGranularity] = useState("month");

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [volume, setVolume] = useState<InboundOutboundData | null>(null);
  const [turnover, setTurnover] = useState<TurnoverData | null>(null);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [s, v, t, c] = await Promise.all([
          getDashboardSummary(dateFrom, dateTo),
          getInboundOutbound({ dateFrom, dateTo, granularity }),
          getTurnover({ dateFrom, dateTo }),
          getCustomerBreakdown({ dateFrom, dateTo }),
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
  }, [dateFrom, dateTo, granularity]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Warehouse turnover overview & key metrics
            </p>
          </div>
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
                  title="Outbound Orders"
                  value={summary.outbound.total_orders.toLocaleString()}
                  subtitle={`${summary.outbound.total_parcels.toLocaleString()} parcels`}
                  icon={<span className="text-2xl">📤</span>}
                />
                <StatCard
                  title="Inbound Receivings"
                  value={summary.inbound.total_receivings.toLocaleString()}
                  subtitle={`${summary.inbound.total_received_qty.toLocaleString()} units`}
                  icon={<span className="text-2xl">📥</span>}
                />
                <StatCard
                  title="Outbound CBM"
                  value={summary.outbound.total_cbm.toFixed(2)}
                  subtitle={`${summary.outbound.total_weight_kg.toFixed(0)} kg`}
                  icon={<span className="text-2xl">📐</span>}
                />
                <StatCard
                  title="Customers"
                  value={summary.unique_customers}
                  subtitle={`${summary.countries_served} countries`}
                  icon={<span className="text-2xl">👥</span>}
                />
                <StatCard
                  title="Products"
                  value={summary.total_products.toLocaleString()}
                  icon={<span className="text-2xl">🏷️</span>}
                />
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Inbound vs Outbound Volume */}
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Inbound vs Outbound Volume
                </h3>
                {volume && (
                  <VolumeChart outbound={volume.outbound} inbound={volume.inbound} />
                )}
              </div>

              {/* Turnover Rate */}
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Inventory Turnover Rate
                </h3>
                {turnover && <TurnoverGauge data={turnover} />}
              </div>
            </div>

            {/* CBM Pie Chart */}
            <div className="chart-container">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Outbound CBM by Customer
              </h3>
              <CBMPieChart data={customers} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
