/**
 * API client for the Logistar Turnover backend.
 * Proxied through Next.js rewrites → FastAPI at :8001
 */

const API_BASE = "/api";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ─── Inventory-Log Types ─────────────────────────────────────────────────────

export interface InvlogDashboardSummary {
  outbound: { total_events: number; total_qty: number; total_vol: number; unique_skus: number };
  inbound: { total_events: number; total_qty: number; total_vol: number; unique_skus: number };
  unique_customers: number;
  active_skus: number;
  total_products: number;
  active_warehouses: number;
}

export interface InvlogVolumeData {
  inbound: Array<{ period: string; event_count: number; total_qty: number; total_volume_cbm: number; unique_skus: number }>;
  outbound: Array<{ period: string; event_count: number; total_qty: number; total_volume_cbm: number; unique_skus: number }>;
}

export interface InvlogTurnoverData {
  total_inbound_qty: number;
  total_outbound_qty: number;
  total_inbound_vol: number;
  total_outbound_vol: number;
  beginning_inventory_vol: number;
  ending_inventory_vol: number;
  average_inventory_vol: number;
  turnover_rate: number;
  days_in_period: number | null;
}

export interface InvlogCustomerData {
  customer_code: string;
  inbound_events: number;
  inbound_qty: number;
  inbound_vol: number;
  inbound_skus: number;
  outbound_events: number;
  outbound_qty: number;
  outbound_vol: number;
  outbound_skus: number;
}

export interface InvlogSkuData {
  product_barcode: string;
  customer_code: string;
  inbound_qty: number;
  outbound_qty: number;
  inbound_vol: number;
  outbound_vol: number;
  net_change_vol: number;
  total_events: number;
  unit_cbm: number;
}

export interface InvlogWarehouseData {
  warehouse_id: string;
  warehouse_name: string;
  timezone: string;
  inbound_events: number;
  inbound_qty: number;
  inbound_vol: number;
  outbound_events: number;
  outbound_qty: number;
  outbound_vol: number;
  unique_skus: number;
  unique_customers: number;
  total_capacity_cbm: number;
}

export interface WarehouseCapacity {
  warehouse_id: string;
  warehouse_name: string;
  total_capacity_cbm: number;
}

export interface SyncLogEntry {
  id: number;
  sync_type: string;
  status: string;
  records_synced: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
}

// ─── Query params helper ─────────────────────────────────────────────────────

function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

// ─── Warehouse Map ───────────────────────────────────────────────────────────

export const WAREHOUSES = [
  { id: "13", name: "Ontario, CA" },
  { id: "5", name: "New York, NY" },
  { id: "3", name: "Rialto, CA (WH3)" },
  { id: "15", name: "Rialto, CA (WH15)" },
] as const;

// ─── Inventory-Log API Functions (primary) ───────────────────────────────────

export async function getInvlogDashboard(params: {
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
}): Promise<InvlogDashboardSummary> {
  return fetchJSON(
    `/analytics/invlog/dashboard${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      warehouse_id: params.warehouseId,
    })}`
  );
}

export async function getInvlogVolume(params: {
  dateFrom?: string;
  dateTo?: string;
  granularity?: string;
  warehouseId?: string;
  customerCode?: string;
}): Promise<InvlogVolumeData> {
  return fetchJSON(
    `/analytics/invlog/volume${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      granularity: params.granularity,
      warehouse_id: params.warehouseId,
      customer_code: params.customerCode,
    })}`
  );
}

export async function getInvlogTurnover(params: {
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
  customerCode?: string;
}): Promise<InvlogTurnoverData> {
  return fetchJSON(
    `/analytics/invlog/turnover${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      warehouse_id: params.warehouseId,
      customer_code: params.customerCode,
    })}`
  );
}

export async function getInvlogCustomers(params: {
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
}): Promise<InvlogCustomerData[]> {
  return fetchJSON(
    `/analytics/invlog/customers${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      warehouse_id: params.warehouseId,
    })}`
  );
}

export async function getInvlogSkus(params: {
  dateFrom?: string;
  dateTo?: string;
  warehouseId?: string;
  customerCode?: string;
  sortBy?: string;
  limit?: number;
}): Promise<InvlogSkuData[]> {
  return fetchJSON(
    `/analytics/invlog/skus${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      warehouse_id: params.warehouseId,
      customer_code: params.customerCode,
      sort_by: params.sortBy,
      limit: params.limit,
    })}`
  );
}

export async function getInvlogWarehouses(params: {
  dateFrom?: string;
  dateTo?: string;
  customerCode?: string;
}): Promise<InvlogWarehouseData[]> {
  return fetchJSON(
    `/analytics/invlog/warehouses${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      customer_code: params.customerCode,
    })}`
  );
}

// ─── Sync Functions ──────────────────────────────────────────────────────────

export async function triggerProductSync(): Promise<{ status: string; message?: string }> {
  return fetchJSON("/sync/products", { method: "POST" });
}

export async function triggerInventoryLogSync(params: {
  startTime: string;
  endTime: string;
  warehouseId?: string;
  customerCode?: string;
}): Promise<{ status: string; message: string }> {
  return fetchJSON(
    `/sync/inventory-logs${qs({
      start_time: params.startTime,
      end_time: params.endTime,
      warehouse_id: params.warehouseId,
      customer_code: params.customerCode,
    })}`,
    { method: "POST" }
  );
}

export async function triggerDailySync(): Promise<{ status: string; message: string }> {
  return fetchJSON("/sync/daily", { method: "POST" });
}

export async function getSyncLogs(limit = 20): Promise<SyncLogEntry[]> {
  return fetchJSON(`/sync/logs?limit=${limit}`);
}

// ─── Warehouse Capacity ──────────────────────────────────────────────────────

export async function getWarehouseCapacities(): Promise<WarehouseCapacity[]> {
  return fetchJSON("/warehouses/capacities");
}

export async function setWarehouseCapacity(params: {
  warehouseId: string;
  totalCapacityCbm: number;
}): Promise<WarehouseCapacity> {
  return fetchJSON("/warehouses/capacities", {
    method: "PUT",
    body: JSON.stringify({
      warehouse_id: params.warehouseId,
      total_capacity_cbm: params.totalCapacityCbm,
    }),
  });
}
