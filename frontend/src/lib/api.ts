/**
 * API client for the Logistar Turnover backend.
 * Proxied through Next.js rewrites → FastAPI at :8000
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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  outbound: {
    total_orders: number;
    total_parcels: number;
    total_cbm: number;
    total_weight_kg: number;
  };
  inbound: {
    total_receivings: number;
    total_received_qty: number;
  };
  unique_customers: number;
  total_products: number;
  countries_served: number;
}

export interface InboundOutboundData {
  outbound: Array<{
    period: string;
    order_count: number;
    parcel_count: number;
    total_cbm: number;
    total_weight_kg: number;
  }>;
  inbound: Array<{
    period: string;
    receiving_count: number;
    total_received_qty: number;
    total_shelved_qty: number;
  }>;
}

export interface TurnoverData {
  total_inbound_qty: number;
  total_outbound_qty: number;
  outbound_cbm: number;
  beginning_inventory: number;
  ending_inventory: number;
  average_inventory: number;
  turnover_rate: number;
  days_in_period: number | null;
}

export interface CustomerData {
  customer_code: string;
  outbound_orders: number;
  outbound_parcels: number;
  outbound_cbm: number;
  outbound_weight_kg: number;
  inbound_receivings: number;
  inbound_qty: number;
}

export interface ProductData {
  product_barcode: string;
  reference_no: string;
  customer_code: string;
  dimensions_cm: string;
  weight_kg: number;
  volume_cbm: number | null;
  declared_value: number;
}

export interface WarehouseUtilization {
  total_product_catalog_cbm: number;
  total_outbound_cbm: number;
  daily_outbound_cbm: Record<string, number>;
}

export interface FeeData {
  customer_code: string;
  order_count: number;
  total_fees_usd: number;
  shipping_fees_usd: number;
  operation_fees_usd: number;
  fuel_fees_usd: number;
  packaging_fees_usd: number;
  oversize_fees_usd: number;
  remote_fees_usd: number;
  super_remote_fees_usd: number;
  residential_fees_usd: number;
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

// ─── API Functions ───────────────────────────────────────────────────────────

export async function getDashboardSummary(
  dateFrom?: string,
  dateTo?: string
): Promise<DashboardSummary> {
  return fetchJSON(`/analytics/dashboard${qs({ date_from: dateFrom, date_to: dateTo })}`);
}

export async function getInboundOutbound(params: {
  dateFrom?: string;
  dateTo?: string;
  granularity?: string;
  warehouseCode?: string;
  customerCode?: string;
}): Promise<InboundOutboundData> {
  return fetchJSON(
    `/analytics/inbound-outbound${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      granularity: params.granularity,
      warehouse_code: params.warehouseCode,
      customer_code: params.customerCode,
    })}`
  );
}

export async function getTurnover(params: {
  dateFrom?: string;
  dateTo?: string;
  warehouseCode?: string;
  customerCode?: string;
}): Promise<TurnoverData> {
  return fetchJSON(
    `/analytics/turnover${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      warehouse_code: params.warehouseCode,
      customer_code: params.customerCode,
    })}`
  );
}

export async function getCustomerBreakdown(params: {
  dateFrom?: string;
  dateTo?: string;
  warehouseCode?: string;
}): Promise<CustomerData[]> {
  return fetchJSON(
    `/analytics/customers${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      warehouse_code: params.warehouseCode,
    })}`
  );
}

export async function getProductAnalysis(params: {
  customerCode?: string;
  sortBy?: string;
  limit?: number;
}): Promise<ProductData[]> {
  return fetchJSON(
    `/analytics/products${qs({
      customer_code: params.customerCode,
      sort_by: params.sortBy,
      limit: params.limit,
    })}`
  );
}

export async function getWarehouseUtilization(params: {
  dateFrom?: string;
  dateTo?: string;
  granularity?: string;
}): Promise<WarehouseUtilization> {
  return fetchJSON(
    `/analytics/warehouse-utilization${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      granularity: params.granularity,
    })}`
  );
}

export async function getFeeAnalysis(params: {
  dateFrom?: string;
  dateTo?: string;
  customerCode?: string;
}): Promise<FeeData[]> {
  return fetchJSON(
    `/analytics/fees${qs({
      date_from: params.dateFrom,
      date_to: params.dateTo,
      customer_code: params.customerCode,
    })}`
  );
}

export async function triggerSync(type: "outbound" | "inbound" | "products"): Promise<{ status: string; message?: string; records_synced?: number }> {
  return fetchJSON(`/sync/${type}`, { method: "POST" });
}

export async function uploadExcel(file: File, replaceExisting = false): Promise<{ status: string; filename: string; records_imported: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `${API_BASE}/sync/excel-upload?replace_existing=${replaceExisting}`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error(`Upload error: ${await res.text()}`);
  return res.json();
}

export async function getSyncLogs(limit = 20): Promise<SyncLogEntry[]> {
  return fetchJSON(`/sync/logs?limit=${limit}`);
}
