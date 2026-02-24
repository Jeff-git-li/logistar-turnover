"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { VolumeChart } from "@/components/VolumeChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import { getInboundOutbound, type InboundOutboundData } from "@/lib/api";

export default function VolumePage() {
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState("2026-02-23");
  const [granularity, setGranularity] = useState("month");
  const [customerCode, setCustomerCode] = useState("");
  const [data, setData] = useState<InboundOutboundData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getInboundOutbound({
          dateFrom,
          dateTo,
          granularity,
          customerCode: customerCode || undefined,
        });
        setData(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateFrom, dateTo, granularity, customerCode]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inbound / Outbound Volume</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track shipment volumes over time
            </p>
          </div>
          <div className="flex items-center gap-4">
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
              granularity={granularity}
              onGranularityChange={setGranularity}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main chart */}
            <div className="chart-container">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Volume Over Time
              </h3>
              {data && <VolumeChart outbound={data.outbound} inbound={data.inbound} />}
            </div>

            {/* Data tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Outbound Details</h3>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b text-left">
                        <th className="pb-2 font-semibold text-slate-600">Period</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Orders</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Parcels</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">CBM</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Weight (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.outbound.map((r) => (
                        <tr key={r.period} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2">{r.period}</td>
                          <td className="py-2 text-right">{r.order_count}</td>
                          <td className="py-2 text-right">{r.parcel_count}</td>
                          <td className="py-2 text-right">{r.total_cbm.toFixed(4)}</td>
                          <td className="py-2 text-right">{r.total_weight_kg.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="chart-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Inbound Details</h3>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b text-left">
                        <th className="pb-2 font-semibold text-slate-600">Period</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Receivings</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Received Qty</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Shelved Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.inbound.map((r) => (
                        <tr key={r.period} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2">{r.period}</td>
                          <td className="py-2 text-right">{r.receiving_count}</td>
                          <td className="py-2 text-right">{r.total_received_qty}</td>
                          <td className="py-2 text-right">{r.total_shelved_qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
