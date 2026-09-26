import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  listPartners,
  listRfqs,
  rfqHistory,
  updateRfq,
  type CatalogItem,
  type Partner,
  type Rfq,
  type RfqLine,
} from "@/src/api/endpoints";
import { colors, font, radii, spacing, isWeb } from "@/src/theme";
import { formatMoney } from "@/src/utils/money";

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

function statusLabel(status: string) {
  if (status === "pending") return "Pending";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "dispatched") return "Dispatched";
  return status;
}

function lineSubtotal(line: RfqLine) {
  return (line.quantity || 0) * (line.unitPrice || 0);
}

function rfqLineTotal(rfq: Rfq) {
  if (rfq.grandTotal != null && rfq.status !== "pending") return rfq.grandTotal;
  return rfq.lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
}

export default function AdminRfqs() {
  const router = useRouter();
  const [allRfqs, setAllRfqs] = useState<Rfq[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
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

  const partnerById = useMemo(() => {
    const map = new Map<string, Partner>();
    partners.forEach((p) => map.set(p.id, p));
    return map;
  }, [partners]);

  const stockByCode = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      if (p.productCode) map.set(p.productCode, Number(p.stock ?? 0));
    });
    return map;
  }, [products]);

  const load = useCallback(async () => {
    try {
      const [nextRfqs, nextProducts, nextPartners] = await Promise.all([
        listRfqs(),
        listCatalog(),
        listPartners(),
      ]);
      setAllRfqs(nextRfqs || []);
      setProducts(nextProducts || []);
      setPartners(nextPartners || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load RFQs");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allRfqs.length, pending: 0, approved: 0, rejected: 0, dispatched: 0 };
    allRfqs.forEach((rfq) => {
      if (counts[rfq.status] != null) counts[rfq.status] += 1;
    });
    return counts;
  }, [allRfqs]);

  const filteredRfqs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRfqs.filter((rfq) => {
      if (status !== "all" && rfq.status !== status) return false;
      if (!q) return true;
      const partner = partnerById.get(rfq.partnerId);
      const blob = [
        rfq.id,
        rfq.partnerId,
        partner?.name,
        partner?.phone,
        partner?.businessName,
        ...rfq.lines.map((l) => `${l.productName} ${l.productCode}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [allRfqs, partnerById, search, status]);

  const tabs = useMemo(
    () =>
      (["all", "pending", "approved", "rejected", "dispatched"] as const).map((key) => ({
        key,
        label: key === "all" ? "All" : statusLabel(key),
        count: statusCounts[key] ?? 0,
      })),
    [statusCounts],
  );

  function partnerTitle(id: string) {
    const p = partnerById.get(id);
    if (p?.name) return p.name;
    return `Partner ${id.slice(0, 8)}`;
  }

  function partnerSubtitle(id: string) {
    const p = partnerById.get(id);
    if (!p) return id;
    return [p.phone, p.city || p.area].filter(Boolean).join(" · ") || p.businessName || id.slice(0, 8);
  }

  const product = products.find((item) => item.productCode === productCode);
  const scanProduct = products.find(
    (item) => item.productCode?.toLowerCase() === scanCode.trim().toLowerCase(),
  );
  const canEditSelected = selected && !["dispatched", "cancelled"].includes(selected.status);

  const dispatchStockIssues = useMemo(() => {
    if (!selected || selected.status !== "approved") return [] as string[];
    const issues: string[] = [];
    for (const line of selected.lines) {
      const need = line.quantity;
      const have = stockByCode.get(line.productCode);
      if (have == null) {
        issues.push(`${line.productName || line.productCode}: not in catalog`);
      } else if (have < need) {
        issues.push(`${line.productName || line.productCode}: need ${need}, stock ${have}`);
      }
    }
    return issues;
  }, [selected, stockByCode]);

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
    const header = "id,partnerId,partnerName,status,productCode,productName,quantity,deliveryMode,scheduledAt,createdAt";
    const rows = allRfqs.flatMap((rfq) =>
      rfq.lines.map((line) =>
        [
          rfq.id,
          rfq.partnerId,
          partnerById.get(rfq.partnerId)?.name || "",
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

  const selectedTotal = selected ? rfqLineTotal(selected) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="RFQ Management"
        subtitle={`${statusCounts.pending} pending · ${statusCounts.approved} approved · tap a row to review`}
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
        <Input
          testID="rfq-search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search partner, phone, product, or code"
          style={styles.search}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((tab) => (
            <Chip
              key={tab.key}
              label={`${tab.label} (${tab.count})`}
              selected={status === tab.key}
              onPress={() => setStatus(tab.key)}
              testID={`rfq-filter-${tab.key}`}
            />
          ))}
        </ScrollView>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredRfqs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No RFQs match this filter.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`rfq-row-${item.id}`} style={styles.row} onPress={() => openDetails(item)}>
              <View style={styles.main}>
                <Text style={styles.name}>{partnerTitle(item.partnerId)}</Text>
                <Text style={styles.meta}>{partnerSubtitle(item.partnerId)}</Text>
                <Text style={styles.meta}>
                  {item.lines.length} item{item.lines.length === 1 ? "" : "s"} ·{" "}
                  {item.deliveryMode === "storePickup" ? "Pickup" : "Delivery"}
                  {item.scheduledAt ? ` · ${item.scheduledAt}` : ""}
                </Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {item.lines.map((line) => `${line.productName || line.productCode} × ${line.quantity}`).join(" · ")}
                </Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.amount}>₹{formatMoney(rfqLineTotal(item))}</Text>
                {item.rewardPoints ? (
                  <Text style={styles.points}>{item.rewardPoints} pts</Text>
                ) : (
                  <Text style={styles.pointsMuted}>— pts</Text>
                )}
                <View style={[styles.status, statusStyle(item.status)]}>
                  <Text style={styles.statusText}>{statusLabel(item.status)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

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

      <AppModal testID="rfq-details-modal" visible={!!selected} onClose={closeDetails} title={selected ? partnerTitle(selected.partnerId) : "RFQ"} wide>
        {selected ? (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <SummaryCell label="Status" value={statusLabel(selected.status)} />
                <SummaryCell label="Total" value={`₹${formatMoney(selectedTotal)}`} highlight />
              </View>
              <View style={styles.summaryRow}>
                <SummaryCell label="Reward points" value={String(selected.rewardPoints || 0)} />
                <SummaryCell
                  label="Delivery"
                  value={selected.deliveryMode === "storePickup" ? "Store pickup" : "Home delivery"}
                />
              </View>
              <Text style={styles.summaryMeta}>
                RFQ {selected.id.slice(0, 8)} · {partnerSubtitle(selected.partnerId)}
              </Text>
              {selected.scheduledAt ? (
                <Text style={styles.summaryMeta}>Scheduled: {selected.scheduledAt}</Text>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Products ({editLines.length})</Text>
            {editLines.map((line, index) => (
              <View key={`${line.productCode}-${index}`} style={styles.lineCard}>
                <View style={styles.lineMain}>
                  <Text style={styles.lineName}>{line.productName || line.productCode}</Text>
                  <Text style={styles.meta}>{line.productCode}</Text>
                  <Text style={styles.meta}>
                    ₹{formatMoney(line.unitPrice || 0)} each · line ₹{formatMoney((Number(line.quantity) || 0) * (line.unitPrice || 0))}
                  </Text>
                  {selected.status === "approved" ? (
                    <Text
                      style={[
                        styles.meta,
                        (stockByCode.get(line.productCode) ?? 0) < Number(line.quantity) ? styles.stockWarn : styles.stockOk,
                      ]}
                    >
                      In stock: {stockByCode.has(line.productCode) ? stockByCode.get(line.productCode) : "—"} · order qty {line.quantity}
                    </Text>
                  ) : null}
                </View>
                {canEditSelected ? (
                  <View style={styles.lineActions}>
                    <Input
                      testID={`rfq-line-qty-${index}`}
                      value={line.quantity}
                      onChangeText={(v) => setLineQty(index, v)}
                      keyboardType="decimal-pad"
                      style={styles.qtyInput}
                    />
                    <TouchableOpacity testID={`rfq-line-remove-${index}`} onPress={() => removeLine(index)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.qtyReadonly}>Qty {line.quantity}</Text>
                )}
              </View>
            ))}

            {canEditSelected ? (
              <View style={styles.addBlock}>
                <Input
                  testID="rfq-scan-code"
                  label="Add product (scan or type code)"
                  value={scanCode}
                  onChangeText={setScanCode}
                  placeholder="Product code"
                  autoCapitalize="characters"
                />
                <Text style={styles.hint}>
                  {scanProduct ? `${scanProduct.name} — ready to add` : "Enter a catalog product code"}
                </Text>
                <Button testID="rfq-add-scanned" title="Add to order" onPress={addScannedLine} disabled={!scanProduct} size="sm" />
                <Button testID="rfq-save-lines" title="Save changes" onPress={saveLineChanges} loading={saving} fullWidth />
              </View>
            ) : null}

            {selected.status === "pending" ? (
              <View style={styles.actionBlock}>
                <Text style={styles.sectionTitle}>Approval</Text>
                <Input testID="rfq-discount" label="Special discount (%)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
                <DeliveryPicker mode={deliveryMode} setMode={setDeliveryMode} />
                <Input testID="rfq-detail-schedule" label="Scheduled date and time" value={scheduledAt} onChangeText={setScheduledAt} />
                <View style={styles.actions}>
                  <Button testID="approve-rfq" title="Approve + reward" onPress={() => decide(true)} loading={saving} />
                  <Button testID="reject-rfq" title="Reject" variant="danger" onPress={() => decide(false)} loading={saving} />
                </View>
              </View>
            ) : null}

            {selected.status === "approved" ? (
              <View style={styles.actionBlock}>
                <Text style={styles.sectionTitle}>Dispatch</Text>
                <Text style={styles.hint}>
                  Stock is reduced in catalog when you dispatch (same as Dispatch & Billing). RFQ moves to Dispatched and cannot be edited again.
                </Text>
                {dispatchStockIssues.length ? (
                  <Text style={styles.stockWarn}>{dispatchStockIssues.join(" · ")}</Text>
                ) : (
                  <Text style={styles.stockOk}>Stock OK for all lines — ready to dispatch.</Text>
                )}
                <Button
                  testID="dispatch-rfq-from-detail"
                  title="Dispatch & deduct stock"
                  icon="barcode-outline"
                  onPress={dispatchSelected}
                  loading={saving}
                  disabled={dispatchStockIssues.length > 0}
                  fullWidth
                />
              </View>
            ) : null}

            {history.length ? (
              <>
                <Text style={styles.sectionTitle}>History</Text>
                {history.map((event, index) => (
                  <Text key={`${event.at}-${index}`} style={styles.history}>
                    {new Date(event.at).toLocaleString()} · {event.action} · {event.actor}
                  </Text>
                ))}
              </>
            ) : null}
          </>
        ) : null}
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
  tabs: { flexDirection: "row", gap: spacing.sm, paddingBottom: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  main: { flex: 1, minWidth: 0 },
  right: { alignItems: "flex-end", minWidth: 88 },
  name: { ...font.title, color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  amount: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  points: { fontSize: 12, fontWeight: "700", color: colors.primary, marginTop: 4 },
  pointsMuted: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  status: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  good: { backgroundColor: colors.successBg },
  bad: { backgroundColor: colors.errorBg },
  pending: { backgroundColor: colors.warningBg },
  done: { backgroundColor: colors.primaryLight },
  statusText: { color: colors.textPrimary, fontSize: 10, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
  label: { color: colors.textSecondary, fontWeight: "600", marginBottom: spacing.sm },
  product: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  selected: { backgroundColor: colors.primaryLight },
  delivery: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, flexWrap: "wrap" },
  actions: { flexDirection: isWeb ? "row" : "column", gap: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { ...font.title, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  history: { color: colors.textSecondary, fontSize: 11, marginBottom: 4 },
  hint: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.sm },
  stockOk: { color: colors.success, fontSize: 12, marginBottom: spacing.sm },
  stockWarn: { color: colors.error, fontSize: 12, marginBottom: spacing.sm },
  summaryCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  summaryCell: { flex: 1 },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  summaryValue: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginTop: 2 },
  summaryHighlight: { fontSize: 20, color: colors.primary },
  summaryMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  lineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  lineMain: { flex: 1, minWidth: 0 },
  lineName: { ...font.title, fontSize: 14, color: colors.textPrimary },
  lineActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  qtyInput: { width: 64, marginBottom: 0 },
  qtyReadonly: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  addBlock: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  actionBlock: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
