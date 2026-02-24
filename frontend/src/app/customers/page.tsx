"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CustomerChart } from "@/components/CustomerChart";
import { CBMPieChart } from "@/components/CBMPieChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import { getCustomerBreakdown, type CustomerData } from "@/lib/api";

export default function CustomersPage() {
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState("2026-02-23");
  const [data, setData] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setData(await getCustomerBreakdown({ dateFrom, dateTo }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateFrom, dateTo]);

  const totalOutbound = data.reduce((s, d) => s + d.outbound_parcels, 0);
  const totalInbound = data.reduce((s, d) => s + d.inbound_qty, 0);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Customer Breakdown</h1>
            <p className="text-sm text-slate-500 mt-1">
              Per-customer inbound & outbound analysis
            </p>
          </div>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
            }}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Customer Volumes
                </h3>
                <CustomerChart data={data} />
              </div>
              <div className="chart-container">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Outbound CBM Share
                </h3>
                <CBMPieChart data={data} />
              </div>
            </div>

            {/* Table */}
            <div className="chart-container">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Customer Details ({data.length} customers)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-3 font-semibold text-slate-600">Customer</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">Outbound Orders</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">Outbound Parcels</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">Outbound CBM</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">Outbound Weight (kg)</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">Inbound Receivings</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">Inbound Qty</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">% of Total Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d) => (
                      <tr key={d.customer_code} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5">
                          <span className="inline-block bg-brand-100 text-brand-700 px-2 py-0.5 rounded text-xs font-medium">
                            {d.customer_code}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">{d.outbound_orders.toLocaleString()}</td>
                        <td className="py-2.5 text-right">{d.outbound_parcels.toLocaleString()}</td>
                        <td className="py-2.5 text-right">{d.outbound_cbm.toFixed(4)}</td>
                        <td className="py-2.5 text-right">{d.outbound_weight_kg.toFixed(1)}</td>
                        <td className="py-2.5 text-right">{d.inbound_receivings.toLocaleString()}</td>
                        <td className="py-2.5 text-right">{d.inbound_qty.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-slate-500">
                          {totalOutbound > 0
                            ? ((d.outbound_parcels / totalOutbound) * 100).toFixed(1) + "%"
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-semibold">
                      <td className="py-2.5">Total</td>
                      <td className="py-2.5 text-right">{data.reduce((s, d) => s + d.outbound_orders, 0).toLocaleString()}</td>
                      <td className="py-2.5 text-right">{totalOutbound.toLocaleString()}</td>
                      <td className="py-2.5 text-right">{data.reduce((s, d) => s + d.outbound_cbm, 0).toFixed(4)}</td>
                      <td className="py-2.5 text-right">{data.reduce((s, d) => s + d.outbound_weight_kg, 0).toFixed(1)}</td>
                      <td className="py-2.5 text-right">{data.reduce((s, d) => s + d.inbound_receivings, 0).toLocaleString()}</td>
                      <td className="py-2.5 text-right">{totalInbound.toLocaleString()}</td>
                      <td className="py-2.5 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
