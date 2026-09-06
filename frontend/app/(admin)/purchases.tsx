import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { AppModal, Button, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import { createPurchase, listCatalog, listPurchases, listRacks, type CatalogItem, type Purchase, type Rack } from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";
import { parseCsvBytes } from "@/src/utils/csv";
import { readAssetBytes } from "@/src/utils/read-asset-bytes";

export default function AdminPurchases() {
  const router = useRouter();
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [rackId, setRackId] = useState("");
  const [rackSlot, setRackSlot] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { const [nextProducts, nextRacks, nextPurchases] = await Promise.all([listCatalog(), listRacks(), listPurchases()]); setProducts(nextProducts || []); setRacks(nextRacks || []); setPurchases(nextPurchases || []); } catch (e) { setError(e instanceof ApiError ? e.message : "Failed to load purchases"); } }, []);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  function openCreate() { setProductCode(products[0]?.productCode || ""); setQuantity("1"); setPrice(products[0]?.standardRate ? String(products[0].standardRate) : ""); setDiscount("0"); setRackId(""); setRackSlot(""); setFormOpen(true); }
  async function save() { if (!productCode || Number(quantity) <= 0 || Number(price) < 0) { setError("Select a product and enter valid quantity and list price."); return; } setSaving(true); try { await createPurchase([{ productCode, quantity: Number(quantity), listPrice: Number(price), purchaseDiscount: Number(discount) || 0, rackId: rackId || undefined, rackSlot: rackSlot || undefined }]); setFormOpen(false); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : "Could not save purchase"); } finally { setSaving(false); } }
  async function bulkUpload() { try { const result = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/plain", "*/*"], copyToCacheDirectory: true }); if (result.canceled || !result.assets?.[0]) return; const parsed = parseCsvBytes(await readAssetBytes(result.assets[0])); if (!parsed.ok) { setError(parsed.error); return; } const lines = parsed.rows.map((row) => ({ productCode: (row.productcode || row["product code"] || "").trim(), quantity: Number(row.quantity), listPrice: Number(row.listprice || row["list price"]), purchaseDiscount: Number(row.purchasediscount || row.discount || 0), rackId: row.rackid || undefined, rackSlot: row.rackslot || undefined })); if (lines.some((line) => !line.productCode || !Number.isFinite(line.quantity) || !Number.isFinite(line.listPrice))) { setError("CSV requires productCode, quantity, and listPrice columns."); return; } setSaving(true); await createPurchase(lines); await load(); setError(`Imported ${lines.length} purchase line${lines.length === 1 ? "" : "s"}.`); } catch (e) { setError(e instanceof ApiError ? e.message : "Bulk purchase import failed"); } finally { setSaving(false); } }
  const selectedProduct = products.find((product) => product.productCode === productCode);
  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}><Header title="Purchases" subtitle={`${purchases.length} transaction${purchases.length === 1 ? "" : "s"}`} onBack={() => router.back()} right={<TouchableOpacity testID="open-add-purchase" onPress={openCreate} hitSlop={8}><Ionicons name="add-circle" size={26} color={colors.primary} /></TouchableOpacity>} />
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : <FlatList data={purchases} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>No purchases recorded.</Text>} renderItem={({ item }) => <View style={styles.transaction} testID={`purchase-${item.id}`}><Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>{item.lines.map((line, index) => <View key={`${item.id}-${index}`} style={styles.line}><View style={styles.main}><Text style={styles.name}>{line.productName}</Text><Text style={styles.meta}>{line.productCode} · Qty {line.quantity}</Text></View><Text style={styles.price}>₹{line.listPrice}</Text></View>)}</View>} />}
    <View style={styles.footer}><Button testID="bulk-purchase-import" title="Bulk CSV" icon="cloud-upload-outline" onPress={bulkUpload} size="sm" /><Button testID="new-purchase" title="Record purchase" icon="add" onPress={openCreate} fullWidth /></View>
    <AppModal testID="purchase-form" visible={formOpen} onClose={() => setFormOpen(false)} title="Record purchase"><Text style={styles.label}>Product</Text>{products.slice(0, 25).map((product) => <TouchableOpacity key={product.id} testID={`purchase-product-${product.id}`} style={[styles.product, product.productCode === productCode && styles.selected]} onPress={() => { setProductCode(product.productCode || ""); setPrice(String(product.standardRate)); }}><Text style={styles.name}>{product.name}</Text><Text style={styles.meta}>{product.productCode || "Legacy product"}</Text></TouchableOpacity>)}<Input testID="purchase-quantity" label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" /><Input testID="purchase-price" label="List price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /><Input testID="purchase-discount" label="Purchase discount (%)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" /><Input testID="purchase-rack-id" label="Rack ID (optional)" value={rackId} onChangeText={setRackId} placeholder={racks[0]?.id || "Rack ID"} /><Input testID="purchase-rack-slot" label="Rack slot (optional)" value={rackSlot} onChangeText={setRackSlot} placeholder="A1" /><Button testID="save-purchase" title={`Receive ${selectedProduct?.name || "stock"}`} onPress={save} loading={saving} disabled={!productCode} fullWidth /></AppModal>
    <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} /></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bg }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, list: { padding: spacing.lg, paddingBottom: 80 }, transaction: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm }, date: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm }, line: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm }, main: { flex: 1 }, name: { ...font.title, color: colors.textPrimary }, meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3 }, price: { color: colors.textPrimary, fontWeight: "700" }, empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl }, footer: { position: "absolute", bottom: 12, left: spacing.lg, right: spacing.lg }, label: { color: colors.textSecondary, fontWeight: "600", marginBottom: spacing.sm }, product: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }, selected: { backgroundColor: colors.primaryLight } });
