"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <div className={clsx("stat-card flex items-start justify-between", className)}>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && (
          <p
            className={clsx("mt-1 text-sm", {
              "text-green-600": trend === "up",
              "text-red-600": trend === "down",
              "text-slate-500": trend === "neutral" || !trend,
            })}
          >
            {subtitle}
          </p>
        )}
      </div>
      {icon && <div className="text-brand-500 opacity-80">{icon}</div>}
    </div>
  );
}
