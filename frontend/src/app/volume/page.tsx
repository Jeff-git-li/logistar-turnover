"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { InvlogVolumeChart } from "@/components/InvlogVolumeChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import { WarehouseSelect } from "@/components/WarehouseSelect";
import { getInvlogVolume, type InvlogVolumeData } from "@/lib/api";

export default function VolumePage() {
  const defaults = (() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  })();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [granularity, setGranularity] = useState("day");
  const [customerCode, setCustomerCode] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [data, setData] = useState<InvlogVolumeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getInvlogVolume({
          dateFrom,
          dateTo,
          granularity,
          customerCode: customerCode || undefined,
          warehouseId: warehouseId || undefined,
        });
        setData(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateFrom, dateTo, granularity, customerCode, warehouseId]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Inbound / Outbound Volume
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track inventory movement volume (CBM) over time
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
              {data && <InvlogVolumeChart data={data} />}
            </div>

            {/* Data tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Outbound Details
                </h3>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b text-left">
                        <th className="pb-2 font-semibold text-slate-600">Period</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Volume (CBM)</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Quantity</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Events</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">SKUs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.outbound.map((r) => (
                        <tr key={r.period} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2">{r.period}</td>
                          <td className="py-2 text-right font-medium">{r.total_volume_cbm.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="py-2 text-right">{r.total_qty.toLocaleString()}</td>
                          <td className="py-2 text-right text-slate-500">{r.event_count.toLocaleString()}</td>
                          <td className="py-2 text-right">{r.unique_skus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="chart-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Inbound Details
                </h3>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b text-left">
                        <th className="pb-2 font-semibold text-slate-600">Period</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Volume (CBM)</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Quantity</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">Events</th>
                        <th className="pb-2 font-semibold text-slate-600 text-right">SKUs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.inbound.map((r) => (
                        <tr key={r.period} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2">{r.period}</td>
                          <td className="py-2 text-right font-medium">{r.total_volume_cbm.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="py-2 text-right">{r.total_qty.toLocaleString()}</td>
                          <td className="py-2 text-right text-slate-500">{r.event_count.toLocaleString()}</td>
                          <td className="py-2 text-right">{r.unique_skus}</td>
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
