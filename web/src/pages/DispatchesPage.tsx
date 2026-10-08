import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDispatch, listCatalog, listDispatches, listPartners, listRfqs, type CatalogItem, type Dispatch, type Partner, type Rfq } from "../api/endpoints";
import { ApiError } from "../api/client";
import { AppModal, Button, Chip, ErrorModal, Header, Input } from "../components/UI";
import { Icon } from "../components/Icon";
import { colors, font, radii, spacing } from "../theme";
import { formatMoney } from "../utils/money";
import { downloadCsv } from "../utils/download-csv";

type DispatchViewFilter = "all" | "retail" | "rfq";
type RetailCartLine = { productCode: string; productName: string; quantity: number; unitPrice: number; stock: number };

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

function dispatchErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  const body = error.body;
  const errors = body?.data?.errors ?? body?.errors ?? body?.detail?.errors ?? body?.detail?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) return errors.map(String).join("\n");
  return error.message || fallback;
}

function csvCell(value: string | number | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function getRfqStockIssues(rfq: Rfq, stockByCode: Map<string, number>) {
  const issues: string[] = [];
  for (const line of rfq.lines) {
    const stock = stockByCode.get(line.productCode);
    if (stock == null) issues.push(`${line.productName || line.productCode}: not in catalog`);
    else if (stock < Number(line.quantity || 0)) issues.push(`${line.productName || line.productCode}: need ${line.quantity}, stock ${stock}`);
  }
  return issues;
}

function SummaryCell(props: { label: string; value: string; highlight?: boolean }) {
  return <div style={{ ...summaryCellStyle, ...(props.highlight ? summaryHighlightStyle : {}) }}><span style={summaryLabelStyle}>{props.label}</span><strong style={{ color: props.highlight ? colors.primary : colors.textPrimary }}>{props.value}</strong></div>;
}

export default function DispatchesPage() {
  const navigate = useNavigate();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [rfqOpen, setRfqOpen] = useState(false);
  const [expandedDispatchId, setExpandedDispatchId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dispatchType, setDispatchType] = useState<DispatchViewFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productCode, setProductCode] = useState("");
  const [retailQuantity, setRetailQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [retailLines, setRetailLines] = useState<RetailCartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const partnerById = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [partners]);
  const stockByCode = useMemo(() => new Map(products.filter((product) => product.productCode).map((product) => [product.productCode as string, Number(product.stock ?? 0)])), [products]);
  const approvedRfqs = useMemo(() => rfqs.filter((rfq) => rfq.status === "approved"), [rfqs]);
  const productMatches = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products.slice(0, 12);
    return products.filter((product) => [product.name, product.productCode, product.brand, product.category].filter(Boolean).join(" ").toLowerCase().includes(query)).slice(0, 12);
  }, [productQuery, products]);
  const fromTime = dateBoundary(dateFrom);
  const toTime = dateBoundary(dateTo, true);
  const dateFilterError = fromTime === null
    ? "Enter the start date as YYYY-MM-DD."
    : toTime === null
      ? "Enter the end date as YYYY-MM-DD."
      : fromTime != null && toTime != null && fromTime > toTime
        ? "Start date must be on or before end date."
        : null;

  const fetchData = useCallback(() => Promise.all([listDispatches(), listCatalog(), listPartners(), listRfqs()]), []);
  const applyData = useCallback(([nextDispatches, nextProducts, nextPartners, nextRfqs]: Awaited<ReturnType<typeof fetchData>>) => {
    setDispatches(nextDispatches || []);
    setProducts(nextProducts || []);
    setPartners(nextPartners || []);
    setRfqs(nextRfqs || []);
  }, []);
  const load = useCallback(async () => applyData(await fetchData()), [applyData, fetchData]);

  useEffect(() => {
    let active = true;
    void fetchData()
      .then((data) => { if (active) { applyData(data); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(dispatchErrorMessage(cause, "Failed to load dispatches")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applyData, fetchData]);

  const filteredDispatches = useMemo(() => {
    if (dateFilterError) return dispatches;
    return dispatches.filter((dispatch) => {
      const createdAt = new Date(dispatch.createdAt).getTime();
      const inRange = Number.isFinite(createdAt) && (fromTime == null || createdAt >= fromTime) && (toTime == null || createdAt <= toTime);
      if (!inRange) return false;
      const isRetail = !dispatch.sourceRfqId;
      if (dispatchType !== "all" && (dispatchType === "retail" ? !isRetail : isRetail)) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      const haystack = [dispatch.id, dispatch.sourceRfqId, dispatch.customerName, dispatch.customerPhone, ...dispatch.lines.flatMap((line) => [line.productCode, line.productName])].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query) || Boolean(dispatch.sourceRfqId?.toLowerCase().startsWith(query));
    });
  }, [dateFilterError, dispatchType, dispatches, fromTime, search, toTime]);

  const summary = useMemo(() => {
    const lines = filteredDispatches.flatMap((dispatch) => dispatch.lines);
    return {
      dispatchCount: filteredDispatches.length,
      lineCount: lines.length,
      quantity: lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
      value: lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0),
    };
  }, [filteredDispatches]);

  function openRetail() {
    setProductQuery("");
    setProductCode("");
    setRetailQuantity("1");
    setCustomerName("");
    setCustomerPhone("");
    setRetailLines([]);
    setError(null);
    setSuccessMessage(null);
    setFormOpen(true);
  }

  function selectRetailProduct(product: CatalogItem) {
    if (!product.productCode) return;
    setProductCode(product.productCode);
    setProductQuery(`${product.name} • ${product.productCode}`);
  }

  function addRetailLine() {
    const product = products.find((item) => item.productCode?.trim().toLowerCase() === productCode.trim().toLowerCase());
    if (!product?.productCode) return setError("Search and select an existing catalog product before adding it to the retail cart.");
    const quantity = Number(retailQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return setError("Retail quantity must be a positive number.");
    const stock = Number(product.stock ?? 0);
    const unitPrice = Number(product.sellingPrice ?? product.standardRate ?? 0);
    setRetailLines((current) => {
      const existing = current.find((line) => line.productCode === product.productCode);
      return existing
        ? current.map((line) => line.productCode === product.productCode ? { ...line, quantity: line.quantity + quantity } : line)
        : [...current, { productCode: product.productCode as string, productName: product.name, quantity, unitPrice, stock }];
    });
    setProductCode("");
    setProductQuery("");
    setRetailQuantity("1");
    setError(null);
  }

  function updateRetailLine(index: number, value: string) {
    const quantity = Number(value);
    setRetailLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 0 } : line));
  }

  const retailStockIssues = useMemo(() => retailLines.filter((line) => line.quantity > line.stock).map((line) => `${line.productName || line.productCode}: need ${line.quantity}, stock ${line.stock}`), [retailLines]);
  const retailCartTotal = useMemo(() => retailLines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0), [retailLines]);

  async function dispatchRetail() {
    if (!retailLines.length) return setError("Add at least one product to the retail cart before dispatching.");
    if (retailStockIssues.length) return setError(retailStockIssues.join("\n"));
    setSaving(true);
    setError(null);
    try {
      await createDispatch({
        lines: retailLines.map((line) => ({ productCode: line.productCode, quantity: Number(line.quantity) })),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      });
      setFormOpen(false);
      setRetailLines([]);
      setSuccessMessage(`Retail dispatch saved${customerName ? ` for ${customerName}` : ""}.`);
      await load();
    } catch (cause) {
      setError(dispatchErrorMessage(cause, "Could not dispatch retail order"));
    } finally {
      setSaving(false);
    }
  }

  async function dispatchRfq(rfq: Rfq) {
    const issues = getRfqStockIssues(rfq, stockByCode);
    if (issues.length) return setError(issues.join("\n"));
    setSaving(true);
    setError(null);
    try {
      await createDispatch({ sourceRfqId: rfq.id, lines: rfq.lines.map((line) => ({ productCode: line.productCode, quantity: line.quantity })) });
      setRfqOpen(false);
      setSuccessMessage(`RFQ ${rfq.id.slice(0, 8)} dispatched and stock reduced.`);
      await load();
    } catch (cause) {
      setError(dispatchErrorMessage(cause, "Could not dispatch RFQ"));
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    if (!filteredDispatches.length) return;
    const header = ["dispatchId", "createdAt", "sourceRfqId", "customerName", "customerPhone", "productCode", "productName", "quantity", "unitPrice", "lineValue", "type"];
    const rows = filteredDispatches.flatMap((dispatch) => dispatch.lines.map((line) => [dispatch.id, dispatch.createdAt, dispatch.sourceRfqId || "", dispatch.customerName || "", dispatch.customerPhone || "", line.productCode, line.productName || "", Number(line.quantity || 0), Number(line.unitPrice || 0), Number(line.quantity || 0) * Number(line.unitPrice || 0), dispatch.sourceRfqId ? "rfq" : "retail"]));
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    try {
      downloadCsv(`\uFEFF${csv}`, `dispatches-${new Date().toISOString().slice(0, 10)}.csv`);
      setSuccessMessage(`Exported ${rows.length} dispatch line${rows.length === 1 ? "" : "s"}.`);
      setError(null);
    } catch {
      setError("Could not open dispatch export.");
    }
  }

  function dispatchLabel(dispatch: Dispatch) {
    if (dispatch.sourceRfqId) {
      const rfq = rfqs.find((entry) => entry.id === dispatch.sourceRfqId);
      const partner = rfq ? partnerById.get(rfq.partnerId) : undefined;
      return partner ? `${partner.name} · RFQ ${dispatch.sourceRfqId.slice(0, 8)}` : `RFQ · ${dispatch.sourceRfqId.slice(0, 8)}`;
    }
    return dispatch.customerName || "Retail customer";
  }

  function dispatchMeta(dispatch: Dispatch) {
    if (dispatch.sourceRfqId) {
      const rfq = rfqs.find((entry) => entry.id === dispatch.sourceRfqId);
      const partner = rfq ? partnerById.get(rfq.partnerId) : undefined;
      return partner?.phone ? `${partner.phone} · ${rfq?.partnerId || dispatch.sourceRfqId}` : rfq?.partnerId || dispatch.sourceRfqId;
    }
    return dispatch.customerPhone || "Walk-in retail";
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header title="Dispatch & Billing" subtitle={`${filteredDispatches.length} of ${dispatches.length} dispatch${dispatches.length === 1 ? "" : "es"}`} onBack={() => navigate(-1)} right={<div style={headerActionsStyle}><button type="button" data-testid="export-dispatches" aria-label="Export dispatches CSV" title="Export dispatches CSV" onClick={exportCsv} disabled={!filteredDispatches.length} style={iconButtonStyle}><Icon name="download-outline" size={23} color={filteredDispatches.length ? colors.primary : colors.textMuted} /></button><button type="button" data-testid="open-retail-dispatch" aria-label="Retail billing" title="Retail billing" onClick={openRetail} style={iconButtonStyle}><Icon name="add-circle" size={25} color={colors.primary} /></button></div>} />
      <div style={controlsStyle}>
        <Input testID="dispatch-search" value={search} onChangeText={setSearch} placeholder="Search product, customer, or RFQ" style={{ marginBottom: spacing.sm }} />
        <div style={filtersStyle}>
          {(["all", "retail", "rfq"] as DispatchViewFilter[]).map((filter) => <Chip key={filter} label={filter === "all" ? "All" : filter === "retail" ? "Retail" : "RFQ-linked"} selected={dispatchType === filter} onPress={() => setDispatchType(filter)} testID={`dispatch-filter-${filter}`} />)}
        </div>
        <div style={dateFiltersStyle}>
          <Input value={dateFrom} onChangeText={setDateFrom} placeholder="From YYYY-MM-DD" style={{ flex: 1, marginBottom: 0 }} />
          <Input value={dateTo} onChangeText={setDateTo} placeholder="To YYYY-MM-DD" style={{ flex: 1, marginBottom: 0 }} />
        </div>
        {dateFilterError ? <p role="alert" style={validationStyle}>{dateFilterError}</p> : null}
      </div>
      {successMessage ? <p role="status" style={successStyle}>{successMessage}</p> : null}
      <div style={listStyle}>
        <section style={summaryBlockStyle}>
          <h2 style={summaryTitleStyle}>Report summary</h2>
          <div style={summaryGridStyle}><SummaryCell label="Dispatches" value={String(summary.dispatchCount)} /><SummaryCell label="Lines" value={String(summary.lineCount)} /><SummaryCell label="Qty" value={String(summary.quantity)} /><SummaryCell label="Total" value={`₹${formatMoney(summary.value)}`} highlight /></div>
        </section>
        {loading ? <div style={centerStyle}><span className="web-button-spinner" role="status" aria-label="Loading dispatches" /></div> : filteredDispatches.length === 0 ? <p style={emptyStyle}>No dispatches match this filter.</p> : (
          <div style={rowsStyle}>
            {filteredDispatches.map((dispatch) => {
              const expanded = expandedDispatchId === dispatch.id;
              const quantity = dispatch.lines.reduce((total, line) => total + Number(line.quantity || 0), 0);
              const total = dispatch.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);
              return <button type="button" key={dispatch.id} data-testid={`dispatch-${dispatch.id}`} onClick={() => setExpandedDispatchId((current) => current === dispatch.id ? null : dispatch.id)} style={dispatchRowStyle}>
                <div style={rowMainStyle}>
                  <strong style={dispatchNameStyle}>{dispatchLabel(dispatch)}</strong>
                  <div style={metaStyle}>{dispatchMeta(dispatch)}</div>
                  <div style={metaStyle}>{new Date(dispatch.createdAt).toLocaleString()}</div>
                  <div style={metaStyle}>{dispatch.lines.length} line{dispatch.lines.length === 1 ? "" : "s"} · Qty {quantity} · ₹{formatMoney(total)}</div>
                  {expanded ? <div style={detailBoxStyle}>
                    {dispatch.lines.map((line, index) => <div key={`${line.productCode}-${index}`} style={detailLineStyle}>{line.productName || line.productCode} × {line.quantity} · ₹{formatMoney(Number(line.unitPrice || 0))} each · ₹{formatMoney(Number(line.quantity || 0) * Number(line.unitPrice || 0))}</div>)}
                    <div style={detailLineStyle}>Customer: {dispatch.customerName || "—"} · {dispatch.customerPhone || "—"}</div>
                    {dispatch.sourceRfqId ? <div style={detailLineStyle}>RFQ link: {dispatch.sourceRfqId}</div> : null}
                  </div> : null}
                </div>
                <div style={rowRightStyle}><Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} /><span style={typeBadgeStyle}>{dispatch.sourceRfqId ? "RFQ" : "Retail"}</span></div>
              </button>;
            })}
          </div>
        )}
      </div>
      <div style={footerStyle}>
        <Button testID="convert-rfq-dispatch" title={`Dispatch approved RFQ (${approvedRfqs.length})`} icon="swap-horizontal-outline" onPress={() => setRfqOpen(true)} fullWidth />
        <Button testID="retail-billing" title="Retail customer billing" icon="receipt-outline" onPress={openRetail} fullWidth style={{ marginTop: spacing.sm }} />
      </div>
      <AppModal testID="retail-dispatch-modal" visible={formOpen} onClose={() => setFormOpen(false)} title="Retail billing">
        <Input testID="dispatch-product-search" label="Search product by name, code, or brand" value={productQuery} onChangeText={setProductQuery} placeholder="Search catalog" autoCapitalize="characters" />
        <Input testID="dispatch-product-code" label="Product code" value={productCode} onChangeText={setProductCode} placeholder="PRD-..." autoCapitalize="characters" />
        <div style={productListStyle}>{productMatches.map((product) => <button type="button" key={product.id} onClick={() => selectRetailProduct(product)} style={productRowStyle}><strong>{product.name}</strong><span style={metaStyle}>{product.productCode || "—"} · stock {Number(product.stock ?? 0)}</span></button>)}</div>
        <div style={addBarStyle}><Input testID="dispatch-quantity" label="Quantity" value={retailQuantity} onChangeText={setRetailQuantity} keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} /><Button testID="retail-add-line" title="Add line" onPress={addRetailLine} size="sm" /></div>
        {retailLines.length ? <div style={cartListStyle}>{retailLines.map((line, index) => <div key={`${line.productCode}-${index}`} style={cartLineStyle}>
          <div style={{ minWidth: 0, flex: 1 }}><strong>{line.productName}</strong><div style={metaStyle}>{line.productCode} · stock {line.stock}</div><div style={metaStyle}>₹{formatMoney(line.unitPrice)} each · total ₹{formatMoney(Number(line.quantity) * Number(line.unitPrice))}</div></div>
          <div style={lineActionsStyle}><Input value={String(line.quantity)} onChangeText={(value) => updateRetailLine(index, value)} keyboardType="decimal-pad" style={{ width: 76, marginBottom: 0 }} /><button type="button" aria-label={`Remove ${line.productName}`} onClick={() => setRetailLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} style={iconButtonStyle}><Icon name="trash-outline" size={18} color={colors.error} /></button></div>
        </div>)}</div> : null}
        <p style={totalStyle}>Cart total: ₹{formatMoney(retailCartTotal)}</p>
        {retailStockIssues.length ? <p role="alert" style={stockWarnStyle}>{retailStockIssues.join(" · ")}</p> : null}
        <Input testID="retail-customer-name" label="Customer name (optional)" value={customerName} onChangeText={setCustomerName} />
        <Input testID="retail-customer-phone" label="Customer phone (optional)" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
        <Button testID="save-retail-dispatch" title="Bill and dispatch" onPress={dispatchRetail} loading={saving} disabled={!retailLines.length || retailStockIssues.length > 0} fullWidth />
      </AppModal>
      <AppModal testID="approved-rfq-modal" visible={rfqOpen} onClose={() => setRfqOpen(false)} title="Approved RFQs" wide>
        {approvedRfqs.length ? approvedRfqs.map((rfq) => {
          const issues = getRfqStockIssues(rfq, stockByCode);
          const partner = partnerById.get(rfq.partnerId);
          return <div key={rfq.id} style={rfqItemStyle}><div style={rowMainStyle}><strong>{partner?.name || `Partner ${rfq.partnerId.slice(0, 8)}`}</strong><div style={metaStyle}>{partner?.phone || rfq.partnerId}</div><div style={metaStyle}>{rfq.lines.map((line) => `${line.productName || line.productCode} × ${line.quantity}`).join(" · ")}</div>{issues.length ? <div style={stockWarnStyle}>{issues.join(" · ")}</div> : <div style={stockOkStyle}>Stock OK for all lines.</div>}</div><Button testID={`dispatch-rfq-${rfq.id}`} title="Dispatch" size="sm" onPress={() => dispatchRfq(rfq)} loading={saving} disabled={issues.length > 0} /></div>;
        }) : <p style={emptyStyle}>No approved RFQs ready for dispatch.</p>}
      </AppModal>
      <ErrorModal visible={!!error} title="Dispatch & Billing" message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}

const controlsStyle: React.CSSProperties = { padding: `${spacing.md}px ${spacing.lg}px 0` };
const filtersStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm };
const dateFiltersStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm };
const validationStyle: React.CSSProperties = { color: colors.error, fontSize: 12, margin: `0 0 ${spacing.sm}px` };
const successStyle: React.CSSProperties = { color: colors.success, padding: `0 ${spacing.lg}px ${spacing.sm}px`, fontWeight: 600 };
const listStyle: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: `${spacing.md}px ${spacing.lg}px 180px` };
const summaryBlockStyle: React.CSSProperties = { marginBottom: spacing.md };
const summaryTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, margin: `0 0 ${spacing.sm}px` };
const summaryGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: spacing.sm };
const summaryCellStyle: React.CSSProperties = { display: "grid", gap: 4, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: `${spacing.sm}px ${spacing.md}px` };
const summaryHighlightStyle: React.CSSProperties = { background: colors.primaryLight, borderColor: colors.primary };
const summaryLabelStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 11, textTransform: "uppercase" };
const centerStyle: React.CSSProperties = { minHeight: 180, display: "grid", placeItems: "center" };
const rowsStyle: React.CSSProperties = { display: "grid", gap: spacing.sm };
const dispatchRowStyle: React.CSSProperties = { display: "flex", width: "100%", boxSizing: "border-box", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, color: colors.textPrimary, font: "inherit", textAlign: "left", cursor: "pointer" };
const rowMainStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
const dispatchNameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, overflowWrap: "anywhere" };
const metaStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, marginTop: 3, overflowWrap: "anywhere" };
const rowRightStyle: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: spacing.xs, flexShrink: 0 };
const typeBadgeStyle: React.CSSProperties = { color: colors.primary, fontWeight: 700, fontSize: 11 };
const detailBoxStyle: React.CSSProperties = { marginTop: spacing.sm, paddingTop: spacing.sm, borderTop: `1px solid ${colors.border}` };
const detailLineStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, marginTop: 4, overflowWrap: "anywhere" };
const footerStyle: React.CSSProperties = { position: "fixed", bottom: 12, left: spacing.lg, right: spacing.lg, maxWidth: 700, margin: "0 auto", zIndex: 2 };
const headerActionsStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.sm };
const iconButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, padding: 4, border: 0, borderRadius: radii.sm, background: "transparent", cursor: "pointer", flexShrink: 0 };
const emptyStyle: React.CSSProperties = { textAlign: "center", color: colors.textSecondary, padding: spacing.xl };
const productListStyle: React.CSSProperties = { display: "grid", gap: spacing.xs, marginBottom: spacing.sm };
const productRowStyle: React.CSSProperties = { display: "grid", gap: 3, width: "100%", padding: spacing.sm, border: `1px solid ${colors.border}`, borderRadius: radii.sm, background: colors.bg, color: colors.textPrimary, font: "inherit", textAlign: "left", cursor: "pointer" };
const addBarStyle: React.CSSProperties = { display: "flex", alignItems: "flex-end", gap: spacing.sm, margin: `${spacing.sm}px 0` };
const cartListStyle: React.CSSProperties = { marginBottom: spacing.sm };
const cartLineStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.sm, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radii.sm, padding: spacing.sm, marginBottom: spacing.xs, minWidth: 0 };
const lineActionsStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.xs, flexShrink: 0 };
const totalStyle: React.CSSProperties = { color: colors.textPrimary, fontWeight: 600, margin: `0 0 ${spacing.sm}px` };
const stockWarnStyle: React.CSSProperties = { color: colors.error, fontSize: 12, margin: `${spacing.xs}px 0` };
const stockOkStyle: React.CSSProperties = { color: colors.success, fontSize: 12, margin: `${spacing.xs}px 0` };
const rfqItemStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.sm, padding: `${spacing.sm}px 0`, borderBottom: `1px solid ${colors.border}` };