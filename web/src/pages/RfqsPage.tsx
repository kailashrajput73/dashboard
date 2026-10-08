import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { approveRfq, createDispatch, createRfq, listCatalog, listPartners, listRfqs, rfqHistory, updateRfq, type CatalogItem, type Partner, type Rfq, type RfqLine } from "../api/endpoints";
import { ApiError } from "../api/client";
import { AppModal, Button, Chip, ErrorModal, Header, Input } from "../components/UI";
import { Icon } from "../components/Icon";
import { colors, font, radii, spacing } from "../theme";
import { formatMoney } from "../utils/money";
import { downloadCsv } from "../utils/download-csv";

type RfqStatus = "all" | "pending" | "approved" | "rejected" | "dispatched";
type EditableLine = { productCode: string; quantity: string; productName?: string; unitPrice?: number };

function linesToEditable(lines: RfqLine[]): EditableLine[] {
  return lines.map((line) => ({ productCode: line.productCode, quantity: String(line.quantity), productName: line.productName, unitPrice: line.unitPrice }));
}

function editableToApi(lines: EditableLine[]): RfqLine[] {
  return lines.map((line) => ({ productCode: line.productCode.trim(), quantity: Number(line.quantity) }));
}

function getPartnerMatches(partners: Partner[], query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return partners;
  return partners.filter((partner) => [partner.id, partner.name, partner.phone, partner.businessName, partner.city, partner.area].filter(Boolean).join(" ").toLowerCase().includes(value));
}

function getProductMatches(products: CatalogItem[], query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return products.slice(0, 20);
  return products.filter((product) => [product.name, product.productCode, product.brand, product.category].filter(Boolean).join(" ").toLowerCase().includes(value)).slice(0, 20);
}

function estimatedRewardAfterDiscount(total: number, discountPercent: number) {
  return Math.floor(Math.max(0, total * (100 - discountPercent) / 100) / 100);
}

function formatHistorySummary(event: any): string | null {
  const details = event?.details ?? event?.detail ?? event?.payload ?? event?.meta ?? null;
  if (!details) return null;
  if (typeof details === "string") return details;
  if (typeof details !== "object") return null;
  const summary: string[] = [];
  if (details.lineCount != null) summary.push(`${details.lineCount} line${details.lineCount === 1 ? "" : "s"}`);
  if (details.specialDiscountPercent != null) summary.push(`discount ${Number(details.specialDiscountPercent)}%`);
  if (details.rewardPoints != null) summary.push(`reward ${Number(details.rewardPoints)} pts`);
  if (details.grandTotal != null) summary.push(`total ₹${formatMoney(Number(details.grandTotal))}`);
  if (details.deliveryMode) summary.push(details.deliveryMode === "storePickup" ? "pickup" : "delivery");
  if (details.scheduledAt) summary.push(`schedule ${details.scheduledAt}`);
  return summary.join(" · ") || JSON.stringify(details);
}

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

function rfqLineTotal(rfq: Rfq) {
  return rfq.lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);
}

function statusLabel(status: RfqStatus) {
  if (status === "all") return "All";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function rfqErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Failed to load RFQs";
  const body = error.body;
  const errors = body?.data?.errors ?? body?.errors ?? body?.detail?.errors ?? body?.detail?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) return errors.map(String).join("\n");
  return error.message || "Failed to load RFQs";
}

function csvCell(value: string | number | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function SummaryCell(props: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ ...summaryCellStyle, ...(props.highlight ? summaryHighlightStyle : {}) }}>
      <span style={summaryLabelStyle}>{props.label}</span>
      <strong style={{ color: props.highlight ? colors.primary : colors.textPrimary }}>{props.value}</strong>
    </div>
  );
}

export default function RfqsPage() {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [status, setStatus] = useState<RfqStatus>("all");
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Rfq | null>(null);
  const [editLines, setEditLines] = useState<EditableLine[]>([]);
  const [scanCode, setScanCode] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [productCode, setProductCode] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [deliveryMode, setDeliveryMode] = useState<"storePickup" | "homeDelivery">("storePickup");
  const [scheduledAt, setScheduledAt] = useState("");
  const [discount, setDiscount] = useState("0");
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const partnerById = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [partners]);
  const fromTime = dateBoundary(dateFrom);
  const toTime = dateBoundary(dateTo, true);
  const dateFilterError = fromTime === null
    ? "Enter the start date as YYYY-MM-DD."
    : toTime === null
      ? "Enter the end date as YYYY-MM-DD."
      : fromTime != null && toTime != null && fromTime > toTime
        ? "Start date must be on or before end date."
        : null;

  const fetchData = useCallback(() => Promise.all([listRfqs(), listPartners(), listCatalog()]), []);
  const applyData = useCallback(([nextRfqs, nextPartners, nextProducts]: Awaited<ReturnType<typeof fetchData>>) => {
    setRfqs(nextRfqs || []);
    setPartners(nextPartners || []);
    setProducts(nextProducts || []);
  }, []);
  const load = useCallback(async () => applyData(await fetchData()), [applyData, fetchData]);

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
        if (active) setError(rfqErrorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyData, fetchData]);

  const partnerOptions = useMemo(() => {
    const ids = new Set(rfqs.map((rfq) => rfq.partnerId).filter(Boolean));
    return [...ids]
      .map((id) => partnerById.get(id))
      .filter((partner): partner is Partner => Boolean(partner));
  }, [partnerById, rfqs]);
  const managerOptions = useMemo(
    () => [...new Set(partners.map((partner) => partner.salesManager?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b)),
    [partners],
  );
  const partnerMatches = useMemo(() => getPartnerMatches(partners, partnerSearch), [partners, partnerSearch]);
  const productMatches = useMemo(() => getProductMatches(products, productSearch), [products, productSearch]);
  const selectedCreatePartner = partnerId ? partnerById.get(partnerId) : null;
  const selectedCreateProduct = productCode ? products.find((product) => product.productCode === productCode) : null;
  const scanProduct = products.find((product) => product.productCode?.toLowerCase() === scanCode.trim().toLowerCase());
  const canEditSelected = selected && !["dispatched", "cancelled"].includes(selected.status);
  const stockByCode = useMemo(() => new Map(products.filter((product) => product.productCode).map((product) => [product.productCode as string, Number(product.stock ?? 0)])), [products]);
  const dispatchStockIssues = useMemo(() => {
    if (!selected || selected.status !== "approved") return [];
    const issues: string[] = [];
    selected.lines.forEach((line) => {
      const stock = stockByCode.get(line.productCode);
      if (stock == null) issues.push(`${line.productName || line.productCode}: not in catalog`);
      else if (stock < line.quantity) issues.push(`${line.productName || line.productCode}: need ${line.quantity}, stock ${stock}`);
    });
    return issues;
  }, [selected, stockByCode]);
  const pendingRewardEstimate = selected?.status === "pending"
    ? estimatedRewardAfterDiscount(selected.grandTotal != null ? Number(selected.grandTotal) : rfqLineTotal(selected), Number(discount) || 0)
    : 0;

  const statusCounts = useMemo(() => {
    const counts: Record<RfqStatus, number> = { all: rfqs.length, pending: 0, approved: 0, rejected: 0, dispatched: 0 };
    rfqs.forEach((rfq) => {
      if (rfq.status in counts && rfq.status !== "all") counts[rfq.status as Exclude<RfqStatus, "all">] += 1;
    });
    return counts;
  }, [rfqs]);

  const filteredRfqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rfqs.filter((rfq) => {
      if (status !== "all" && rfq.status !== status) return false;
      if (partnerFilter !== "all" && rfq.partnerId !== partnerFilter) return false;
      const partner = partnerById.get(rfq.partnerId);
      if (managerFilter !== "all" && partner?.salesManager !== managerFilter) return false;
      const createdAt = new Date(rfq.createdAt).getTime();
      if (!dateFilterError && Number.isFinite(createdAt)) {
        if (fromTime != null && createdAt < fromTime) return false;
        if (toTime != null && createdAt > toTime) return false;
      }
      if (!query) return true;
      const searchable = [
        rfq.id,
        rfq.partnerId,
        partner?.name,
        partner?.phone,
        partner?.businessName,
        ...rfq.lines.map((line) => `${line.productName || ""} ${line.productCode || ""}`),
      ].filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [dateFilterError, fromTime, managerFilter, partnerById, partnerFilter, rfqs, search, status, toTime]);

  const summary = useMemo(() => {
    const lines: RfqLine[] = filteredRfqs.flatMap((rfq) => rfq.lines);
    return {
      rfqCount: filteredRfqs.length,
      lineCount: lines.length,
      quantity: lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
      value: filteredRfqs.reduce((sum, rfq) => sum + (rfq.grandTotal != null && rfq.status !== "pending" ? Number(rfq.grandTotal) : rfqLineTotal(rfq)), 0),
    };
  }, [filteredRfqs]);

  function partnerTitle(id: string) {
    return partnerById.get(id)?.name || `Partner ${id.slice(0, 8)}`;
  }

  function partnerSubtitle(id: string) {
    const partner = partnerById.get(id);
    if (!partner) return id;
    return [partner.phone, partner.city || partner.area].filter(Boolean).join(" · ") || partner.businessName || id.slice(0, 8);
  }

  function openCreate() {
    setPartnerId("");
    setPartnerSearch("");
    setProductCode("");
    setProductSearch("");
    setQuantity("1");
    setDeliveryMode("storePickup");
    setScheduledAt("");
    setSuccessMessage(null);
    setCreateOpen(true);
  }

  async function saveCreate() {
    const safeQuantity = Number(quantity);
    if (!partnerId.trim()) return setError("Select a partner before creating the RFQ.");
    if (!productCode) return setError("Search for and select a product with a valid product code.");
    if (!Number.isFinite(safeQuantity) || safeQuantity <= 0) return setError("Quantity must be a positive number.");
    setSaving(true);
    setError(null);
    try {
      await createRfq({ partnerId: partnerId.trim(), lines: [{ productCode, quantity: safeQuantity }], deliveryMode, scheduledAt: scheduledAt || undefined });
      setCreateOpen(false);
      setSuccessMessage("RFQ created.");
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not create RFQ");
    } finally {
      setSaving(false);
    }
  }

  async function openDetails(rfq: Rfq) {
    setSelected(rfq);
    setEditLines(linesToEditable(rfq.lines));
    setScanCode("");
    setDeliveryMode(rfq.deliveryMode);
    setScheduledAt(rfq.scheduledAt || "");
    setDiscount(String(rfq.specialDiscountPercent || 0));
    setHistory([]);
    setError(null);
    try {
      setHistory(await rfqHistory(rfq.id));
    } catch {
      setHistory([]);
    }
  }

  function closeDetails() {
    setSelected(null);
    setEditLines([]);
    setScanCode("");
    setHistory([]);
  }

  function addScannedLine() {
    if (!scanProduct?.productCode) return setError("Enter a valid product code from the catalog.");
    const existing = editLines.find((line) => line.productCode === scanProduct.productCode);
    if (existing) {
      setEditLines(editLines.map((line) => line.productCode === scanProduct.productCode ? { ...line, quantity: String(Number(line.quantity) + 1) } : line));
    } else {
      setEditLines([...editLines, { productCode: scanProduct.productCode, quantity: "1", productName: scanProduct.name, unitPrice: scanProduct.sellingPrice ?? scanProduct.standardRate }]);
    }
    setScanCode("");
  }

  async function saveLineChanges() {
    if (!selected || !canEditSelected) return;
    const lines = editableToApi(editLines);
    if (!lines.length || lines.some((line) => !line.productCode || !Number.isFinite(line.quantity) || line.quantity <= 0)) {
      setError("Each line needs a product code and positive quantity.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateRfq(selected.id, { partnerId: selected.partnerId, lines, deliveryMode, scheduledAt: scheduledAt || undefined });
      setSelected(updated);
      setEditLines(linesToEditable(updated.lines));
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save RFQ lines");
    } finally {
      setSaving(false);
    }
  }

  async function decide(approved: boolean) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await approveRfq(selected.id, {
        approved,
        specialDiscountPercent: Number(discount) || 0,
        rewardPoints: 0,
        deliveryMode,
        scheduledAt: scheduledAt || undefined,
      });
      closeDetails();
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not update RFQ");
    } finally {
      setSaving(false);
    }
  }

  async function dispatchSelected() {
    if (!selected || selected.status !== "approved") {
      setError("Only approved RFQs can be dispatched.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createDispatch({
        sourceRfqId: selected.id,
        lines: selected.lines.map((line) => ({ productCode: line.productCode, quantity: line.quantity })),
      });
      closeDetails();
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not dispatch RFQ");
    } finally {
      setSaving(false);
    }
  }

  function updateLineQuantity(index: number, value: string) {
    setEditLines(editLines.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: value } : line));
  }

  function exportCsv() {
    if (!filteredRfqs.length) return;
    const header = ["rfqId", "partnerId", "partnerName", "partnerPhone", "status", "productCode", "productName", "quantity", "unitPrice", "lineSubtotal", "specialDiscountPercent", "rewardPoints", "grandTotal", "deliveryMode", "scheduledAt", "createdAt"];
    const rows = filteredRfqs.flatMap((rfq) => {
      const partner = partnerById.get(rfq.partnerId);
      return rfq.lines.map((line) => [
        rfq.id,
        rfq.partnerId,
        partner?.name || "",
        partner?.phone || "",
        rfq.status,
        line.productCode,
        line.productName || "",
        line.quantity,
        Number(line.unitPrice ?? 0),
        Number(line.quantity || 0) * Number(line.unitPrice || 0),
        rfq.specialDiscountPercent || 0,
        rfq.rewardPoints || 0,
        rfq.grandTotal != null && rfq.status !== "pending" ? Number(rfq.grandTotal) : rfqLineTotal(rfq),
        rfq.deliveryMode,
        rfq.scheduledAt || "",
        rfq.createdAt,
      ]);
    });
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    try {
      downloadCsv(`\uFEFF${csv}`, `rfqs-${new Date().toISOString().slice(0, 10)}.csv`);
      setSuccessMessage(`Exported ${filteredRfqs.length} RFQ${filteredRfqs.length === 1 ? "" : "s"}.`);
      setError(null);
    } catch {
      setError("Could not open RFQ export.");
    }
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="RFQ Management"
        subtitle={`${statusCounts.pending} pending · ${statusCounts.approved} approved`}
        onBack={() => navigate(-1)}
        right={<div style={headerActionsStyle}><button type="button" data-testid="export-rfqs" aria-label="Export RFQs CSV" title="Export RFQs CSV" onClick={exportCsv} disabled={!filteredRfqs.length} style={exportButtonStyle}><Icon name="download-outline" size={23} color={filteredRfqs.length ? colors.primary : colors.textMuted} /></button><button type="button" data-testid="open-add-rfq" aria-label="Create RFQ" title="Create RFQ" onClick={openCreate} style={exportButtonStyle}><Icon name="add-circle" size={25} color={colors.primary} /></button></div>}
      />
      <div style={controlsStyle}>
        <Input testID="rfq-search" value={search} onChangeText={setSearch} placeholder="Search partner, phone, product, or code" style={{ marginBottom: spacing.sm }} />
        <div style={filtersStyle}>
          {(["all", "pending", "approved", "rejected", "dispatched"] as RfqStatus[]).map((key) => (
            <Chip key={key} label={`${statusLabel(key)} (${statusCounts[key]})`} selected={status === key} onPress={() => setStatus(key)} testID={`rfq-filter-${key}`} />
          ))}
        </div>
        <div style={filtersStyle}>
          <Chip label="All partners" selected={partnerFilter === "all"} onPress={() => setPartnerFilter("all")} testID="rfq-partner-filter-all" />
          {partnerOptions.map((partner) => <Chip key={partner.id} label={partner.name || partner.id.slice(0, 8)} selected={partnerFilter === partner.id} onPress={() => setPartnerFilter(partner.id)} testID={`rfq-partner-filter-${partner.id}`} />)}
        </div>
        {managerOptions.length > 0 ? (
          <div style={filtersStyle}>
            <Chip label="All managers" selected={managerFilter === "all"} onPress={() => setManagerFilter("all")} testID="rfq-manager-filter-all" />
            {managerOptions.map((manager) => <Chip key={manager} label={manager} selected={managerFilter === manager} onPress={() => setManagerFilter(manager)} testID={`rfq-manager-filter-${manager}`} />)}
          </div>
        ) : null}
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
          <div style={summaryGridStyle}>
            <SummaryCell label="RFQs" value={String(summary.rfqCount)} />
            <SummaryCell label="Lines" value={String(summary.lineCount)} />
            <SummaryCell label="Qty" value={String(summary.quantity)} />
            <SummaryCell label="Total" value={`₹${formatMoney(summary.value)}`} highlight />
          </div>
        </section>
        {loading ? <div style={centerStyle}><span className="web-button-spinner" role="status" aria-label="Loading RFQs" /></div> : filteredRfqs.length === 0 ? <p style={emptyStyle}>No RFQs match this filter.</p> : (
          <div style={rowsStyle}>
            {filteredRfqs.map((rfq) => (
              <button type="button" key={rfq.id} data-testid={`rfq-row-${rfq.id}`} onClick={() => openDetails(rfq)} style={rowStyle}>
                <div style={rowMainStyle}>
                  <strong style={partnerNameStyle}>{partnerTitle(rfq.partnerId)}</strong>
                  <div style={metaStyle}>{partnerSubtitle(rfq.partnerId)}</div>
                  <div style={metaStyle}>{rfq.lines.length} item{rfq.lines.length === 1 ? "" : "s"} · {rfq.deliveryMode === "storePickup" ? "Pickup" : "Delivery"}{rfq.scheduledAt ? ` · ${rfq.scheduledAt}` : ""}</div>
                  <div style={metaStyle}>{rfq.lines.map((line) => `${line.productName || line.productCode} × ${line.quantity}`).join(" · ")}</div>
                  <div style={dateStyle}>{new Date(rfq.createdAt).toLocaleString()}</div>
                </div>
                <div style={rowRightStyle}>
                  <strong style={amountStyle}>₹{formatMoney(rfqLineTotal(rfq))}</strong>
                  <span style={rewardStyle}>{rfq.rewardPoints ? `${rfq.rewardPoints} pts` : "— pts"}</span>
                  <span style={{ ...statusStyle, ...statusColor(rfq.status) }}>{statusLabel((rfq.status in statusCounts ? rfq.status : "pending") as RfqStatus)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <AppModal testID="create-rfq-modal" visible={createOpen} onClose={() => setCreateOpen(false)} title="Create RFQ">
        <Input testID="rfq-partner-search" label="Partner search" value={partnerSearch} onChangeText={setPartnerSearch} placeholder="Name, phone, business, or ID" autoCapitalize="none" />
        {selectedCreatePartner ? <p style={selectedBadgeStyle}>{selectedCreatePartner.name} · {selectedCreatePartner.phone || selectedCreatePartner.id}</p> : null}
        {partnerMatches.slice(0, 8).map((partner) => <button type="button" key={partner.id} onClick={() => { setPartnerId(partner.id); setPartnerSearch(`${partner.name} • ${partner.phone || partner.id}`); }} style={pickerRowStyle}><strong>{partner.name}</strong><span style={metaStyle}>{partner.businessName || partner.phone || partner.id}</span></button>)}
        {partnerMatches.length === 0 && partnerSearch.trim() ? <p style={metaStyle}>No matching partners found.</p> : null}
        <Input testID="rfq-product-search" label="Product search" value={productSearch} onChangeText={setProductSearch} placeholder="Search by product name or code" autoCapitalize="characters" />
        {selectedCreateProduct ? <p style={selectedBadgeStyle}>{selectedCreateProduct.name} · {selectedCreateProduct.productCode}</p> : null}
        {productMatches.map((product) => <button type="button" key={product.id} onClick={() => { if (!product.productCode) return; setProductCode(product.productCode); setProductSearch(`${product.name} • ${product.productCode}`); }} style={pickerRowStyle}><strong>{product.name}</strong><span style={metaStyle}>{product.productCode || "No product code"}</span></button>)}
        {productMatches.length === 0 && productSearch.trim() ? <p style={metaStyle}>No matching catalog products found.</p> : null}
        <Input testID="rfq-quantity" label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
        <div style={deliveryPickerStyle}>
          <Chip label="Store pickup" selected={deliveryMode === "storePickup"} onPress={() => setDeliveryMode("storePickup")} />
          <Chip label="Home delivery" selected={deliveryMode === "homeDelivery"} onPress={() => setDeliveryMode("homeDelivery")} />
        </div>
        <Input testID="rfq-schedule" label="Pickup/delivery date and time" value={scheduledAt} onChangeText={setScheduledAt} placeholder="2026-09-01 10:00" />
        <Button testID="save-rfq" title={`Submit ${selectedCreateProduct?.name || "RFQ"}`} onPress={saveCreate} loading={saving} disabled={!partnerId || !productCode || Number(quantity) <= 0} fullWidth />
      </AppModal>
      <AppModal testID="rfq-details-modal" visible={!!selected} onClose={closeDetails} title={selected ? partnerTitle(selected.partnerId) : "RFQ"} wide>
        {selected ? <>
          <section style={detailsSummaryStyle}>
            <SummaryCell label="Status" value={statusLabel((selected.status in statusCounts ? selected.status : "pending") as RfqStatus)} />
            <SummaryCell label="Total" value={`₹${formatMoney(rfqLineTotal(selected))}`} highlight />
            <SummaryCell label="Reward points" value={String(selected.rewardPoints || 0)} />
            <SummaryCell label="Delivery" value={selected.deliveryMode === "storePickup" ? "Store pickup" : "Home delivery"} />
            <p style={metaStyle}>RFQ {selected.id.slice(0, 8)} · {partnerSubtitle(selected.partnerId)}</p>
            {selected.scheduledAt ? <p style={metaStyle}>Scheduled: {selected.scheduledAt}</p> : null}
          </section>
          <h3 style={sectionTitleStyle}>Products ({editLines.length})</h3>
          {editLines.map((line, index) => <div key={`${line.productCode}-${index}`} style={lineCardStyle}>
            <div style={{ minWidth: 0, flex: 1 }}><strong>{line.productName || line.productCode}</strong><div style={metaStyle}>{line.productCode}</div><div style={metaStyle}>₹{formatMoney(line.unitPrice || 0)} each · line ₹{formatMoney((Number(line.quantity) || 0) * (line.unitPrice || 0))}</div></div>
            {canEditSelected ? <div style={lineActionsStyle}><Input testID={`rfq-line-qty-${index}`} value={line.quantity} onChangeText={(value) => updateLineQuantity(index, value)} keyboardType="decimal-pad" style={{ width: 80, marginBottom: 0 }} /><button type="button" aria-label={`Remove ${line.productName || line.productCode}`} data-testid={`rfq-line-remove-${index}`} onClick={() => setEditLines(editLines.filter((_, lineIndex) => lineIndex !== index))} style={removeButtonStyle}><Icon name="trash-outline" size={20} color={colors.error} /></button></div> : <strong>Qty {line.quantity}</strong>}
          </div>)}
          {canEditSelected ? <div style={editControlsStyle}>
            <Input testID="rfq-scan-code" label="Add product (scan or type code)" value={scanCode} onChangeText={setScanCode} placeholder="Product code" autoCapitalize="characters" />
            <p style={metaStyle}>{scanProduct ? `${scanProduct.name} — ready to add` : "Enter a catalog product code"}</p>
            <Button testID="rfq-add-scanned" title="Add to order" onPress={addScannedLine} disabled={!scanProduct} size="sm" />
            <div style={deliveryPickerStyle}>
              <Chip label="Store pickup" selected={deliveryMode === "storePickup"} onPress={() => setDeliveryMode("storePickup")} />
              <Chip label="Home delivery" selected={deliveryMode === "homeDelivery"} onPress={() => setDeliveryMode("homeDelivery")} />
            </div>
            <Input testID="rfq-detail-schedule" label="Scheduled date and time" value={scheduledAt} onChangeText={setScheduledAt} />
            <Button testID="rfq-save-lines" title="Save changes" onPress={saveLineChanges} loading={saving} fullWidth />
          </div> : null}
          {selected.status === "pending" ? <section style={actionBlockStyle}>
            <h3 style={sectionTitleStyle}>Approval</h3>
            <Input testID="rfq-discount" label="Special discount (%)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
            <p style={metaStyle}>Estimated reward points after discount: {pendingRewardEstimate} pts</p>
            <div style={decisionActionsStyle}>
              <Button testID="approve-rfq" title="Approve + reward" onPress={() => decide(true)} loading={saving} />
              <Button testID="reject-rfq" title="Reject" variant="danger" onPress={() => decide(false)} loading={saving} />
            </div>
          </section> : null}
          {selected.status === "approved" ? <section style={actionBlockStyle}>
            <h3 style={sectionTitleStyle}>Dispatch</h3>
            <p style={metaStyle}>Stock is reduced when you dispatch. The RFQ moves to Dispatched and cannot be edited again.</p>
            {dispatchStockIssues.length ? <p role="alert" style={stockWarningStyle}>{dispatchStockIssues.join(" · ")}</p> : <p style={stockOkStyle}>Stock OK for all lines — ready to dispatch.</p>}
            <Button testID="dispatch-rfq-from-detail" title="Dispatch & deduct stock" icon="barcode-outline" onPress={dispatchSelected} loading={saving} disabled={dispatchStockIssues.length > 0} fullWidth />
          </section> : null}
          {history.length ? <section>
            <h3 style={sectionTitleStyle}>History</h3>
            {history.map((event, index) => {
              const action = event.action ?? event.type ?? "updated";
              const actor = event.actor ?? event.actorName ?? "system";
              const at = event.at ?? event.createdAt;
              const summary = formatHistorySummary(event);
              return <div key={`${at ?? index}-${index}`} style={historyBlockStyle}><div style={metaStyle}>{at ? `${new Date(at).toLocaleString()} · ` : ""}{action} · {actor}</div>{summary ? <div style={metaStyle}>{summary}</div> : null}</div>;
            })}
          </section> : null}
        </> : null}
      </AppModal>
      <ErrorModal visible={!!error} title="RFQs" message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}

function statusColor(status: string): React.CSSProperties {
  if (status === "approved") return { background: colors.successBg, color: colors.success };
  if (status === "rejected") return { background: colors.errorBg, color: colors.error };
  if (status === "dispatched") return { background: colors.primaryLight, color: colors.primary };
  return { background: colors.warningBg, color: colors.textPrimary };
}

const controlsStyle: React.CSSProperties = { padding: `${spacing.md}px ${spacing.lg}px 0` };
const filtersStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm };
const dateFiltersStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs };
const validationStyle: React.CSSProperties = { color: colors.error, fontSize: 12, margin: `${spacing.xs}px 0 ${spacing.sm}px` };
const successStyle: React.CSSProperties = { color: colors.success, background: colors.successBg, padding: `${spacing.sm}px ${spacing.lg}px`, margin: `0 ${spacing.lg}px ${spacing.sm}px`, borderRadius: radii.sm, fontWeight: 600 };
const listStyle: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: `${spacing.md}px ${spacing.lg}px ${spacing.xl}px` };
const summaryBlockStyle: React.CSSProperties = { marginBottom: spacing.md };
const summaryTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, margin: `0 0 ${spacing.sm}px` };
const summaryGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: spacing.sm };
const summaryCellStyle: React.CSSProperties = { display: "grid", gap: 4, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: `${spacing.sm}px ${spacing.md}px` };
const summaryHighlightStyle: React.CSSProperties = { background: colors.primaryLight, borderColor: colors.primary };
const summaryLabelStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 11, textTransform: "uppercase" };
const centerStyle: React.CSSProperties = { minHeight: 180, display: "grid", placeItems: "center" };
const rowsStyle: React.CSSProperties = { display: "grid", gap: spacing.sm };
const rowStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: spacing.md, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.md, minWidth: 0 };
const rowMainStyle: React.CSSProperties = { minWidth: 0, flex: 1 };
const partnerNameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, overflowWrap: "anywhere" };
const metaStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, marginTop: 3, overflowWrap: "anywhere" };
const dateStyle: React.CSSProperties = { color: colors.textMuted, fontSize: 11, marginTop: 6 };
const rowRightStyle: React.CSSProperties = { minWidth: 88, display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 };
const amountStyle: React.CSSProperties = { color: colors.textPrimary, fontSize: 18, whiteSpace: "nowrap" };
const rewardStyle: React.CSSProperties = { color: colors.primary, fontSize: 12, fontWeight: 700, marginTop: 4 };
const statusStyle: React.CSSProperties = { borderRadius: radii.pill, padding: "4px 8px", marginTop: 6, fontSize: 10, fontWeight: 700 };
const emptyStyle: React.CSSProperties = { textAlign: "center", color: colors.textSecondary, padding: spacing.xl };
const exportButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, padding: 4, border: 0, borderRadius: radii.sm, background: "transparent", cursor: "pointer", flexShrink: 0 };
const headerActionsStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.sm };
const selectedBadgeStyle: React.CSSProperties = { color: colors.primary, fontWeight: 700, margin: `0 0 ${spacing.sm}px` };
const pickerRowStyle: React.CSSProperties = { width: "100%", display: "grid", gap: 3, padding: spacing.sm, border: 0, borderBottom: `1px solid ${colors.border}`, background: colors.surface, color: colors.textPrimary, font: "inherit", textAlign: "left", cursor: "pointer" };
const deliveryPickerStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md };
const detailsSummaryStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: spacing.sm, background: colors.primaryLight, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.md };
const sectionTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, margin: `${spacing.md}px 0 ${spacing.sm}px` };
const lineCardStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.sm, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm, minWidth: 0 };
const lineActionsStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.xs, flexShrink: 0 };
const removeButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, border: 0, borderRadius: radii.sm, background: "transparent", cursor: "pointer" };
const editControlsStyle: React.CSSProperties = { marginTop: spacing.sm, paddingTop: spacing.sm, borderTop: `1px solid ${colors.border}` };
const actionBlockStyle: React.CSSProperties = { marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.border}` };
const decisionActionsStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm };
const stockWarningStyle: React.CSSProperties = { color: colors.error, fontSize: 12, margin: `0 0 ${spacing.sm}px` };
const stockOkStyle: React.CSSProperties = { color: colors.success, fontSize: 12, margin: `0 0 ${spacing.sm}px` };
const historyBlockStyle: React.CSSProperties = { marginBottom: spacing.sm };