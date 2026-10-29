import type { UserRole } from '../auth/authModels';

/** Shapes of `src/mocks/admin_dashboard_mock_data.json` (web-only admin dashboard). */

export type KpiFormat = 'currency' | 'number';

export interface DashboardKpi {
  id: string;
  label: string;
  value: number;
  format: KpiFormat;
  /** Change vs the previous period, in percent (signed). */
  deltaPct: number;
  /** Whether a rise is good news (stock alerts / pending items: false). */
  upIsGood: boolean;
  icon: string;
  caption: string;
}

export interface RevenuePoint {
  weekStart: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface CategorySalesRow {
  categoryId: string;
  name: string;
  revenue: number;
  orders: number;
  imageAsset: string;
}

export interface TopProductRow {
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  unitsSold: number;
  revenue: number;
  trendPct: number;
  stock: number;
}

export type StockStatus = 'outOfStock' | 'critical' | 'low';

export interface StockAlertRow {
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  stock: number;
  reorderLevel: number;
  avgDailySales: number;
  status: StockStatus;
}

/** Flutter `QuotationStatus` (pending / sold). */
export type QuotationStatus = 'pending' | 'sold';

export interface QuotationRow {
  id: string;
  quotationLabel: string;
  customerName: string;
  role: UserRole;
  grandTotal: number;
  status: QuotationStatus;
  createdAt: string;
}

export type DispatchStatus = 'readyToDispatch' | 'inTransit' | 'delivered' | 'delayed';

export interface DispatchRow {
  id: string;
  orderId: string;
  customerName: string;
  destination: string;
  vehicle: string;
  eta: string;
  status: DispatchStatus;
}

export interface WarehouseRow {
  id: string;
  name: string;
  city: string;
  skus: number;
  utilizationPct: number;
  pendingPicks: number;
  lowStockSkus: number;
}

export interface ReferralPartnerRow {
  id: string;
  name: string;
  role: UserRole;
  city: string;
  referrals: number;
  convertedRevenue: number;
  rewardPoints: number;
}

export interface ActivityRow {
  id: string;
  icon: string;
  text: string;
  actor: string;
  time: string;
}

// ── Formatting ──────────────────────────────────────────────────────────

const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const twoDecimals = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** "1,284" — Indian digit grouping. */
export const formatCount = (value: number) => grouped.format(Math.round(value));

/** "₹6,42,300" — full rupee value for tables and tooltips. */
export const formatRupees = (value: number) => `₹${grouped.format(Math.round(value))}`;

/** "₹48.3L", "₹1.84Cr", "₹9.5K" — compact rupees for tiles and axis ticks. */
export function formatRupeesCompact(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${twoDecimals.format(value / 1e7)}Cr`;
  if (abs >= 1e5) return `₹${oneDecimal.format(value / 1e5)}L`;
  if (abs >= 1e3) return `₹${oneDecimal.format(value / 1e3)}K`;
  return formatRupees(value);
}

/** "+12.4%" / "−3.2%" (true minus sign). */
export const formatDelta = (pct: number) =>
  `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${oneDecimal.format(Math.abs(pct))}%`;

/** Days of stock left at the current sales rate (0 when out of stock). */
export const daysOfCover = (row: StockAlertRow) =>
  row.avgDailySales > 0 ? Math.floor(row.stock / row.avgDailySales) : 0;
