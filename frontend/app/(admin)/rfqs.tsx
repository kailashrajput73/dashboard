import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppModal, Button, Chip, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import {
  approveRfq,
  createDispatch,
  createRfq,
  listCatalog,
  listRfqs,
  rfqHistory,
  updateRfq,
  type CatalogItem,
  type Rfq,
  type RfqLine,
} from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";

type EditableLine = { productCode: string; quantity: string; productName?: string; unitPrice?: number };

function linesToEditable(lines: RfqLine[]): EditableLine[] {
  return lines.map((line) => ({
    productCode: line.productCode,
    quantity: String(line.quantity),
    productName: line.productName,
    unitPrice: line.unitPrice,
  }));
}

function editableToApi(lines: EditableLine[]): RfqLine[] {
  return lines.map((line) => ({
    productCode: line.productCode.trim(),
    quantity: Number(line.quantity),
  }));
}

function csvCell(value: string | number | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function AdminRfqs() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Rfq | null>(null);
  const [editLines, setEditLines] = useState<EditableLine[]>([]);
  const [scanCode, setScanCode] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [deliveryMode, setDeliveryMode] = useState<"storePickup" | "homeDelivery">("storePickup");
  const [scheduledAt, setScheduledAt] = useState("");
  const [discount, setDiscount] = useState("0");
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextRfqs, nextProducts] = await Promise.all([
        listRfqs({ status: status === "all" ? undefined : status, search }),
        listCatalog(),
      ]);
      setRfqs(nextRfqs || []);
      setProducts(nextProducts || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load RFQs");
    }
  }, [search, status]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const product = products.find((item) => item.productCode === productCode);
  const scanProduct = products.find(
    (item) => item.productCode?.toLowerCase() === scanCode.trim().toLowerCase(),
  );
  const canEditSelected = selected && !["dispatched", "cancelled"].includes(selected.status);
  const tabs = useMemo(() => ["all", "pending", "approved", "rejected", "dispatched"], []);

  function openCreate() {
    setPartnerId("");
    setProductCode(products[0]?.productCode || "");
    setQuantity("1");
    setDeliveryMode("storePickup");
    setScheduledAt("");
    setCreateOpen(true);
  }

  async function saveCreate() {
    if (!partnerId.trim() || !productCode || Number(quantity) <= 0) {
      setError("Partner ID, product, and positive quantity are required.");
      return;
    }
    setSaving(true);
    try {
      await createRfq({
        partnerId: partnerId.trim(),
        lines: [{ productCode, quantity: Number(quantity) }],
        deliveryMode,
        scheduledAt: scheduledAt || undefined,
      });
      setCreateOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create RFQ");
    } finally {
      setSaving(false);
    }
  }

  async function openDetails(rfq: Rfq) {
    setSelected(rfq);
    setEditLines(linesToEditable(rfq.lines));
    setScanCode("");
    setDiscount(String(rfq.specialDiscountPercent || 0));
    setDeliveryMode(rfq.deliveryMode);
    setScheduledAt(rfq.scheduledAt || "");
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
  }

  function addScannedLine() {
    if (!scanProduct?.productCode) {
      setError("Enter a valid product code from the catalog.");
      return;
    }
    const existing = editLines.find((line) => line.productCode === scanProduct.productCode);
    if (existing) {
      setEditLines(
        editLines.map((line) =>
          line.productCode === scanProduct.productCode
            ? { ...line, quantity: String(Number(line.quantity) + 1) }
            : line,
        ),
      );
    } else {
      setEditLines([
        ...editLines,
        {
          productCode: scanProduct.productCode,
          quantity: "1",
          productName: scanProduct.name,
          unitPrice: scanProduct.sellingPrice ?? scanProduct.standardRate,
        },
      ]);
    }
    setScanCode("");
  }

  function removeLine(index: number) {
    setEditLines(editLines.filter((_, i) => i !== index));
  }

  function setLineQty(index: number, qty: string) {
    setEditLines(editLines.map((line, i) => (i === index ? { ...line, quantity: qty } : line)));
  }

  async function saveLineChanges() {
    if (!selected || !canEditSelected) return;
    const lines = editableToApi(editLines);
    if (!lines.length || lines.some((line) => !line.productCode || !Number.isFinite(line.quantity) || line.quantity <= 0)) {
      setError("Each line needs a product code and positive quantity.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateRfq(selected.id, {
        partnerId: selected.partnerId,
        lines,
        deliveryMode,
        scheduledAt: scheduledAt || undefined,
      });
      setSelected(updated);
      setEditLines(linesToEditable(updated.lines));
      setHistory(await rfqHistory(updated.id));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save RFQ lines");
    } finally {
      setSaving(false);
    }
  }

  async function decide(approved: boolean) {
    if (!selected) return;
    setSaving(true);
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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update RFQ");
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
    try {
      await createDispatch({
        sourceRfqId: selected.id,
        lines: selected.lines.map((line) => ({ productCode: line.productCode, quantity: line.quantity })),
      });
      closeDetails();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not dispatch RFQ");
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv() {
    const header = "id,partnerId,status,productCode,productName,quantity,deliveryMode,scheduledAt,createdAt";
    const rows = rfqs.flatMap((rfq) =>
      rfq.lines.map((line) =>
        [
          rfq.id,
          rfq.partnerId,
          rfq.status,
          line.productCode,
          line.productName || "",
          line.quantity,
          rfq.deliveryMode,
          rfq.scheduledAt || "",
          rfq.createdAt,
        ].map(csvCell).join(","),
      ),
    );
    const csv = [header, ...rows].join("\n");
    try {
      await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    } catch {
      setError("Could not open RFQ export.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="RFQ Management"
        subtitle={`${rfqs.length} request${rfqs.length === 1 ? "" : "s"} · pending → approve → edit at counter → dispatch`}
        onBack={() => router.back()}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity testID="export-rfqs" onPress={exportCsv} hitSlop={8}>
              <Ionicons name="download-outline" size={23} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity testID="open-add-rfq" onPress={openCreate} hitSlop={8}>
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />
      <View style={styles.controls}>
        <Input testID="rfq-search" value={search} onChangeText={setSearch} placeholder="Search partner, code, or product" style={styles.search} />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tabs}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.tabs}
          renderItem={({ item }) => (
            <Chip
              label={item[0].toUpperCase() + item.slice(1)}
              selected={status === item}
              onPress={() => setStatus(item)}
              testID={`rfq-filter-${item}`}
            />
          )}
        />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={rfqs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No RFQs found.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`rfq-row-${item.id}`} style={styles.row} onPress={() => openDetails(item)}>
              <View style={styles.main}>
                <Text style={styles.name}>Partner {item.partnerId}</Text>
                <Text style={styles.meta}>
                  {item.lines.length} product{item.lines.length === 1 ? "" : "s"} ·{" "}
                  {item.deliveryMode === "storePickup" ? "Store pickup" : "Home delivery"}
                </Text>
                <Text style={styles.meta}>{item.lines.map((line) => `${line.productName || line.productCode} x${line.quantity}`).join(", ")}</Text>
              </View>
              <View style={[styles.status, statusStyle(item.status)]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      <View style={styles.footer}>
        <Button testID="new-rfq" title="Create RFQ (manual)" icon="add" onPress={openCreate} fullWidth />
      </View>

      <AppModal testID="create-rfq-modal" visible={createOpen} onClose={() => setCreateOpen(false)} title="Create RFQ">
        <Input testID="rfq-partner-id" label="Partner ID" value={partnerId} onChangeText={setPartnerId} placeholder="Partner identifier" autoCapitalize="none" />
        <Text style={styles.label}>Product</Text>
        {products.slice(0, 20).map((item) => (
          <TouchableOpacity key={item.id} style={[styles.product, productCode === item.productCode && styles.selected]} onPress={() => setProductCode(item.productCode || "")}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.productCode}</Text>
          </TouchableOpacity>
        ))}
        <Input testID="rfq-quantity" label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
        <DeliveryPicker mode={deliveryMode} setMode={setDeliveryMode} />
        <Input testID="rfq-schedule" label="Pickup/delivery date and time" value={scheduledAt} onChangeText={setScheduledAt} placeholder="2026-09-01 10:00" />
        <Button testID="save-rfq" title={`Submit ${product?.name || "RFQ"}`} onPress={saveCreate} loading={saving} disabled={!productCode} fullWidth />
      </AppModal>

      <AppModal testID="rfq-details-modal" visible={!!selected} onClose={closeDetails} title={`RFQ ${selected?.id.slice(0, 8)}`}>
        <Text style={styles.meta}>Partner: {selected?.partnerId}</Text>
        <Text style={styles.meta}>Status: {selected?.status}</Text>
        <Text style={styles.meta}>Line total (before special discount): ₹{selected?.grandTotal?.toFixed?.(2) ?? selected?.grandTotal ?? 0}</Text>
        <Text style={styles.meta}>Reward on last approval: {selected?.rewardPoints || 0} pts</Text>

        {canEditSelected ? (
          <>
            <Text style={styles.sectionTitle}>Order lines</Text>
            {editLines.map((line, index) => (
              <View key={`${line.productCode}-${index}`} style={styles.lineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{line.productName || line.productCode}</Text>
                  <Text style={styles.meta}>{line.productCode}</Text>
                </View>
                <Input testID={`rfq-line-qty-${index}`} value={line.quantity} onChangeText={(v) => setLineQty(index, v)} keyboardType="decimal-pad" style={styles.qtyInput} />
                <TouchableOpacity testID={`rfq-line-remove-${index}`} onPress={() => removeLine(index)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <Input
              testID="rfq-scan-code"
              label="Add product (scan or type product code)"
              value={scanCode}
              onChangeText={setScanCode}
              placeholder="PRD-..."
              autoCapitalize="characters"
            />
            <Text style={styles.hint}>{scanProduct ? `${scanProduct.name} · tap Add` : "Code must match catalog productCode / QR payload."}</Text>
            <Button testID="rfq-add-scanned" title="Add product to RFQ" onPress={addScannedLine} disabled={!scanProduct} size="sm" />
            <Button testID="rfq-save-lines" title="Save line changes" onPress={saveLineChanges} loading={saving} fullWidth />
          </>
        ) : (
          <Text style={styles.hint}>This RFQ is closed ({selected?.status}). Open history below.</Text>
        )}

        {selected?.status === "pending" ? (
          <>
            <View style={{ height: spacing.md }} />
            <Input testID="rfq-discount" label="Special discount (%)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
            <DeliveryPicker mode={deliveryMode} setMode={setDeliveryMode} />
            <Input testID="rfq-detail-schedule" label="Scheduled date and time" value={scheduledAt} onChangeText={setScheduledAt} />
            <View style={styles.actions}>
              <Button testID="approve-rfq" title="Approve and credit reward" onPress={() => decide(true)} loading={saving} />
              <Button testID="reject-rfq" title="Reject" variant="danger" onPress={() => decide(false)} loading={saving} />
            </View>
          </>
        ) : null}

        {selected?.status === "approved" ? (
          <View style={styles.actions}>
            <Button testID="dispatch-rfq-from-detail" title="Dispatch & deduct stock" icon="barcode-outline" onPress={dispatchSelected} loading={saving} fullWidth />
            <Button testID="open-dispatch-screen" title="Open dispatch list" variant="secondary" onPress={() => { closeDetails(); router.push("/(admin)/dispatches"); }} size="sm" />
          </View>
        ) : null}

        <Text style={styles.historyTitle}>Audit history</Text>
        {history.map((event, index) => (
          <Text key={`${event.at}-${index}`} style={styles.history}>
            {event.at} · {event.action} · {event.actor}
          </Text>
        ))}
      </AppModal>
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </SafeAreaView>
  );
}

function statusStyle(status: string) {
  if (status === "approved") return styles.good;
  if (status === "rejected") return styles.bad;
  if (status === "dispatched") return styles.done;
  return styles.pending;
}

function DeliveryPicker({ mode, setMode }: { mode: "storePickup" | "homeDelivery"; setMode: (mode: "storePickup" | "homeDelivery") => void }) {
  return (
    <View style={styles.delivery}>
      <Chip label="Store pickup" selected={mode === "storePickup"} onPress={() => setMode("storePickup")} />
      <Chip label="Home delivery" selected={mode === "homeDelivery"} onPress={() => setMode("homeDelivery")} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: { marginBottom: spacing.sm },
  tabs: { gap: spacing.sm, paddingBottom: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, paddingBottom: 80 },
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  main: { flex: 1 },
  name: { ...font.title, color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  status: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 5 },
  good: { backgroundColor: colors.successBg },
  bad: { backgroundColor: colors.errorBg },
  pending: { backgroundColor: colors.warningBg },
  done: { backgroundColor: colors.primaryLight },
  statusText: { color: colors.textPrimary, fontSize: 11, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
  footer: { position: "absolute", bottom: 12, left: spacing.lg, right: spacing.lg },
  label: { color: colors.textSecondary, fontWeight: "600", marginBottom: spacing.sm },
  product: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  selected: { backgroundColor: colors.primaryLight },
  delivery: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  historyTitle: { ...font.title, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  history: { color: colors.textSecondary, fontSize: 11, marginBottom: 4 },
  sectionTitle: { ...font.title, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  lineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  qtyInput: { width: 72, marginBottom: 0 },
  hint: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.sm },
});
