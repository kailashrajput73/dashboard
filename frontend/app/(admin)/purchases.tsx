import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { AppModal, Button, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import { createPurchase, listCatalog, listPurchases, listRacks, type CatalogItem, type Purchase, type PurchaseLine, type Rack } from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";
import { normalizeHeader, parseCsvBytes } from "@/src/utils/csv";
import { readAssetBytes } from "@/src/utils/read-asset-bytes";
import { downloadImportTemplate, PURCHASE_TEMPLATE_HEADERS } from "@/src/utils/import-templates";

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

export default function AdminPurchases() {
  const router = useRouter();
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
  const [rackOptionsOpen, setRackOptionsOpen] = useState(false);
  const [slotOptionsOpen, setSlotOptionsOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const selectedProduct = products.find((product) => product.productCode === productCode);
  const selectedRack = racks.find((rack) => rack.id === rackId);
  const selectedSlot = selectedRack?.slots.find((slot) => slot.code === rackSlot);
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

  const load = useCallback(async () => {
    try {
      const [nextProducts, nextRacks, nextPurchases] = await Promise.all([
        listCatalog(),
        listRacks(),
        listPurchases(),
      ]);
      setProducts(nextProducts || []);
      setRacks(nextRacks || []);
      setPurchases(nextPurchases || []);
    } catch (e) {
      setError(purchaseErrorMessage(e, "Failed to load purchases"));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openCreate() {
    setProductCode("");
    setProductSearch("");
    setQuantity("1");
    setPrice("");
    setDiscount("0");
    setRackId("");
    setRackSlot("");
    setRackOptionsOpen(false);
    setSlotOptionsOpen(false);
    setError(null);
    setSuccessMessage(null);
    setFormOpen(true);
  }

  function selectProduct(product: CatalogItem) {
    if (!product.productCode) return;
    setProductCode(product.productCode);
    setProductSearch(product.productCode);
    setPrice(String(product.lastPurchasePrice ?? product.standardRate));
  }

  function selectRack(nextRackId: string) {
    setRackId(nextRackId);
    setRackSlot("");
    setRackOptionsOpen(false);
    setSlotOptionsOpen(false);
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
    } catch (e) {
      setError(purchaseErrorMessage(e, "Could not save purchase"));
    } finally {
      setSaving(false);
    }
  }

  async function bulkUpload() {
    setSuccessMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/plain", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const parsed = parseCsvBytes(await readAssetBytes(result.assets[0]));
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
    } catch (e) {
      setError(purchaseErrorMessage(e, "Bulk purchase import failed"));
    } finally {
      setSaving(false);
    }
  }

  async function exportPurchasesCsv() {
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
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "purchases.csv";
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }

      await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    } catch {
      setError("Could not export purchases.");
    }
  }

  const listHeader = (
    <View style={styles.report}>
      <View style={styles.dateFilters}>
        <View style={styles.dateField}>
          <Input testID="purchase-date-from" label="From date" value={dateFrom} onChangeText={setDateFrom} placeholder="YYYY-MM-DD" />
        </View>
        <View style={styles.dateField}>
          <Input testID="purchase-date-to" label="To date" value={dateTo} onChangeText={setDateTo} placeholder="YYYY-MM-DD" />
        </View>
      </View>
      {dateFilterError ? <Text style={styles.validationHint}>{dateFilterError}</Text> : null}
      <Text style={styles.summary} testID="purchase-report-summary">
        {reportSummary.transactionCount} transactions · {reportSummary.lineCount} lines · Qty {reportSummary.quantity} · List value ₹{reportSummary.value.toLocaleString()}
      </Text>
      <Text style={styles.csvHint}>
        CSV headers: {PURCHASE_TEMPLATE_HEADERS.join(", ")}. Also accepts Product Code, List Price, and discount.
      </Text>
      {successMessage ? <Text style={styles.successMessage} testID="purchase-success">{successMessage}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Purchases"
        subtitle={`${reportSummary.transactionCount} of ${purchases.length} transaction${purchases.length === 1 ? "" : "s"}`}
        onBack={() => router.back()}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity
              testID="export-purchases"
              accessibilityRole="button"
              accessibilityLabel="Export filtered purchase lines as CSV"
              disabled={!!dateFilterError}
              onPress={exportPurchasesCsv}
              hitSlop={8}
            >
              <Ionicons name="download-outline" size={23} color={dateFilterError ? colors.textMuted : colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity testID="open-add-purchase" accessibilityRole="button" onPress={openCreate} hitSlop={8}>
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredPurchases}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<Text style={styles.empty}>No purchases in this date range.</Text>}
          renderItem={({ item }) => (
            <View style={styles.transaction} testID={`purchase-${item.id}`}>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              {item.lines.map((line, index) => (
                <View key={`${item.id}-${index}`} style={styles.line}>
                  <View style={styles.main}>
                    <Text style={styles.name}>{line.productName}</Text>
                    <Text style={styles.meta}>{line.productCode} · Qty {line.quantity}</Text>
                  </View>
                  <Text style={styles.price}>₹{line.listPrice}</Text>
                </View>
              ))}
            </View>
          )}
        />
      )}
      <View style={styles.footer}>
        <Button testID="download-purchase-template" title="Template" icon="download-outline" onPress={() => downloadImportTemplate("purchase")} size="sm" variant="ghost" />
        <Button testID="bulk-purchase-import" title="Bulk CSV" icon="cloud-upload-outline" onPress={bulkUpload} loading={saving} size="sm" />
        <Button testID="new-purchase" title="Record purchase" icon="add" onPress={openCreate} fullWidth />
      </View>

      <AppModal testID="purchase-form" visible={formOpen} onClose={() => setFormOpen(false)} title="Record purchase">
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
            <TouchableOpacity
              key={product.id}
              testID={`purchase-product-${product.id}`}
              style={[styles.product, product.productCode === productCode && styles.selected]}
              onPress={() => selectProduct(product)}
            >
              <Text style={styles.name}>{product.name}</Text>
              <Text style={styles.meta}>{[product.productCode, product.brand].filter(Boolean).join(" · ")}</Text>
            </TouchableOpacity>
          )) : <Text style={styles.pickerHint}>No products matched. Check the product name, code, or brand.</Text>
        ) : <Text style={styles.pickerHint}>Search by product name, code, or brand. You can type or scan a product code.</Text>}
        {selectedProduct ? <Text style={styles.selectedProduct}>Selected: {selectedProduct.name} · {selectedProduct.productCode}</Text> : null}
        <Input testID="purchase-quantity" label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
        <Input testID="purchase-price" label="List price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        <Input testID="purchase-discount" label="Purchase discount (%)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />

        <Text style={styles.label}>Rack (optional)</Text>
        <TouchableOpacity testID="purchase-rack-picker" style={styles.selectButton} onPress={() => setRackOptionsOpen(!rackOptionsOpen)}>
          <Text style={styles.selectText}>{selectedRack?.name || "No rack (stock only)"}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        {rackOptionsOpen ? (
          <View style={styles.options}>
            <TouchableOpacity style={styles.option} onPress={() => selectRack("")}>
              <Text style={styles.optionText}>No rack (stock only)</Text>
            </TouchableOpacity>
            {racks.map((rack) => (
              <TouchableOpacity key={rack.id} testID={`purchase-rack-${rack.id}`} style={styles.option} onPress={() => selectRack(rack.id)}>
                <Text style={styles.optionText}>{rack.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {selectedRack ? (
          <>
            <Text style={styles.label}>Rack slot</Text>
            <TouchableOpacity testID="purchase-slot-picker" style={styles.selectButton} onPress={() => setSlotOptionsOpen(!slotOptionsOpen)}>
              <Text style={styles.selectText}>{selectedSlot?.code || "Select a slot"}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {slotOptionsOpen ? (
              <View style={styles.options}>
                {selectedRack.slots.map((slot) => (
                  <TouchableOpacity key={slot.code} testID={`purchase-slot-${slot.code}`} style={styles.option} onPress={() => { setRackSlot(slot.code); setSlotOptionsOpen(false); }}>
                    <Text style={styles.optionText}>{slot.code}</Text>
                  </TouchableOpacity>
                ))}
                {selectedRack.slots.length === 0 ? <Text style={styles.pickerHint}>This rack has no slots.</Text> : null}
              </View>
            ) : null}
          </>
        ) : null}
        <Button testID="save-purchase" title={`Receive ${selectedProduct?.name || "stock"}`} onPress={save} loading={saving} disabled={!selectedProduct?.productCode} fullWidth />
      </AppModal>
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, paddingBottom: 150 },
  report: { paddingBottom: spacing.md },
  dateFilters: { flexDirection: "row", gap: spacing.sm },
  dateField: { flex: 1, minWidth: 130 },
  summary: { color: colors.textPrimary, fontWeight: "700", marginBottom: spacing.sm },
  csvHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: spacing.sm },
  successMessage: { color: colors.success, backgroundColor: colors.successBg, padding: spacing.sm, borderRadius: radii.sm },
  validationHint: { color: colors.error, fontSize: 12, marginBottom: spacing.sm },
  transaction: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  date: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  line: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  main: { flex: 1 },
  name: { ...font.title, color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  price: { color: colors.textPrimary, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
  footer: { position: "absolute", bottom: 12, left: spacing.lg, right: spacing.lg },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { color: colors.textSecondary, fontWeight: "600", marginBottom: spacing.sm },
  pickerHint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md },
  selectedProduct: { color: colors.primary, fontSize: 12, marginBottom: spacing.sm },
  product: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  selected: { backgroundColor: colors.primaryLight },
  selectButton: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectText: { color: colors.textPrimary, fontSize: 14 },
  options: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, marginTop: -spacing.sm, marginBottom: spacing.md },
  option: { minHeight: 40, paddingHorizontal: spacing.md, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { color: colors.textPrimary, fontSize: 14 },
});
