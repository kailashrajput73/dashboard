import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listInventory,
  listInventoryTransactions,
  listLowStock,
  type InventoryRow,
  type InventoryTransaction,
} from "../api/endpoints";
import { ApiError } from "../api/client";
import { Chip, ErrorModal, Header, Input } from "../components/UI";
import { Icon } from "../components/Icon";
import { colors, font, radii, spacing } from "../theme";
import { formatMoney } from "../utils/money";
import { downloadCsv } from "../utils/download-csv";

type InventoryView = "stock" | "low" | "moves";

function dateBoundary(value: string, endOfDay = false): number | undefined | null {
  if (!value.trim()) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.getTime();
}

function inventoryErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  const body = error.body;
  const errors = body?.data?.errors ?? body?.errors ?? body?.detail?.errors ?? body?.detail?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) return errors.map(String).join("\n");
  return error.message || fallback;
}

function movementReferenceLabel(referenceId: string, type: "in" | "out") {
  const text = referenceId.toLowerCase();
  if (text.includes("rfq")) return "RFQ";
  if (text.includes("purchase") || text.includes("pur")) return "Purchase";
  if (text.includes("dispatch") || text.includes("disp")) return "Dispatch";
  return type === "in" ? "Purchase" : "Dispatch";
}

function csvCell(value: string | number | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function SummaryCell(props: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ ...summaryCellStyle, ...(props.highlight ? summaryHighlightStyle : {}) }}>
      <div style={summaryLabelStyle}>{props.label}</div>
      <strong style={{ color: props.highlight ? colors.primary : colors.textPrimary }}>{props.value}</strong>
    </div>
  );
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [low, setLow] = useState<InventoryRow[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [view, setView] = useState<InventoryView>("stock");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(() => Promise.all([
    listInventory(),
    listLowStock(),
    listInventoryTransactions(),
  ]), []);

  const applyData = useCallback(([stock, lowStock, moves]: Awaited<ReturnType<typeof fetchData>>) => {
    setRows(stock || []);
    setLow(lowStock || []);
    setTransactions(moves || []);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchData()
      .then((data) => {
        if (active) {
          applyData(data);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(inventoryErrorMessage(cause, "Failed to load inventory"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyData, fetchData]);

  const fromTime = dateBoundary(dateFrom);
  const toTime = dateBoundary(dateTo, true);
  const dateFilterError = fromTime === null
    ? "Enter the start date as YYYY-MM-DD."
    : toTime === null
      ? "Enter the end date as YYYY-MM-DD."
      : fromTime != null && toTime != null && fromTime > toTime
        ? "Start date must be on or before end date."
        : null;

  const filteredRows = useMemo(() => {
    const source = view === "low" ? low : rows;
    const query = search.trim().toLowerCase();
    return source.filter((row) => {
      if (!query) return true;
      const haystack = [row.name, row.productCode || "", row.category || "", row.brand || ""].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [low, rows, search, view]);

  const filteredTransactions = useMemo(() => {
    if (dateFilterError) return transactions;
    const query = search.trim().toLowerCase();
    return transactions.filter((item) => {
      const at = new Date(item.at).getTime();
      const inRange = Number.isFinite(at) && (fromTime == null || at >= fromTime) && (toTime == null || at <= toTime);
      if (!inRange) return false;
      if (!query) return true;
      const haystack = [item.productName, item.productCode, item.referenceId].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [dateFilterError, fromTime, toTime, transactions, search]);

  const stockSummary = useMemo(() => {
    const lowCount = filteredRows.filter((row) => Number(row.stock ?? 0) <= Number(row.reorderLevel ?? 0)).length;
    return {
      count: filteredRows.length,
      totalUnits: filteredRows.reduce((total, row) => total + Number(row.stock ?? 0), 0),
      totalValuation: filteredRows.reduce((total, row) => total + Number(row.valuation ?? 0), 0),
      lowCount,
    };
  }, [filteredRows]);

  const moveSummary = useMemo(() => {
    const inQty = filteredTransactions.filter((item) => item.type === "in").reduce((total, item) => total + Number(item.quantity || 0), 0);
    const outQty = filteredTransactions.filter((item) => item.type === "out").reduce((total, item) => total + Number(item.quantity || 0), 0);
    return {
      count: filteredTransactions.length,
      inQty,
      outQty,
      netQty: inQty - outQty,
    };
  }, [filteredTransactions]);

  const hasVisibleExport = view === "moves" ? filteredTransactions.length > 0 : filteredRows.length > 0;
  const totalInventoryCount = view === "low" ? low.length : view === "moves" ? transactions.length : rows.length;

  function exportCsv() {
    if (!hasVisibleExport) return;
    const isMoves = view === "moves";
    const header = isMoves
      ? ["type", "productCode", "productName", "quantity", "referenceId", "at"]
      : ["productCode", "name", "category", "brand", "stock", "reorderLevel", "unitCost", "valuation", "rackName", "rackSlot"];
    const csvData = isMoves
      ? filteredTransactions.map((item) => [item.type, item.productCode, item.productName, item.quantity, item.referenceId, item.at])
      : filteredRows.map((item) => [
          item.productCode || "",
          item.name,
          item.category || "",
          item.brand || "",
          Number(item.stock ?? 0),
          Number(item.reorderLevel ?? 0),
          Number(item.unitCost ?? 0),
          Number(item.valuation ?? 0),
          item.rackName || "",
          item.rackSlot || "",
        ]);
    const csv = [header, ...csvData].map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\n");
    const bom = "\uFEFF";
    try {
      downloadCsv(bom + csv, `${isMoves ? "inventory-moves" : "inventory"}-${new Date().toISOString().slice(0, 10)}.csv`);
      setSuccessMessage(
        isMoves
          ? `Exported ${filteredTransactions.length} movement${filteredTransactions.length === 1 ? "" : "s"}.`
          : `Exported ${filteredRows.length} stock row${filteredRows.length === 1 ? "" : "s"}.`,
      );
      setError(null);
    } catch {
      setError("Could not open inventory export.");
    }
  }

  const summary = view === "moves" ? (
    <>
      <SummaryCell label="Lines" value={String(moveSummary.count)} />
      <SummaryCell label="In" value={String(moveSummary.inQty)} />
      <SummaryCell label="Out" value={String(moveSummary.outQty)} />
      <SummaryCell label="Net" value={String(moveSummary.netQty)} highlight />
    </>
  ) : (
    <>
      <SummaryCell label="Products" value={String(stockSummary.count)} />
      <SummaryCell label="Units" value={String(stockSummary.totalUnits)} />
      <SummaryCell label="Valuation" value={`₹${formatMoney(stockSummary.totalValuation)}`} highlight />
      <SummaryCell label="Low stock" value={String(stockSummary.lowCount)} />
    </>
  );

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Stock & Inventory"
        subtitle={
          view === "moves"
            ? `${filteredTransactions.length} of ${transactions.length} movement${transactions.length === 1 ? "" : "s"}`
            : `${filteredRows.length} of ${totalInventoryCount} product${totalInventoryCount === 1 ? "" : "s"}`
        }
        onBack={() => navigate(-1)}
        right={(
          <button
            type="button"
            data-testid="export-inventory"
            aria-label="Export inventory CSV"
            onClick={exportCsv}
            disabled={!hasVisibleExport}
            style={exportButtonStyle}
          >
            <Icon name="download-outline" size={23} color={hasVisibleExport ? colors.primary : colors.textMuted} />
          </button>
        )}
      />

      <div style={controlsStyle}>
        <Input
          testID="inventory-search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search product, code, category, or brand"
          style={{ marginBottom: spacing.sm }}
        />
        <div style={tabsStyle}>
          <Chip label="Current stock" selected={view === "stock"} onPress={() => setView("stock")} testID="inventory-stock-tab" />
          <Chip label="Low stock" selected={view === "low"} onPress={() => setView("low")} testID="inventory-low-tab" />
          <Chip label="Stock in/out" selected={view === "moves"} onPress={() => setView("moves")} testID="inventory-moves-tab" />
        </div>
        {view === "moves" ? (
          <div style={dateFiltersStyle}>
            <Input value={dateFrom} onChangeText={setDateFrom} placeholder="From YYYY-MM-DD" style={{ flex: 1, marginBottom: 0 }} />
            <Input value={dateTo} onChangeText={setDateTo} placeholder="To YYYY-MM-DD" style={{ flex: 1, marginBottom: 0 }} />
          </div>
        ) : null}
        {view === "moves" && dateFilterError ? <p style={validationStyle}>{dateFilterError}</p> : null}
      </div>

      {successMessage ? <p role="status" style={successStyle}>{successMessage}</p> : null}

      {loading ? (
        <div style={centerStyle}><span className="web-button-spinner" role="status" aria-label="Loading inventory" /></div>
      ) : (
        <div style={listStyle}>
          <section style={summaryBlockStyle}>
            <h2 style={summaryTitleStyle}>Report summary</h2>
            <div style={summaryGridStyle}>{summary}</div>
          </section>
          {view === "moves" ? (
            filteredTransactions.length === 0 ? <p style={emptyStyle}>No stock movements match this filter.</p> : (
              <div style={rowsStyle}>
                {filteredTransactions.map((item, index) => (
                  <article key={`${item.referenceId}-${item.productCode}-${index}`} style={rowStyle}>
                    <div style={{ ...typeBadgeStyle, background: item.type === "in" ? colors.successBg : colors.errorBg, color: item.type === "in" ? colors.success : colors.error }}>{item.type === "in" ? "IN" : "OUT"}</div>
                    <div style={rowMainStyle}>
                      <strong style={productNameStyle}>{item.productName}</strong>
                      <div style={metaStyle}>{item.productCode} · {movementReferenceLabel(item.referenceId, item.type)}</div>
                      <div style={metaStyle}>{item.referenceId} · {new Date(item.at).toISOString().slice(0, 10)}</div>
                    </div>
                    <div style={rowRightStyle}>
                      <strong style={{ ...quantityStyle, color: item.type === "in" ? colors.success : colors.error }}>{item.type === "in" ? "+" : "-"}{item.quantity}</strong>
                      <div style={{ ...metaStyle, color: item.type === "out" && Number(item.quantity || 0) > 0 ? colors.error : colors.textSecondary }}>{item.type === "in" ? "Stock in" : "Stock out"}</div>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : filteredRows.length === 0 ? <p style={emptyStyle}>No inventory records match this filter.</p> : (
            <div style={rowsStyle}>
              {filteredRows.map((item) => {
                const isLowStock = Number(item.stock ?? 0) <= Number(item.reorderLevel ?? 0);
                return (
                  <article key={item.productId} data-testid={`inventory-${item.productId}`} style={rowStyle}>
                    <div style={rowMainStyle}>
                      <strong style={productNameStyle}>{item.name}</strong>
                      <div style={metaStyle}>
                        {item.productCode || "—"}
                        {item.category || item.brand ? ` · ${[item.category, item.brand].filter(Boolean).join(" · ")}` : ""}
                      </div>
                      <div style={metaStyle}>
                        {item.rackName || item.rackSlot ? `${item.rackName || "Rack"}${item.rackSlot ? ` · ${item.rackSlot}` : ""}` : "No rack"}
                      </div>
                    </div>
                    <div style={rowRightStyle}>
                      <strong style={{ ...stockValueStyle, color: isLowStock ? colors.error : colors.textPrimary }}>{Number(item.stock ?? 0)}</strong>
                      <div style={rolStyle}>ROL {Number(item.reorderLevel ?? 0)}</div>
                      <div style={valueLabelStyle}>Valuation</div>
                      <strong style={valueStyle}>₹{formatMoney(Number(item.valuation ?? 0))}</strong>
                      {item.unitCost ? <div style={unitCostStyle}>@ ₹{formatMoney(Number(item.unitCost ?? 0))}/unit</div> : null}
                      {isLowStock ? <span style={lowStockStyle}>Low stock</span> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
      <ErrorModal visible={!!error} title="Inventory" message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}

const controlsStyle: React.CSSProperties = { padding: `${spacing.md}px ${spacing.lg}px 0` };
const tabsStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm };
const dateFiltersStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm };
const validationStyle: React.CSSProperties = { color: colors.error, fontSize: 12, margin: `0 0 ${spacing.sm}px` };
const successStyle: React.CSSProperties = { color: colors.success, background: colors.successBg, padding: `${spacing.sm}px ${spacing.lg}px`, margin: `0 ${spacing.lg}px ${spacing.sm}px`, borderRadius: radii.sm, fontWeight: 600 };
const centerStyle: React.CSSProperties = { minHeight: 180, display: "grid", placeItems: "center" };
const listStyle: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: `${spacing.md}px ${spacing.lg}px ${spacing.xl}px` };
const summaryBlockStyle: React.CSSProperties = { marginBottom: spacing.md };
const summaryTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, margin: `0 0 ${spacing.sm}px` };
const summaryGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: spacing.sm };
const summaryCellStyle: React.CSSProperties = { display: "grid", gap: 4, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: `${spacing.sm}px ${spacing.md}px` };
const summaryHighlightStyle: React.CSSProperties = { background: colors.primaryLight, borderColor: colors.primary };
const summaryLabelStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 11, textTransform: "uppercase" };
const rowsStyle: React.CSSProperties = { display: "grid", gap: spacing.sm };
const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.md, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.md, minWidth: 0 };
const rowMainStyle: React.CSSProperties = { minWidth: 0, flex: 1 };
const rowRightStyle: React.CSSProperties = { minWidth: 110, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end" };
const productNameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, overflowWrap: "anywhere" };
const metaStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, marginTop: 3, overflowWrap: "anywhere" };
const typeBadgeStyle: React.CSSProperties = { minWidth: 50, padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radii.sm, textAlign: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 };
const quantityStyle: React.CSSProperties = { fontSize: 22 };
const stockValueStyle: React.CSSProperties = { fontSize: 28, lineHeight: "32px" };
const rolStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 11, marginTop: 2 };
const valueLabelStyle: React.CSSProperties = { color: colors.textMuted, fontSize: 10, marginTop: 6, textTransform: "uppercase" };
const valueStyle: React.CSSProperties = { color: colors.textPrimary, fontSize: 15 };
const unitCostStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 11, marginTop: 2 };
const lowStockStyle: React.CSSProperties = { color: colors.warning, background: colors.warningBg, borderRadius: radii.sm, padding: "3px 8px", marginTop: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase" };
const emptyStyle: React.CSSProperties = { textAlign: "center", color: colors.textSecondary, padding: spacing.xl };
const exportButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, padding: 4, border: 0, borderRadius: radii.sm, background: "transparent", cursor: "pointer", flexShrink: 0 };
