"use client";

import type { ProductData } from "@/lib/api";

interface ProductTableProps {
  data: ProductData[];
}

export function ProductTable({ data }: ProductTableProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-slate-400">No product data</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="pb-3 font-semibold text-slate-600">#</th>
            <th className="pb-3 font-semibold text-slate-600">Barcode</th>
            <th className="pb-3 font-semibold text-slate-600">Reference</th>
            <th className="pb-3 font-semibold text-slate-600">Customer</th>
            <th className="pb-3 font-semibold text-slate-600">Dimensions (cm)</th>
            <th className="pb-3 font-semibold text-slate-600 text-right">Weight (kg)</th>
            <th className="pb-3 font-semibold text-slate-600 text-right">Volume (CBM)</th>
            <th className="pb-3 font-semibold text-slate-600 text-right">Value ($)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, i) => (
            <tr key={p.product_barcode} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2.5 text-slate-400">{i + 1}</td>
              <td className="py-2.5 font-mono text-xs">{p.product_barcode}</td>
              <td className="py-2.5 text-slate-600">{p.reference_no || "—"}</td>
              <td className="py-2.5">
                <span className="inline-block bg-brand-100 text-brand-700 px-2 py-0.5 rounded text-xs font-medium">
                  {p.customer_code}
                </span>
              </td>
              <td className="py-2.5 font-mono text-xs">{p.dimensions_cm}</td>
              <td className="py-2.5 text-right">{p.weight_kg?.toFixed(1)}</td>
              <td className="py-2.5 text-right font-medium">
                {p.volume_cbm ? p.volume_cbm.toFixed(4) : "—"}
              </td>
              <td className="py-2.5 text-right">{p.declared_value?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
