import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppModal, Button, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import { createDispatch, listCatalog, listDispatches, listRfqs, type CatalogItem, type Dispatch, type Rfq } from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";

export default function AdminDispatches() {
  const router = useRouter();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [rfqOpen, setRfqOpen] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { const [nextDispatches, nextProducts, nextRfqs] = await Promise.all([listDispatches(), listCatalog(), listRfqs({ status: "approved" })]); setDispatches(nextDispatches || []); setProducts(nextProducts || []); setRfqs(nextRfqs || []); } catch (e) { setError(e instanceof ApiError ? e.message : "Failed to load dispatches"); } }, []);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const scanned = products.find((product) => product.productCode?.toLowerCase() === scanCode.trim().toLowerCase());
  function openRetail() { setScanCode(""); setQuantity("1"); setCustomerName(""); setCustomerPhone(""); setFormOpen(true); }
  async function dispatchRetail() { if (!scanned || Number(quantity) <= 0) { setError("Scan or select a valid product and quantity."); return; } setSaving(true); try { await createDispatch({ lines: [{ productCode: scanned.productCode || "", quantity: Number(quantity) }], customerName: customerName || undefined, customerPhone: customerPhone || undefined }); setFormOpen(false); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : "Could not dispatch product"); } finally { setSaving(false); } }
  async function dispatchRfq(rfq: Rfq) { setSaving(true); try { await createDispatch({ sourceRfqId: rfq.id, lines: rfq.lines.map((line) => ({ productCode: line.productCode, quantity: line.quantity })) }); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : "Could not dispatch RFQ"); } finally { setSaving(false); } }
  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}><Header title="Dispatch & Billing" subtitle={`${dispatches.length} dispatch${dispatches.length === 1 ? "" : "es"}`} onBack={() => router.back()} right={<TouchableOpacity testID="open-retail-dispatch" onPress={openRetail} hitSlop={8}><Ionicons name="add-circle" size={26} color={colors.primary} /></TouchableOpacity>} />
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : <FlatList data={dispatches} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>No dispatches recorded.</Text>} renderItem={({ item }) => <View style={styles.row} testID={`dispatch-${item.id}`}><View style={styles.main}><Text style={styles.name}>{item.sourceRfqId ? `RFQ ${item.sourceRfqId.slice(0, 8)}` : item.customerName || "Retail customer"}</Text><Text style={styles.meta}>{item.lines.map((line) => `${line.productName || line.productCode} x${line.quantity}`).join(", ")}</Text><Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text></View><Ionicons name="checkmark-circle" size={22} color={colors.success} /></View>} />}
    <View style={styles.footer}><Button testID="convert-rfq-dispatch" title={`Dispatch approved RFQ (${rfqs.length})`} icon="swap-horizontal-outline" onPress={() => setRfqOpen(true)} fullWidth /><View style={{ height: spacing.sm }} /><Button testID="retail-billing" title="Retail customer billing" icon="receipt-outline" onPress={openRetail} fullWidth /></View>
    <AppModal testID="retail-dispatch-modal" visible={formOpen} onClose={() => setFormOpen(false)} title="Retail billing"><Input testID="scan-product-code" label="Scan barcode / QR product code" value={scanCode} onChangeText={setScanCode} placeholder="PRD-..." autoCapitalize="characters" /><Text style={styles.hint}>{scanned ? `${scanned.name} · Stock ${scanned.stock || 0}` : "Enter a product code to identify the item."}</Text><Input testID="dispatch-quantity" label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" /><Input testID="retail-customer-name" label="Customer name (optional)" value={customerName} onChangeText={setCustomerName} /><Input testID="retail-customer-phone" label="Customer phone (optional)" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" /><Button testID="save-retail-dispatch" title="Bill and dispatch" onPress={dispatchRetail} loading={saving} disabled={!scanned} fullWidth /></AppModal>
    <AppModal testID="approved-rfq-modal" visible={rfqOpen} onClose={() => setRfqOpen(false)} title="Approved RFQs">{rfqs.length ? rfqs.map((rfq) => <View key={rfq.id} style={styles.rfq}><View style={styles.main}><Text style={styles.name}>Partner {rfq.partnerId}</Text><Text style={styles.meta}>{rfq.lines.length} product{rfq.lines.length === 1 ? "" : "s"}</Text></View><Button testID={`dispatch-rfq-${rfq.id}`} title="Dispatch" size="sm" onPress={() => dispatchRfq(rfq)} loading={saving} /></View>) : <Text style={styles.empty}>No approved RFQs ready for dispatch.</Text>}</AppModal>
    <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} /></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bg }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, list: { padding: spacing.lg, paddingBottom: 150 }, row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm }, main: { flex: 1 }, name: { ...font.title, color: colors.textPrimary }, meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3 }, empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl }, footer: { position: "absolute", bottom: 12, left: spacing.lg, right: spacing.lg }, hint: { color: colors.textSecondary, marginBottom: spacing.md }, rfq: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border } });
