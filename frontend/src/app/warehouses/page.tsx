"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  getInvlogWarehouses,
  getWarehouseCapacities,
  setWarehouseCapacity,
  type InvlogWarehouseData,
  type WarehouseCapacity,
} from "@/lib/api";
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
  const defaults = (() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  })();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [customerCode, setCustomerCode] = useState("");
  const [data, setData] = useState<InvlogWarehouseData[]>([]);
  const [capacities, setCapacities] = useState<WarehouseCapacity[]>([]);
  const [editingCap, setEditingCap] = useState<Record<string, string>>({});
  const [savingCap, setSavingCap] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [whData, capData] = await Promise.all([
          getInvlogWarehouses({
            dateFrom,
            dateTo,
            customerCode: customerCode || undefined,
          }),
          getWarehouseCapacities(),
        ]);
        setData(whData);
        setCapacities(capData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateFrom, dateTo, customerCode]);

  const getCapacity = (whId: string) =>
    capacities.find((c) => c.warehouse_id === whId)?.total_capacity_cbm ?? 0;

  const handleSaveCapacity = async (whId: string) => {
    const val = parseFloat(editingCap[whId] ?? "");
    if (isNaN(val) || val < 0) return;
    setSavingCap(whId);
    try {
      await setWarehouseCapacity({ warehouseId: whId, totalCapacityCbm: val });
      setCapacities((prev) => {
        const idx = prev.findIndex((c) => c.warehouse_id === whId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], total_capacity_cbm: val };
          return updated;
        }
        return [...prev, { warehouse_id: whId, warehouse_name: "", total_capacity_cbm: val }];
      });
      setEditingCap((prev) => {
        const copy = { ...prev };
        delete copy[whId];
        return copy;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCap(null);
    }
  };

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
              Compare volume (CBM), capacity & utilization across warehouses
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
            {/* Bar chart comparing warehouses by volume */}
            <div className="chart-container mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Volume Comparison (CBM)
              </h3>
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={data.map((d) => ({
                      name: d.warehouse_name,
                      inbound: d.inbound_vol,
                      outbound: d.outbound_vol,
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toLocaleString()}`} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                      formatter={(value: number, name: string) => [
                        `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} CBM`,
                        name,
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="inbound"
                      name="Inbound Vol (CBM)"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="outbound"
                      name="Outbound Vol (CBM)"
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

            {/* Warehouse cards with capacity & utilization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.map((wh) => {
                const cap = wh.total_capacity_cbm || getCapacity(wh.warehouse_id);
                const netInventory = wh.inbound_vol - wh.outbound_vol;
                const utilPct = cap > 0 ? Math.min(100, Math.max(0, (netInventory / cap) * 100)) : 0;
                const isEditing = wh.warehouse_id in editingCap;

                return (
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

                    {/* Volume stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-orange-50 rounded-lg p-3">
                        <p className="text-xs text-orange-600 font-medium">
                          Outbound Volume
                        </p>
                        <p className="text-xl font-bold text-orange-900">
                          {wh.outbound_vol.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </p>
                        <p className="text-xs text-orange-600 mt-0.5">
                          CBM &middot; {wh.outbound_qty.toLocaleString()} units
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-medium">
                          Inbound Volume
                        </p>
                        <p className="text-xl font-bold text-blue-900">
                          {wh.inbound_vol.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          CBM &middot; {wh.inbound_qty.toLocaleString()} units
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

                    {/* Capacity & Utilization */}
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          Capacity &amp; Utilization
                        </span>
                        {!isEditing ? (
                          <button
                            onClick={() =>
                              setEditingCap((prev) => ({
                                ...prev,
                                [wh.warehouse_id]: String(cap || ""),
                              }))
                            }
                            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                          >
                            Edit Capacity
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={editingCap[wh.warehouse_id]}
                              onChange={(e) =>
                                setEditingCap((prev) => ({
                                  ...prev,
                                  [wh.warehouse_id]: e.target.value,
                                }))
                              }
                              className="border border-slate-200 rounded px-2 py-1 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-brand-500"
                              placeholder="CBM"
                            />
                            <button
                              onClick={() => handleSaveCapacity(wh.warehouse_id)}
                              disabled={savingCap === wh.warehouse_id}
                              className="px-2 py-1 bg-brand-600 text-white rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-50"
                            >
                              {savingCap === wh.warehouse_id ? "..." : "Save"}
                            </button>
                            <button
                              onClick={() =>
                                setEditingCap((prev) => {
                                  const copy = { ...prev };
                                  delete copy[wh.warehouse_id];
                                  return copy;
                                })
                              }
                              className="px-2 py-1 text-slate-500 rounded text-xs hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {cap > 0 ? (
                        <>
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-xs text-slate-500">
                              Net inventory: {netInventory.toLocaleString(undefined, { maximumFractionDigits: 1 })} CBM
                            </span>
                            <span className="text-xs text-slate-500">
                              Capacity: {cap.toLocaleString(undefined, { maximumFractionDigits: 0 })} CBM
                            </span>
                          </div>
                          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                utilPct >= 90
                                  ? "bg-red-500"
                                  : utilPct >= 70
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${utilPct}%` }}
                            />
                          </div>
                          <p className="text-right text-xs font-medium mt-1 text-slate-600">
                            {utilPct.toFixed(1)}% utilized
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Set capacity to see utilization
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
