"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DateRangePicker } from "@/components/DateRangePicker";
import { WarehouseSelect } from "@/components/WarehouseSelect";
import { getInvlogSkus, type InvlogSkuData } from "@/lib/api";

export default function ProductsPage() {
  const defaults = (() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  })();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [sortBy, setSortBy] = useState("outbound_vol");
  const [customerCode, setCustomerCode] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [limit, setLimit] = useState(100);
  const [data, setData] = useState<InvlogSkuData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setData(
          await getInvlogSkus({
            dateFrom,
            dateTo,
            sortBy,
            customerCode: customerCode || undefined,
            warehouseId: warehouseId || undefined,
            limit,
          })
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateFrom, dateTo, sortBy, customerCode, warehouseId, limit]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">SKU Movement Analysis</h1>
            <p className="text-sm text-slate-500 mt-1">
              Per-SKU inbound/outbound movement from inventory logs
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
            <WarehouseSelect value={warehouseId} onChange={setWarehouseId} />
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              {[
                { key: "outbound_vol", label: "Out Vol" },
                { key: "inbound_vol", label: "In Vol" },
                { key: "outbound_qty", label: "Out Qty" },
                { key: "inbound_qty", label: "In Qty" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    sortBy === opt.key
                      ? "bg-white text-slate-900 shadow-sm font-medium"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={200}>Top 200</option>
              <option value={500}>Top 500</option>
            </select>
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
          <div className="chart-container">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              SKUs by {sortBy.includes("vol") ? "Volume (CBM)" : "Quantity"}{" "}
              <span className="text-sm font-normal text-slate-500">
                ({data.length} results)
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-3 font-semibold text-slate-600">#</th>
                    <th className="pb-3 font-semibold text-slate-600">SKU (Barcode)</th>
                    <th className="pb-3 font-semibold text-slate-600">Customer</th>
                    <th className="pb-3 font-semibold text-slate-600 text-right">Unit CBM</th>
                    <th className="pb-3 font-semibold text-slate-600 text-right">Out Vol (CBM)</th>
                    <th className="pb-3 font-semibold text-slate-600 text-right">In Vol (CBM)</th>
                    <th className="pb-3 font-semibold text-slate-600 text-right">Net Vol (CBM)</th>
                    <th className="pb-3 font-semibold text-slate-600 text-right">Out Qty</th>
                    <th className="pb-3 font-semibold text-slate-600 text-right">In Qty</th>
                    <th className="pb-3 font-semibold text-slate-600 text-right">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, i) => (
                    <tr key={`${d.product_barcode}-${d.customer_code}`} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 text-slate-400">{i + 1}</td>
                      <td className="py-2.5 font-mono text-xs">{d.product_barcode}</td>
                      <td className="py-2.5">
                        <span className="inline-block bg-brand-100 text-brand-700 px-2 py-0.5 rounded text-xs font-medium">
                          {d.customer_code}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-500">{d.unit_cbm?.toFixed(6) ?? "—"}</td>
                      <td className="py-2.5 text-right font-medium">{d.outbound_vol.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="py-2.5 text-right font-medium">{d.inbound_vol.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className={`py-2.5 text-right font-medium ${d.net_change_vol > 0 ? "text-green-600" : d.net_change_vol < 0 ? "text-red-600" : "text-slate-500"}`}>
                        {d.net_change_vol > 0 ? "+" : ""}{d.net_change_vol.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 text-right text-slate-500">{d.outbound_qty.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-slate-500">{d.inbound_qty.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-slate-500">{d.total_events.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
