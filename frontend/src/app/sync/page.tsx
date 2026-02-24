"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import {
  triggerProductSync,
  triggerInventoryLogSync,
  triggerDailySync,
  getSyncLogs,
  type SyncLogEntry,
} from "@/lib/api";

export default function SyncPage() {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Inventory log sync params
  const [invlogStart, setInvlogStart] = useState("2024-01-01 00:00:00");
  const [invlogEnd, setInvlogEnd] = useState("2026-02-25 00:00:00");

  const loadLogs = async () => {
    try {
      setLogs(await getSyncLogs(30));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleInvlogSync = async () => {
    setSyncing("invlog");
    setMessage(null);
    try {
      const result = await triggerInventoryLogSync({
        startTime: invlogStart,
        endTime: invlogEnd,
      });
      setMessage({
        type: "success",
        text: result.message || "Inventory log sync started. Check logs below.",
      });
      loadLogs();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSyncing(null);
    }
  };

  const handleDailySync = async () => {
    setSyncing("daily");
    setMessage(null);
    try {
      const result = await triggerDailySync();
      setMessage({
        type: "success",
        text: result.message || "Daily sync started in background.",
      });
      loadLogs();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSyncing(null);
    }
  };

  const handleProductSync = async () => {
    setSyncing("products");
    setMessage(null);
    try {
      const result = await triggerProductSync();
      setMessage({
        type: "success",
        text: result.message || "Product sync started in background.",
      });
      loadLogs();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Data Sync</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pull data from WMS APIs into the local database
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ─── Sync Controls ─── */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Sync Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <h3 className="font-semibold text-slate-900 mb-2">
                📋 Inventory Logs
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Fetches all inbound/outbound movements via inventoryLog API.
                Max 6-month range per request.
              </p>
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Start (e.g. 2025-08-24 00:00:00)"
                  value={invlogStart}
                  onChange={(e) => setInvlogStart(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="text"
                  placeholder="End (e.g. 2025-09-24 00:00:00)"
                  value={invlogEnd}
                  onChange={(e) => setInvlogEnd(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                onClick={handleInvlogSync}
                disabled={syncing !== null}
                className="w-full bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {syncing === "invlog" ? "Syncing..." : "Sync Inventory Logs"}
              </button>
            </div>

            <div className="stat-card">
              <h3 className="font-semibold text-slate-900 mb-2">
                🔄 Daily Sync
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Fetches last 7 days of inventory logs + full product catalog.
                Runs automatically every day at 2:00 AM.
              </p>
              <button
                onClick={handleDailySync}
                disabled={syncing !== null}
                className="w-full bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {syncing === "daily" ? "Running..." : "Run Daily Sync Now"}
              </button>
            </div>

            <div className="stat-card">
              <h3 className="font-semibold text-slate-900 mb-2">
                🏷️ Product Catalog
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Sync product master data via getProductList API.
              </p>
              <button
                onClick={handleProductSync}
                disabled={syncing !== null}
                className="w-full bg-slate-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {syncing === "products" ? "Syncing..." : "Sync Products"}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Logs */}
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Sync History</h3>
            <button
              onClick={loadLogs}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-3 font-semibold text-slate-600">ID</th>
                  <th className="pb-3 font-semibold text-slate-600">Type</th>
                  <th className="pb-3 font-semibold text-slate-600">Status</th>
                  <th className="pb-3 font-semibold text-slate-600 text-right">Records</th>
                  <th className="pb-3 font-semibold text-slate-600">Started At</th>
                  <th className="pb-3 font-semibold text-slate-600">Finished At</th>
                  <th className="pb-3 font-semibold text-slate-600">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 text-slate-400">{log.id}</td>
                    <td className="py-2.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">
                        {log.sync_type}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.status === "success"
                            ? "bg-green-100 text-green-700"
                            : log.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">{log.records_synced}</td>
                    <td className="py-2.5 text-xs text-slate-500">{log.started_at}</td>
                    <td className="py-2.5 text-xs text-slate-500">{log.finished_at || "—"}</td>
                    <td className="py-2.5 text-xs text-red-500 max-w-xs truncate">
                      {log.error_message || "—"}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No sync history yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
