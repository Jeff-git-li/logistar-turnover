"use client";

import type { TurnoverData } from "@/lib/api";

interface TurnoverGaugeProps {
  data: TurnoverData;
}

export function TurnoverGauge({ data }: TurnoverGaugeProps) {
  const rate = data.turnover_rate;
  // Visual gauge: normalize to 0-100% where 10x = 100%
  const pct = Math.min(100, (rate / 10) * 100);

  const getColor = (rate: number) => {
    if (rate >= 6) return "bg-green-500";
    if (rate >= 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getLabel = (rate: number) => {
    if (rate >= 6) return "High Turnover";
    if (rate >= 3) return "Moderate Turnover";
    return "Low Turnover";
  };

  return (
    <div className="space-y-6">
      {/* Main gauge */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-4xl font-bold text-slate-900">{rate.toFixed(2)}x</span>
          <span className="text-sm font-medium text-slate-500">{getLabel(rate)}</span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${getColor(rate)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0x</span>
          <span>5x</span>
          <span>10x</span>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Total Inbound</p>
          <p className="text-lg font-bold text-blue-900">{data.total_inbound_qty.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <p className="text-xs text-orange-600 font-medium">Total Outbound</p>
          <p className="text-lg font-bold text-orange-900">{data.total_outbound_qty.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-xs text-slate-600 font-medium">Avg Inventory</p>
          <p className="text-lg font-bold text-slate-900">{data.average_inventory.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium">Outbound CBM</p>
          <p className="text-lg font-bold text-green-900">{data.outbound_cbm.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-xs text-purple-600 font-medium">Beginning Inv</p>
          <p className="text-lg font-bold text-purple-900">{data.beginning_inventory.toLocaleString()}</p>
        </div>
        <div className="bg-pink-50 rounded-lg p-3">
          <p className="text-xs text-pink-600 font-medium">Ending Inv</p>
          <p className="text-lg font-bold text-pink-900">{data.ending_inventory.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
