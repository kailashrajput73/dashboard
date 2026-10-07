import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPurchase,
  listCatalog,
  listPurchases,
  listRacks,
  type CatalogItem,
  type Purchase,
  type PurchaseLine,
  type Rack,
} from "../api/endpoints";
import { ApiError } from "../api/client";
import { Button, ErrorModal, Header, Input, AppModal } from "../components/UI";
import { Icon } from "../components/Icon";
import { colors, font, radii, spacing } from "../theme";
import { normalizeHeader, parseCsvBytes } from "../utils/csv";
import { downloadImportTemplate, PURCHASE_TEMPLATE_HEADERS } from "../utils/import-templates";
import { downloadCsv } from "../utils/download-csv";

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

function purchaseErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  const body = error.body;
  const errors = body?.data?.errors ?? body?.errors ?? body?.detail?.errors;
  if (Array.isArray(errors) && errors.length > 0) return errors.map(String).join("\n");
  return error.message || fallback;
}

const inputStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: 42,
  padding: "8px 11px",
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: radii.sm,
  color: colors.textPrimary,
  background: colors.surface,
  font: "inherit",
};

export default function PurchasesPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [productCode, setProductCode] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [rackId, setRackId] = useState("");
  const [rackSlot, setRackSlot] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedProduct = products.find((product) => product.productCode === productCode);
  const selectedRack = racks.find((rack) => rack.id === rackId);
  const productMatches = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return [];
    return products.filter((product) => {
      const searchable = [product.name, product.productCode, product.brand].filter(Boolean).join(" ").toLowerCase();
      return Boolean(product.productCode) && searchable.includes(query);
    });
  }, [productSearch, products]);

  const fromTime = dateBoundary(dateFrom);
  const toTime = dateBoundary(dateTo, true);
  const dateFilterError = fromTime === null
    ? "Enter the start date as YYYY-MM-DD."
    : toTime === null
      ? "Enter the end date as YYYY-MM-DD."
      : fromTime != null && toTime != null && fromTime > toTime
        ? "Start date must be on or before end date."
        : null;
  const filteredPurchases = useMemo(() => {
    if (dateFilterError) return purchases;
    return purchases.filter((purchase) => {
      const createdAt = new Date(purchase.createdAt).getTime();
      return Number.isFinite(createdAt)
        && (fromTime == null || createdAt >= fromTime)
        && (toTime == null || createdAt <= toTime);
    });
  }, [dateFilterError, fromTime, purchases, toTime]);
  const reportSummary = useMemo(() => {
    const lines = filteredPurchases.flatMap((purchase) => purchase.lines);
    return {
      transactionCount: filteredPurchases.length,
      lineCount: lines.length,
      quantity: lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
      value: lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.listPrice || 0), 0),
    };
  }, [filteredPurchases]);

  const fetchData = useCallback(() => Promise.all([
    listCatalog(),
    listRacks(),
    listPurchases(),
  ]), []);

  const applyData = useCallback(([
    nextProducts,
    nextRacks,
    nextPurchases,
  ]: Awaited<ReturnType<typeof fetchData>>) => {
    setProducts(nextProducts || []);
    setRacks(nextRacks || []);
    setPurchases(nextPurchases || []);
  }, []);

  const load = useCallback(async () => {
    try {
      applyData(await fetchData());
    } catch (cause) {
      setError(purchaseErrorMessage(cause, "Failed to load purchases"));
    }
  }, [applyData, fetchData]);

  useEffect(() => {
    let active = true;
    void fetchData()
      .then((data) => {
        if (active) applyData(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(purchaseErrorMessage(cause, "Failed to load purchases"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyData, fetchData]);

  function openCreate() {
    setProductCode("");
    setProductSearch("");
    setQuantity("1");
    setPrice("");
    setDiscount("0");
    setRackId("");
    setRackSlot("");
    setError(null);
    setSuccessMessage(null);
    setFormOpen(true);
  }

  function selectProduct(product: CatalogItem) {
    if (!product.productCode) return;
    setProductCode(product.productCode);
    setProductSearch(product.productCode);
    setPrice(String((product as CatalogItem & { lastPurchasePrice?: number }).lastPurchasePrice ?? product.standardRate));
  }

  function selectRack(nextRackId: string) {
    setRackId(nextRackId);
    setRackSlot("");
  }

  async function save() {
    const parsedQuantity = Number(quantity.trim());
    const parsedPrice = Number(price.trim());
    const parsedDiscount = Number(discount.trim());
    if (!selectedProduct?.productCode) {
      setError("Search for and select a product with a product code.");
      return;
    }
    if (!quantity.trim() || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be a number greater than zero.");
      return;
    }
    if (!price.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("List price must be a valid number greater than or equal to zero.");
      return;
    }
    if (!discount.trim() || !Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
      setError("Purchase discount must be a valid non-negative number.");
      return;
    }
    if (rackId && !rackSlot) {
      setError("Select a slot for the chosen rack, or clear the rack selection.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPurchase([{
        productCode: selectedProduct.productCode,
        quantity: parsedQuantity,
        listPrice: parsedPrice,
        purchaseDiscount: parsedDiscount,
        rackId: rackId || undefined,
        rackSlot: rackSlot || undefined,
      }]);
      setFormOpen(false);
      await load();
    } catch (cause) {
      setError(purchaseErrorMessage(cause, "Could not save purchase"));
    } finally {
      setSaving(false);
    }
  }

  function onBulkFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void bulkUpload(file);
  }

  async function bulkUpload(file: File) {
    setSuccessMessage(null);
    try {
      const parsed = parseCsvBytes(new Uint8Array(await file.arrayBuffer()));
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }

      const getValue = (row: Record<string, string>, ...headers: string[]) => {
        for (const header of headers) {
          const value = row[normalizeHeader(header)];
          if (value?.trim()) return value.trim();
        }
        return "";
      };
      const validationErrors: string[] = [];
      const lines: PurchaseLine[] = [];
      parsed.rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const code = getValue(row, "productCode", "product code");
        const quantityText = getValue(row, "quantity");
        const priceText = getValue(row, "listPrice", "list price");
        const discountText = getValue(row, "purchaseDiscount", "discount");
        const rack = getValue(row, "rackId", "rack id");
        const slot = getValue(row, "rackSlot", "rack slot");
        const lineQuantity = Number(quantityText.replace(/,/g, ""));
        const linePrice = Number(priceText.replace(/,/g, ""));
        const lineDiscount = discountText ? Number(discountText.replace(/,/g, "")) : 0;
        let valid = true;

        if (!code) {
          validationErrors.push(`Row ${rowNumber}: productCode is required.`);
          valid = false;
        }
        if (!quantityText || !Number.isFinite(lineQuantity) || lineQuantity <= 0) {
          validationErrors.push(`Row ${rowNumber}: quantity must be a number greater than zero.`);
          valid = false;
        }
        if (!priceText || !Number.isFinite(linePrice) || linePrice < 0) {
          validationErrors.push(`Row ${rowNumber}: listPrice must be a valid non-negative number.`);
          valid = false;
        }
        if (discountText && (!Number.isFinite(lineDiscount) || lineDiscount < 0)) {
          validationErrors.push(`Row ${rowNumber}: purchaseDiscount must be a valid non-negative number.`);
          valid = false;
        }
        if (rack && !slot) {
          validationErrors.push(`Row ${rowNumber}: rackSlot is required when rackId is set.`);
          valid = false;
        }
        if (valid) {
          lines.push({
            productCode: code,
            quantity: lineQuantity,
            listPrice: linePrice,
            purchaseDiscount: lineDiscount,
            rackId: rack || undefined,
            rackSlot: slot || undefined,
          });
        }
      });
      if (validationErrors.length > 0) {
        setError(validationErrors.join("\n"));
        return;
      }

      setSaving(true);
      setError(null);
      await createPurchase(lines);
      await load();
      setSuccessMessage(`Imported ${lines.length} purchase line${lines.length === 1 ? "" : "s"}.`);
    } catch (cause) {
      setError(purchaseErrorMessage(cause, "Bulk purchase import failed"));
    } finally {
      setSaving(false);
    }
  }

  function exportPurchasesCsv() {
    const cell = (value: string | number | undefined) => {
      const text = String(value ?? "");
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows = filteredPurchases.flatMap((transaction) =>
      transaction.lines.map((line) =>
        [line.productCode, line.quantity, line.listPrice, line.purchaseDiscount ?? 0, line.rackId, line.rackSlot]
          .map(cell)
          .join(","),
      ),
    );
    const csv = `\uFEFF${[PURCHASE_TEMPLATE_HEADERS.join(","), ...rows].join("\n")}`;
    try {
      downloadCsv(csv, "purchases.csv");
    } catch {
      setError("Could not export purchases.");
    }
  }

  const headerActions = (
    <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
      <button
        type="button"
        data-testid="export-purchases"
        aria-label="Export filtered purchase lines as CSV"
        disabled={!!dateFilterError}
        onClick={exportPurchasesCsv}
        style={iconActionStyle}
      >
        <Icon name="download-outline" size={23} color={dateFilterError ? colors.textMuted : colors.primary} />
      </button>
      <button type="button" data-testid="open-add-purchase" aria-label="Add purchase" onClick={openCreate} style={iconActionStyle}>
        <Icon name="add-circle" size={26} color={colors.primary} />
      </button>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Purchases"
        subtitle={`${reportSummary.transactionCount} of ${purchases.length} transaction${purchases.length === 1 ? "" : "s"}`}
        onBack={() => navigate(-1)}
        right={headerActions}
      />
      <div style={contentStyle}>
        <section style={reportStyle}>
          <div style={dateFiltersStyle}>
            <Input testID="purchase-date-from" label="From date" value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
            <Input testID="purchase-date-to" label="To date" value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
          </div>
          {dateFilterError ? <p style={validationStyle}>{dateFilterError}</p> : null}
          <p data-testid="purchase-report-summary" style={summaryStyle}>
            {reportSummary.transactionCount} transactions · {reportSummary.lineCount} lines · Qty {reportSummary.quantity} · List value ₹{reportSummary.value.toLocaleString()}
          </p>
          <p style={hintStyle}>CSV headers: {PURCHASE_TEMPLATE_HEADERS.join(", ")}. Also accepts Product Code, List Price, and discount.</p>
          {successMessage ? <p data-testid="purchase-success" style={successStyle}>{successMessage}</p> : null}
        </section>

        {loading ? (
          <div style={centerStyle}><span className="web-button-spinner" role="status" aria-label="Loading purchases" /></div>
        ) : filteredPurchases.length === 0 ? (
          <p style={emptyStyle}>No purchases in this date range.</p>
        ) : (
          <div style={{ display: "grid", gap: spacing.sm }}>
            {filteredPurchases.map((transaction) => (
              <section key={transaction.id} data-testid={`purchase-${transaction.id}`} style={transactionStyle}>
                <p style={dateStyle}>{new Date(transaction.createdAt).toLocaleString()}</p>
                {transaction.lines.map((line, index) => (
                  <div key={`${transaction.id}-${index}`} style={lineStyle}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={productNameStyle}>{line.productName}</div>
                      <div style={metaStyle}>{line.productCode} · Qty {line.quantity}</div>
                    </div>
                    <strong style={{ color: colors.textPrimary }}>₹{line.listPrice}</strong>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      <div style={footerStyle}>
        <Button testID="download-purchase-template" title="Template" icon="download-outline" onPress={() => downloadImportTemplate("purchase")} size="sm" variant="ghost" />
        <Button testID="bulk-purchase-import" title="Bulk CSV" icon="cloud-upload-outline" onPress={() => fileInput.current?.click()} loading={saving} size="sm" />
        <input ref={fileInput} type="file" accept=".csv,text/csv,text/plain,*/*" onChange={onBulkFileChange} data-testid="purchase-csv-file" style={{ display: "none" }} />
        <Button testID="new-purchase" title="Record purchase" icon="add" onPress={openCreate} fullWidth />
      </div>

      <AppModal testID="purchase-form" visible={formOpen} onClose={() => setFormOpen(false)} title="Record purchase" wide>
        <Input
          testID="purchase-product-search"
          label="Product"
          value={productSearch}
          onChangeText={setProductSearch}
          placeholder="Search name, code, brand, or type/scan a code"
          autoCapitalize="none"
        />
        {productSearch.trim() ? (
          productMatches.length > 0 ? productMatches.map((product) => (
            <button
              key={product.id}
              type="button"
              data-testid={`purchase-product-${product.id}`}
              aria-pressed={product.productCode === productCode}
              onClick={() => selectProduct(product)}
              style={productOptionStyle(product.productCode === productCode)}
            >
              <span style={{ ...productNameStyle, textAlign: "left" }}>{product.name}</span>
              <span style={metaStyle}>{[product.productCode, product.brand].filter(Boolean).join(" · ")}</span>
            </button>
          )) : <p style={hintStyle}>No products matched. Check the product name, code, or brand.</p>
        ) : <p style={hintStyle}>Search by product name, code, or brand. You can type or scan a product code.</p>}
        {selectedProduct ? <p style={selectedStyle}>Selected: {selectedProduct.name} · {selectedProduct.productCode}</p> : null}
        <Input testID="purchase-quantity" label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
        <Input testID="purchase-price" label="List price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        <Input testID="purchase-discount" label="Purchase discount (%)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />

        <label style={labelStyle} htmlFor="purchase-rack-select">Rack (optional)</label>
        <select id="purchase-rack-select" data-testid="purchase-rack-picker" value={rackId} onChange={(event) => selectRack(event.currentTarget.value)} style={inputStyle}>
          <option value="">No rack (stock only)</option>
          {racks.map((rack) => <option key={rack.id} value={rack.id}>{rack.name}</option>)}
        </select>
        {selectedRack ? (
          <>
            <label style={labelStyle} htmlFor="purchase-slot-select">Rack slot</label>
            <select id="purchase-slot-select" data-testid="purchase-slot-picker" value={rackSlot} onChange={(event) => setRackSlot(event.currentTarget.value)} style={inputStyle}>
              <option value="">Select a slot</option>
              {selectedRack.slots.map((slot) => <option key={slot.code} value={slot.code}>{slot.code}</option>)}
            </select>
            {selectedRack.slots.length === 0 ? <p style={hintStyle}>This rack has no slots.</p> : null}
          </>
        ) : null}
        <Button testID="save-purchase" title={`Receive ${selectedProduct?.name || "stock"}`} onPress={() => void save()} loading={saving} disabled={!selectedProduct?.productCode} fullWidth style={{ marginTop: spacing.md }} />
      </AppModal>
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}

const contentStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: spacing.lg,
  paddingBottom: 120,
};
const reportStyle: React.CSSProperties = {
  padding: spacing.md,
  marginBottom: spacing.md,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  background: colors.surface,
};
const dateFiltersStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.md };
const summaryStyle: React.CSSProperties = { color: colors.textPrimary, fontWeight: 700, margin: `${spacing.sm}px 0` };
const hintStyle: React.CSSProperties = { color: colors.textMuted, fontSize: 12, lineHeight: 1.5, margin: `${spacing.sm}px 0` };
const validationStyle: React.CSSProperties = { color: colors.error, fontSize: 13, margin: `${spacing.sm}px 0` };
const successStyle: React.CSSProperties = { color: colors.success, background: colors.successBg, padding: spacing.sm, borderRadius: radii.sm };
const centerStyle: React.CSSProperties = { minHeight: 160, display: "grid", placeItems: "center" };
const emptyStyle: React.CSSProperties = { textAlign: "center", color: colors.textSecondary, padding: spacing.xl };
const transactionStyle: React.CSSProperties = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.md };
const dateStyle: React.CSSProperties = { color: colors.textMuted, fontSize: 12, margin: `0 0 ${spacing.sm}px` };
const lineStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.md, borderTop: `1px solid ${colors.border}`, paddingTop: spacing.sm, marginTop: spacing.sm };
const productNameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, overflowWrap: "anywhere" };
const metaStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, marginTop: 3 };
const footerStyle: React.CSSProperties = { position: "sticky", bottom: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, padding: spacing.md, background: colors.bg, borderTop: `1px solid ${colors.border}`, zIndex: 2 };
const labelStyle: React.CSSProperties = { display: "block", color: colors.textSecondary, fontSize: 13, fontWeight: 600, margin: `${spacing.sm}px 0 6px` };
const selectedStyle: React.CSSProperties = { color: colors.primary, fontSize: 12, margin: `${spacing.sm}px 0` };
const iconActionStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, border: 0, borderRadius: radii.sm, background: "transparent", cursor: "pointer", flexShrink: 0 };

function productOptionStyle(selected: boolean): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    alignItems: "stretch",
    border: `1px solid ${selected ? colors.primary : colors.border}`,
    background: selected ? colors.primaryLight : colors.surface,
    borderRadius: radii.sm,
    padding: spacing.sm,
    margin: `${spacing.xs}px 0`,
    textAlign: "left",
    cursor: "pointer",
  };
}
