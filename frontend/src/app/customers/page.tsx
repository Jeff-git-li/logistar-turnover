"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { InvlogCustomerChart } from "@/components/InvlogCustomerChart";
import { DateRangePicker } from "@/components/DateRangePicker";
import { WarehouseSelect } from "@/components/WarehouseSelect";
import { getInvlogCustomers, type InvlogCustomerData } from "@/lib/api";

export default function CustomersPage() {
  const [dateFrom, setDateFrom] = useState("2025-08-24");
  const [dateTo, setDateTo] = useState("2025-09-24");
  const [warehouseId, setWarehouseId] = useState("");
  const [data, setData] = useState<InvlogCustomerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setData(
          await getInvlogCustomers({
            dateFrom,
            dateTo,
            warehouseId: warehouseId || undefined,
          })
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateFrom, dateTo, warehouseId]);

  const totalOutbound = data.reduce((s, d) => s + d.outbound_qty, 0);
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
          <div className="flex items-center gap-3">
            <WarehouseSelect value={warehouseId} onChange={setWarehouseId} />
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
            {/* Chart */}
            <div className="chart-container mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Customer Volumes (Top 15)
              </h3>
              <InvlogCustomerChart data={data} />
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
                      <th className="pb-3 font-semibold text-slate-600 text-right">Out Events</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">Out Qty</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">Out SKUs</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">In Events</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">In Qty</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">In SKUs</th>
                      <th className="pb-3 font-semibold text-slate-600 text-right">% of Out</th>
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
                        <td className="py-2.5 text-right">{d.outbound_events.toLocaleString()}</td>
                        <td className="py-2.5 text-right">{d.outbound_qty.toLocaleString()}</td>
                        <td className="py-2.5 text-right">{d.outbound_skus}</td>
                        <td className="py-2.5 text-right">{d.inbound_events.toLocaleString()}</td>
                        <td className="py-2.5 text-right">{d.inbound_qty.toLocaleString()}</td>
                        <td className="py-2.5 text-right">{d.inbound_skus}</td>
                        <td className="py-2.5 text-right text-slate-500">
                          {totalOutbound > 0
                            ? ((d.outbound_qty / totalOutbound) * 100).toFixed(1) + "%"
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-semibold">
                      <td className="py-2.5">Total</td>
                      <td className="py-2.5 text-right">{data.reduce((s, d) => s + d.outbound_events, 0).toLocaleString()}</td>
                      <td className="py-2.5 text-right">{totalOutbound.toLocaleString()}</td>
                      <td className="py-2.5 text-right">—</td>
                      <td className="py-2.5 text-right">{data.reduce((s, d) => s + d.inbound_events, 0).toLocaleString()}</td>
                      <td className="py-2.5 text-right">{totalInbound.toLocaleString()}</td>
                      <td className="py-2.5 text-right">—</td>
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
