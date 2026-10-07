import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Chip, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import { listInventory, listInventoryTransactions, listLowStock, type InventoryRow, type InventoryTransaction } from "@/src/api/endpoints";
import { colors, font, radii, spacing, isWeb } from "@/src/theme";
import { formatMoney } from "@/src/utils/money";

type InventoryView = "stock" | "low" | "moves";

type SummaryCellProps = {
  label: string;
  value: string;
  highlight?: boolean;
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

function SummaryCell({ label, value, highlight = false }: SummaryCellProps) {
  return (
    <View style={[styles.summaryCell, highlight && styles.summaryCellHighlight]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>{value}</Text>
    </View>
  );
}

export default function AdminInventory() {
  const router = useRouter();
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

  const load = useCallback(async () => {
    try {
      const [stock, lowStock, moves] = await Promise.all([listInventory(), listLowStock(), listInventoryTransactions()]);
      setRows(stock || []);
      setLow(lowStock || []);
      setTransactions(moves || []);
      setError(null);
    } catch (e) {
      setError(inventoryErrorMessage(e, "Failed to load inventory"));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

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
      inCount: filteredTransactions.filter((item) => item.type === "in").length,
      outCount: filteredTransactions.filter((item) => item.type === "out").length,
      inQty,
      outQty,
      netQty: inQty - outQty,
    };
  }, [filteredTransactions]);

  const hasVisibleExport = view === "moves" ? filteredTransactions.length > 0 : filteredRows.length > 0;
  const totalInventoryCount = view === "low" ? low.length : view === "moves" ? transactions.length : rows.length;

  async function exportCsv() {
    if (!hasVisibleExport) return;

    const isMoves = view === "moves";
    const header = isMoves
      ? ["type", "productCode", "productName", "quantity", "referenceId", "at"]
      : ["productCode", "name", "category", "brand", "stock", "reorderLevel", "unitCost", "valuation", "rackName", "rackSlot"];

    const csvData = isMoves
      ? filteredTransactions.map((item) => [
          item.type,
          item.productCode,
          item.productName,
          item.quantity,
          item.referenceId,
          item.at,
        ])
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
      if (isWeb && typeof Blob !== "undefined" && typeof document !== "undefined") {
        const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${isMoves ? "inventory-moves" : "inventory"}-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      } else {
        await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(bom + csv)}`);
      }

      setSuccessMessage(
        isMoves
          ? `Exported ${filteredTransactions.length} movement${filteredTransactions.length === 1 ? "" : "s"}.`
          : `Exported ${filteredRows.length} stock row${filteredRows.length === 1 ? "" : "s"}.`
      );
      setError(null);
    } catch {
      setError("Could not open inventory export.");
    }
  }

  const renderListHeader = () => (
    <View style={styles.summaryBlock}>
      <Text style={styles.summaryTitle}>Report summary</Text>
      <View style={styles.summaryGrid}>
        {view === "moves" ? (
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
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Stock & Inventory"
        subtitle={
          view === "moves"
            ? `${filteredTransactions.length} of ${transactions.length} movement${transactions.length === 1 ? "" : "s"}`
            : `${filteredRows.length} of ${totalInventoryCount} product${totalInventoryCount === 1 ? "" : "s"}`
        }
        onBack={() => router.back()}
        right={
          <TouchableOpacity
            testID="export-inventory"
            onPress={() => hasVisibleExport && exportCsv()}
            hitSlop={8}
            disabled={!hasVisibleExport}
          >
            <Ionicons name="download-outline" size={23} color={hasVisibleExport ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
        }
      />

      <View style={styles.controls}>
        <Input testID="inventory-search" value={search} onChangeText={setSearch} placeholder="Search product, code, category, or brand" style={styles.search} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <Chip label="Current stock" selected={view === "stock"} onPress={() => setView("stock")} testID="inventory-stock-tab" />
          <Chip label="Low stock" selected={view === "low"} onPress={() => setView("low")} testID="inventory-low-tab" />
          <Chip label="Stock in/out" selected={view === "moves"} onPress={() => setView("moves")} testID="inventory-moves-tab" />
        </ScrollView>

        {view === "moves" ? (
          <View style={styles.dateFilters}>
            <Input value={dateFrom} onChangeText={setDateFrom} placeholder="From YYYY-MM-DD" style={styles.inlineInput} />
            <Input value={dateTo} onChangeText={setDateTo} placeholder="To YYYY-MM-DD" style={styles.inlineInput} />
          </View>
        ) : null}

        {view === "moves" && dateFilterError ? <Text style={styles.validationHint}>{dateFilterError}</Text> : null}
      </View>

      {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : view === "moves" ? (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item, index) => `${item.referenceId}-${item.productCode}-${index}`}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={<Text style={styles.empty}>No stock movements match this filter.</Text>}
          renderItem={({ item }) => {
            const lowStock = item.type === "out" && Number(item.quantity || 0) > 0;
            return (
              <View style={styles.cardRow}>
                <View style={styles.rowBadgeWrap}>
                  <View style={[styles.typePill, item.type === "in" ? styles.typeIn : styles.typeOut]}>
                    <Text style={styles.typeText}>{item.type === "in" ? "IN" : "OUT"}</Text>
                  </View>
                </View>

                <View style={styles.rowMain}>
                  <Text style={styles.productName}>{item.productName}</Text>
                  <Text style={styles.meta}>{item.productCode} · {movementReferenceLabel(item.referenceId, item.type)}</Text>
                  <Text style={styles.meta}>{item.referenceId} · {new Date(item.at).toISOString().slice(0, 10)}</Text>
                </View>

                <View style={styles.rowRight}>
                  <Text style={[styles.movementQty, item.type === "in" ? styles.movementIn : styles.movementOut]}>{item.type === "in" ? "+" : "-"}{item.quantity}</Text>
                  <Text style={[styles.meta, lowStock && styles.warnText]}>{item.type === "in" ? "Stock in" : "Stock out"}</Text>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => item.productId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={<Text style={styles.empty}>No inventory records match this filter.</Text>}
          renderItem={({ item }) => {
            const isLowStock = Number(item.stock ?? 0) <= Number(item.reorderLevel ?? 0);
            return (
              <View style={styles.cardRow} testID={`inventory-${item.productId}`}>
                <View style={styles.rowMain}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.productCode || "—"}
                    {item.category || item.brand ? ` · ${[item.category, item.brand].filter(Boolean).join(" · ")}` : ""}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.rackName || item.rackSlot ? `${item.rackName || "Rack"}${item.rackSlot ? ` · ${item.rackSlot}` : ""}` : "No rack"}
                  </Text>
                </View>

                <View style={styles.rowRight}>
                  <Text style={[styles.stockValue, isLowStock && styles.lowStockText]}>{Number(item.stock ?? 0)}</Text>
                  <Text style={styles.rolText}>ROL {Number(item.reorderLevel ?? 0)}</Text>
                  <Text style={styles.valueLabel}>Valuation</Text>
                  <Text style={styles.valueText}>₹{formatMoney(Number(item.valuation ?? 0))}</Text>
                  {item.unitCost ? <Text style={styles.unitCost}>@ ₹{formatMoney(Number(item.unitCost ?? 0))}/unit</Text> : null}
                  {isLowStock ? (
                    <View style={styles.warningPill}>
                      <Text style={styles.warningText}>Low stock</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}

      <ErrorModal visible={!!error} title="Inventory" message={error || ""} onClose={() => setError(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: { marginBottom: spacing.sm },
  chipsRow: { flexDirection: "row", gap: spacing.sm, paddingRight: spacing.lg, marginBottom: spacing.sm },
  dateFilters: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  inlineInput: { flex: 1, marginBottom: 0 },
  validationHint: { color: colors.error, fontSize: 12, marginBottom: spacing.sm },
  successMessage: { color: colors.success, backgroundColor: colors.successBg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radii.sm, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },
  summaryBlock: { marginBottom: spacing.md },
  summaryTitle: { ...font.title, color: colors.textPrimary, marginBottom: spacing.sm },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  summaryCell: {
    flexBasis: "48%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryCellHighlight: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  summaryLabel: { color: colors.textSecondary, fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { color: colors.textPrimary, fontWeight: "700", fontSize: 16 },
  summaryValueHighlight: { color: colors.primary },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowBadgeWrap: { alignItems: "center", justifyContent: "center" },
  typePill: { minWidth: 50, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.sm, alignItems: "center" },
  typeIn: { backgroundColor: colors.successBg },
  typeOut: { backgroundColor: colors.errorBg },
  typeText: { fontWeight: "700", fontSize: 11, letterSpacing: 0.8 },
  rowMain: { flex: 1 },
  rowRight: { alignItems: "flex-end", minWidth: 110 },
  productName: { ...font.title, color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  stockValue: { fontSize: 28, lineHeight: 32, fontWeight: "800", color: colors.textPrimary },
  lowStockText: { color: colors.error },
  rolText: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  valueLabel: { color: colors.textMuted, fontSize: 10, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  valueText: { color: colors.textPrimary, fontWeight: "700", fontSize: 15 },
  unitCost: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  warningPill: { marginTop: 6, backgroundColor: colors.warningBg, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3 },
  warningText: { color: colors.warning, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  movementQty: { fontSize: 22, fontWeight: "800" },
  movementIn: { color: colors.success },
  movementOut: { color: colors.error },
  warnText: { color: colors.error },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
});
