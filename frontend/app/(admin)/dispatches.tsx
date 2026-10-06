import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppModal, Button, Chip, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import { createDispatch, listCatalog, listDispatches, listPartners, listRfqs, type CatalogItem, type Dispatch, type Partner, type Rfq } from "@/src/api/endpoints";
import { colors, font, radii, spacing, isWeb } from "@/src/theme";
import { formatMoney } from "@/src/utils/money";

type DispatchViewFilter = "all" | "retail" | "rfq";

type RetailCartLine = {
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  stock: number;
};

function csvCell(value: string | number | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
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

function dispatchErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  const body = error.body;
  const errors = body?.data?.errors ?? body?.errors ?? body?.detail?.errors ?? body?.detail?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) return errors.map(String).join("\n");
  return error.message || fallback;
}

function getRfqStockIssues(rfq: Rfq, stockByCode: Map<string, number>): string[] {
  const issues: string[] = [];
  for (const line of rfq.lines) {
    const stock = stockByCode.get(line.productCode);
    if (stock == null) {
      issues.push(`${line.productName || line.productCode}: not in catalog`);
    } else if (stock < Number(line.quantity || 0)) {
      issues.push(`${line.productName || line.productCode}: need ${line.quantity}, stock ${stock}`);
    }
  }
  return issues;
}

export default function AdminDispatches() {
  const router = useRouter();
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
  const stockByCode = useMemo(() => {
    return new Map(products.filter((product) => product.productCode).map((product) => [product.productCode!, Number(product.stock ?? 0)]));
  }, [products]);

  const approvedRfqs = useMemo(() => rfqs.filter((rfq) => rfq.status === "approved"), [rfqs]);
  const productMatches = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products.slice(0, 12);
    return products.filter((product) => {
      const searchable = [product.name, product.productCode, product.brand, product.category].filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(query);
    }).slice(0, 12);
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
      const haystack = [
        dispatch.id,
        dispatch.sourceRfqId,
        dispatch.customerName,
        dispatch.customerPhone,
        ...dispatch.lines.flatMap((line) => [line.productCode, line.productName]),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query) || (dispatch.sourceRfqId ? dispatch.sourceRfqId.toLowerCase().startsWith(query) : false);
    });
  }, [dateFilterError, dispatchType, dispatches, fromTime, search, toTime]);

  const reportSummary = useMemo(() => {
    const lines = filteredDispatches.flatMap((dispatch) => dispatch.lines);
    return {
      dispatchCount: filteredDispatches.length,
      lineCount: lines.length,
      quantity: lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0),
      value: lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0),
    };
  }, [filteredDispatches]);

  const load = useCallback(async () => {
    try {
      const [nextDispatches, nextProducts, nextPartners, nextRfqs] = await Promise.all([
        listDispatches(),
        listCatalog(),
        listPartners(),
        listRfqs(),
      ]);
      setDispatches(nextDispatches || []);
      setProducts(nextProducts || []);
      setPartners(nextPartners || []);
      setRfqs(nextRfqs || []);
    } catch (e) {
      setError(dispatchErrorMessage(e, "Failed to load dispatches"));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
    const nextProduct = products.find((product) => product.productCode?.trim().toLowerCase() === productCode.trim().toLowerCase());
    if (!nextProduct || !nextProduct.productCode) {
      setError("Search and select an existing catalog product before adding it to the retail cart.");
      return;
    }
    const qty = Number(retailQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Retail quantity must be a positive number.");
      return;
    }
    const stock = Number(nextProduct.stock ?? 0);
    const unitPrice = Number(nextProduct.sellingPrice ?? nextProduct.standardRate ?? 0);
    setRetailLines((current) => {
      const index = current.findIndex((line) => line.productCode === nextProduct.productCode);
      if (index >= 0) {
        return current.map((line, i) => i === index ? { ...line, quantity: line.quantity + qty } : line);
      }
      return [...current, { productCode: nextProduct.productCode!, productName: nextProduct.name, quantity: qty, unitPrice, stock }];
    });
    setProductCode("");
    setProductQuery("");
    setRetailQuantity("1");
    setError(null);
  }

  function updateRetailLine(index: number, quantity: string) {
    const numeric = Number(quantity);
    setRetailLines((current) => current.map((line, rowIndex) => rowIndex === index ? { ...line, quantity: Number.isFinite(numeric) && numeric > 0 ? numeric : 0 } : line));
  }

  function removeRetailLine(index: number) {
    setRetailLines((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  const retailStockIssues = useMemo(() => {
    return retailLines.filter((line) => line.quantity > line.stock).map((line) => `${line.productName || line.productCode}: need ${line.quantity}, stock ${line.stock}`);
  }, [retailLines]);

  const retailCartTotal = useMemo(() => {
    return retailLines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);
  }, [retailLines]);

  async function dispatchRetail() {
    if (!retailLines.length) {
      setError("Add at least one product to the retail cart before dispatching.");
      return;
    }
    if (retailStockIssues.length) {
      setError(retailStockIssues.join("\n"));
      return;
    }
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
    } catch (e) {
      setError(dispatchErrorMessage(e, "Could not dispatch retail order"));
    } finally {
      setSaving(false);
    }
  }

  async function dispatchRfq(rfq: Rfq) {
    const issues = getRfqStockIssues(rfq, stockByCode);
    if (issues.length) {
      setError(issues.join("\n"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createDispatch({
        sourceRfqId: rfq.id,
        lines: rfq.lines.map((line) => ({ productCode: line.productCode, quantity: line.quantity })),
      });
      setRfqOpen(false);
      setSuccessMessage(`RFQ ${rfq.id.slice(0, 8)} dispatched and stock reduced.`);
      await load();
    } catch (e) {
      setError(dispatchErrorMessage(e, "Could not dispatch RFQ"));
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv() {
    if (!filteredDispatches.length) return;
    const header = [
      "dispatchId",
      "createdAt",
      "sourceRfqId",
      "customerName",
      "customerPhone",
      "productCode",
      "productName",
      "quantity",
      "unitPrice",
      "lineValue",
      "type",
    ];
    const rows = filteredDispatches.flatMap((dispatch) => dispatch.lines.map((line) => [
      dispatch.id,
      dispatch.createdAt,
      dispatch.sourceRfqId || "",
      dispatch.customerName || "",
      dispatch.customerPhone || "",
      line.productCode,
      line.productName || "",
      Number(line.quantity || 0),
      Number(line.unitPrice || 0),
      (Number(line.quantity || 0) * Number(line.unitPrice || 0)),
      dispatch.sourceRfqId ? "rfq" : "retail",
    ]));
    const csv = [header, ...rows.map((row) => row.map((cell) => csvCell(cell)).join(","))].join("\n");
    const bom = "\uFEFF";
    try {
      if (isWeb && typeof Blob !== "undefined" && typeof document !== "undefined") {
        const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `dispatches-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      } else {
        await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(bom + csv)}`);
      }
      setSuccessMessage(`Exported ${rows.length} dispatch line${rows.length === 1 ? "" : "s"}.`);
      setError(null);
    } catch {
      setError("Could not open dispatch export.");
    }
  }

  function getDispatchLabel(item: Dispatch) {
    if (item.sourceRfqId) {
      const rfq = rfqs.find((entry) => entry.id === item.sourceRfqId);
      const partner = rfq ? partnerById.get(rfq.partnerId) : undefined;
      return partner ? `${partner.name} · RFQ ${item.sourceRfqId.slice(0, 8)}` : `RFQ · ${item.sourceRfqId.slice(0, 8)}`;
    }
    return item.customerName || "Retail customer";
  }

  function getDispatchMeta(item: Dispatch) {
    if (item.sourceRfqId) {
      const rfq = rfqs.find((entry) => entry.id === item.sourceRfqId);
      const partner = rfq ? partnerById.get(rfq.partnerId) : undefined;
      return partner?.phone ? `${partner.phone} · ${rfq?.partnerId || item.sourceRfqId}` : rfq?.partnerId || item.sourceRfqId;
    }
    return item.customerPhone || "Walk-in retail";
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Dispatch & Billing"
        subtitle={`${filteredDispatches.length} of ${dispatches.length} dispatch${dispatches.length === 1 ? "" : "es"}`}
        onBack={() => router.back()}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity testID="export-dispatches" onPress={() => filteredDispatches.length && exportCsv()} hitSlop={8} disabled={!filteredDispatches.length}>
              <Ionicons name="download-outline" size={23} color={filteredDispatches.length ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity testID="open-retail-dispatch" onPress={openRetail} hitSlop={8}>
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.controls}>
        <Input testID="dispatch-search" value={search} onChangeText={setSearch} placeholder="Search product, customer, or RFQ" style={styles.search} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {(["all", "retail", "rfq"] as const).map((filter) => (
            <Chip key={filter} label={filter === "all" ? "All" : filter === "retail" ? "Retail" : "RFQ-linked"} selected={dispatchType === filter} onPress={() => setDispatchType(filter)} testID={`dispatch-filter-${filter}`} />
          ))}
        </ScrollView>

        <View style={styles.dateFilters}>
          <Input value={dateFrom} onChangeText={setDateFrom} placeholder="From YYYY-MM-DD" style={styles.inlineInput} />
          <Input value={dateTo} onChangeText={setDateTo} placeholder="To YYYY-MM-DD" style={styles.inlineInput} />
        </View>

        {dateFilterError ? <Text style={styles.validationHint}>{dateFilterError}</Text> : null}

        <View style={styles.summaryBlock}>
          <Text style={styles.summaryTitle}>Report summary</Text>
          <View style={styles.summaryGrid}>
            <SummaryCell label="Dispatches" value={String(reportSummary.dispatchCount)} />
            <SummaryCell label="Lines" value={String(reportSummary.lineCount)} />
            <SummaryCell label="Qty" value={String(reportSummary.quantity)} />
            <SummaryCell label="Total" value={`₹${formatMoney(reportSummary.value)}`} highlight />
          </View>
        </View>
      </View>

      {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredDispatches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No dispatches match this filter.</Text>}
          renderItem={({ item }) => {
            const expanded = expandedDispatchId === item.id;
            return (
              <TouchableOpacity testID={`dispatch-${item.id}`} style={styles.row} onPress={() => setExpandedDispatchId((current) => current === item.id ? null : item.id)}>
                <View style={styles.rowMain}>
                  <Text style={styles.name}>{getDispatchLabel(item)}</Text>
                  <Text style={styles.meta}>{getDispatchMeta(item)}</Text>
                  <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                  <Text style={styles.meta}>{item.lines.length} line{item.lines.length === 1 ? "" : "s"} · Qty {item.lines.reduce((total, line) => total + Number(line.quantity || 0), 0)} · ₹{formatMoney(item.lines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0))}</Text>
                  {expanded ? (
                    <View style={styles.detailBox}>
                      {item.lines.map((line, index) => (
                        <Text key={`${line.productCode}-${index}`} style={styles.detailLine}>
                          {line.productName || line.productCode} × {line.quantity} · ₹{formatMoney(Number(line.unitPrice || 0))} each · ₹{formatMoney(Number(line.quantity || 0) * Number(line.unitPrice || 0))}
                        </Text>
                      ))}
                      <Text style={styles.detailLine}>Customer: {item.customerName || "—"} · {item.customerPhone || "—"}</Text>
                      {item.sourceRfqId ? <Text style={styles.detailLine}>RFQ link: {item.sourceRfqId}</Text> : null}
                    </View>
                  ) : null}
                </View>
                <View style={styles.rowRight}>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
                  <Text style={styles.typeBadge}>{item.sourceRfqId ? "RFQ" : "Retail"}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={styles.footer}>
        <Button testID="convert-rfq-dispatch" title={`Dispatch approved RFQ (${approvedRfqs.length})`} icon="swap-horizontal-outline" onPress={() => setRfqOpen(true)} fullWidth />
        <View style={{ height: spacing.sm }} />
        <Button testID="retail-billing" title="Retail customer billing" icon="receipt-outline" onPress={openRetail} fullWidth />
      </View>

      <AppModal testID="retail-dispatch-modal" visible={formOpen} onClose={() => setFormOpen(false)} title="Retail billing">
        <Input testID="dispatch-product-search" label="Search product by name, code, or brand" value={productQuery} onChangeText={setProductQuery} placeholder="Search catalog" autoCapitalize="characters" />
        <Input testID="dispatch-product-code" label="Product code" value={productCode} onChangeText={setProductCode} placeholder="PRD-..." autoCapitalize="characters" />
        {productMatches.length ? (
          <View style={styles.productList}>
            {productMatches.map((product) => (
              <TouchableOpacity key={product.id} style={styles.productRow} onPress={() => selectRetailProduct(product)}>
                <View style={styles.productInfo}>
                  <Text style={styles.name}>{product.name}</Text>
                  <Text style={styles.meta}>{product.productCode || "—"} · stock {Number(product.stock ?? 0)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={styles.addBar}>
          <View style={styles.addBarInput}>
            <Input testID="dispatch-quantity" label="Quantity" value={retailQuantity} onChangeText={setRetailQuantity} keyboardType="decimal-pad" />
          </View>
          <Button testID="retail-add-line" title="Add line" onPress={addRetailLine} size="sm" />
        </View>

        {retailLines.length ? (
          <View style={styles.cartList}>
            {retailLines.map((line, index) => (
              <View key={`${line.productCode}-${index}`} style={styles.cartLine}>
                <View style={styles.cartLineInfo}>
                  <Text style={styles.cartLineName}>{line.productName}</Text>
                  <Text style={styles.meta}>{line.productCode} · stock {line.stock}</Text>
                  <Text style={styles.meta}>₹{formatMoney(line.unitPrice)} each · total ₹{formatMoney(Number(line.quantity) * Number(line.unitPrice))}</Text>
                </View>
                <View style={styles.cartActions}>
                  <Input value={String(line.quantity)} onChangeText={(text) => updateRetailLine(index, text)} keyboardType="decimal-pad" style={styles.qtyInput} />
                  <TouchableOpacity onPress={() => removeRetailLine(index)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.totalText}>Cart total: ₹{formatMoney(retailCartTotal)}</Text>
        {retailStockIssues.length ? <Text style={styles.stockWarn}>{retailStockIssues.join(" · ")}</Text> : null}

        <Input testID="retail-customer-name" label="Customer name (optional)" value={customerName} onChangeText={setCustomerName} />
        <Input testID="retail-customer-phone" label="Customer phone (optional)" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
        <Button testID="save-retail-dispatch" title="Bill and dispatch" onPress={dispatchRetail} loading={saving} disabled={!retailLines.length || retailStockIssues.length > 0} fullWidth />
      </AppModal>

      <AppModal testID="approved-rfq-modal" visible={rfqOpen} onClose={() => setRfqOpen(false)} title="Approved RFQs" wide>
        {approvedRfqs.length ? (
          approvedRfqs.map((rfq) => {
            const issues = getRfqStockIssues(rfq, stockByCode);
            const partner = partnerById.get(rfq.partnerId);
            return (
              <View key={rfq.id} style={styles.rfqItem}>
                <View style={styles.main}>
                  <Text style={styles.name}>{partner?.name || `Partner ${rfq.partnerId.slice(0, 8)}`}</Text>
                  <Text style={styles.meta}>{partner?.phone || rfq.partnerId}</Text>
                  <Text style={styles.meta}>{rfq.lines.map((line) => `${line.productName || line.productCode} × ${line.quantity}`).join(" · ")}</Text>
                  {issues.length ? <Text style={styles.stockWarn}>{issues.join(" · ")}</Text> : <Text style={styles.stockOk}>Stock OK for all lines.</Text>}
                </View>
                <Button testID={`dispatch-rfq-${rfq.id}`} title="Dispatch" size="sm" onPress={() => dispatchRfq(rfq)} loading={saving} disabled={issues.length > 0} />
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>No approved RFQs ready for dispatch.</Text>
        )}
      </AppModal>

      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </SafeAreaView>
  );
}

function SummaryCell(props: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryLabel}>{props.label}</Text>
      <Text style={[styles.summaryValue, props.highlight && styles.summaryHighlight]}>{props.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  controls: { padding: spacing.lg, paddingBottom: spacing.sm },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  search: { marginBottom: spacing.sm },
  chipsRow: { paddingBottom: spacing.sm, gap: spacing.xs },
  dateFilters: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  inlineInput: { flex: 1 },
  validationHint: { color: colors.error, marginBottom: spacing.sm },
  summaryBlock: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  summaryTitle: { ...font.title, color: colors.textPrimary, marginBottom: spacing.sm },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  summaryCell: { width: "48%", backgroundColor: colors.bg, borderRadius: radii.sm, padding: spacing.sm },
  summaryLabel: { color: colors.textSecondary, fontSize: 12 },
  summaryValue: { color: colors.textPrimary, fontWeight: "600", marginTop: 4 },
  summaryHighlight: { color: colors.primary },
  successMessage: { color: colors.success, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, fontWeight: "600" },
  list: { padding: spacing.lg, paddingBottom: 160 },
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  rowMain: { flex: 1 },
  rowRight: { alignItems: "flex-end", gap: spacing.xs },
  name: { ...font.title, color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  typeBadge: { color: colors.primary, fontWeight: "600", fontSize: 11 },
  detailBox: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  detailLine: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  productList: { marginBottom: spacing.sm },
  productRow: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.sm, marginBottom: spacing.xs },
  productInfo: { flex: 1 },
  addBar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, marginVertical: spacing.sm },
  addBarInput: { flex: 1 },
  cartList: { marginBottom: spacing.sm },
  cartLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: spacing.sm, marginBottom: spacing.xs },
  cartLineInfo: { flex: 1 },
  cartLineName: { ...font.title, color: colors.textPrimary, fontSize: 14 },
  cartActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  qtyInput: { width: 72 },
  totalText: { color: colors.textPrimary, fontWeight: "600", marginBottom: spacing.sm },
  stockWarn: { color: colors.error, marginTop: spacing.xs, fontSize: 12 },
  stockOk: { color: colors.success, marginTop: spacing.xs, fontSize: 12 },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
  footer: { position: "absolute", bottom: 12, left: spacing.lg, right: spacing.lg },
  rfqItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
});
