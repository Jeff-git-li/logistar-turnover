"use client";

import { useEffect, useState, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import {
  triggerSync,
  uploadExcel,
  getSyncLogs,
  type SyncLogEntry,
} from "@/lib/api";

export default function SyncPage() {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadLogs = async () => {
    try {
      setLogs(await getSyncLogs(30));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleSync = async (type: "outbound" | "inbound" | "products") => {
    setSyncing(type);
    setMessage(null);
    try {
      const result = await triggerSync(type);
      if (result.status === "started") {
        setMessage({
          type: "success",
          text: result.message || `${type} sync started in background. Logs will refresh automatically.`,
        });
        // Auto-refresh logs every 5 seconds while sync is running
        const interval = setInterval(async () => {
          const logs = await getSyncLogs(30);
          setLogs(logs);
          const latest = logs.find((l: any) => l.sync_type === (type === "products" ? "product" : type));
          if (latest && latest.status !== "running") {
            clearInterval(interval);
            setMessage({
              type: latest.status === "success" ? "success" : "error",
              text: latest.status === "success"
                ? `Synced ${latest.records_synced} ${type} records`
                : `Sync failed: ${latest.error_message || "Unknown error"}`,
            });
          }
        }, 5000);
      } else {
        setMessage({
          type: "success",
          text: `Synced ${result.records_synced} ${type} records`,
        });
      }
      loadLogs();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSyncing(null);
    }
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setSyncing("excel");
    setMessage(null);
    try {
      const result = await uploadExcel(file);
      setMessage({
        type: "success",
        text: `Imported ${result.records_imported} records from ${result.filename}`,
      });
      loadLogs();
      if (fileRef.current) fileRef.current.value = "";
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
            Pull data from WMS APIs or import exported Excel files
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

        {/* Sync Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <h3 className="font-semibold text-slate-900 mb-2">📤 Outbound Orders</h3>
            <p className="text-sm text-slate-500 mb-4">
              Sync dropshipping orders via getOrderList API
            </p>
            <button
              onClick={() => handleSync("outbound")}
              disabled={syncing !== null}
              className="w-full bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {syncing === "outbound" ? "Syncing..." : "Sync Outbound"}
            </button>
          </div>

          <div className="stat-card">
            <h3 className="font-semibold text-slate-900 mb-2">📥 Inbound Receivings</h3>
            <p className="text-sm text-slate-500 mb-4">
              Sync receivings via getReceivingListForYB API
            </p>
            <button
              onClick={() => handleSync("inbound")}
              disabled={syncing !== null}
              className="w-full bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {syncing === "inbound" ? "Syncing..." : "Sync Inbound"}
            </button>
          </div>

          <div className="stat-card">
            <h3 className="font-semibold text-slate-900 mb-2">🏷️ Product Catalog</h3>
            <p className="text-sm text-slate-500 mb-4">
              Sync products via getProductList API
            </p>
            <button
              onClick={() => handleSync("products")}
              disabled={syncing !== null}
              className="w-full bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {syncing === "products" ? "Syncing..." : "Sync Products"}
            </button>
          </div>

          <div className="stat-card">
            <h3 className="font-semibold text-slate-900 mb-2">📑 Excel Import</h3>
            <p className="text-sm text-slate-500 mb-4">
              Upload exported WMS Excel files (.xlsx)
            </p>
            <input
              type="file"
              ref={fileRef}
              accept=".xlsx,.xls"
              className="w-full text-sm mb-2 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            <button
              onClick={handleUpload}
              disabled={syncing !== null}
              className="w-full bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {syncing === "excel" ? "Importing..." : "Import Excel"}
            </button>
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
