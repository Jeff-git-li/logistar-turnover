"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ProductTable } from "@/components/ProductTable";
import { getProductAnalysis, type ProductData } from "@/lib/api";

export default function ProductsPage() {
  const [sortBy, setSortBy] = useState("volume_cbm");
  const [customerCode, setCustomerCode] = useState("");
  const [limit, setLimit] = useState(50);
  const [data, setData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setData(
          await getProductAnalysis({
            sortBy,
            customerCode: customerCode || undefined,
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
  }, [sortBy, customerCode, limit]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Product / SKU Analysis</h1>
            <p className="text-sm text-slate-500 mt-1">
              Volume, weight, and value rankings
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
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              {[
                { key: "volume_cbm", label: "Volume" },
                { key: "weight", label: "Weight" },
                { key: "value", label: "Value" },
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
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={200}>Top 200</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="chart-container">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Products by {sortBy === "volume_cbm" ? "Volume (CBM)" : sortBy === "weight" ? "Weight" : "Declared Value"}{" "}
              <span className="text-sm font-normal text-slate-500">({data.length} results)</span>
            </h3>
            <ProductTable data={data} />
          </div>
        )}
      </main>
    </div>
  );
}
