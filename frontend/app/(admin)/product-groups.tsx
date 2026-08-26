import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppModal, Button, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import { createProductGroup, deleteProductGroup, listCatalog, listProductGroups, updateProductGroup, type CatalogItem, type ProductGroup } from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";

export default function AdminProductGroups() {
  const router = useRouter();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<ProductGroup | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const [nextGroups, nextProducts] = await Promise.all([listProductGroups(), listCatalog()]); setGroups(nextGroups || []); setProducts(nextProducts || []); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Failed to load product groups"); }
  }, []);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const filteredGroups = useMemo(() => groups.filter((group) => group.name.toLowerCase().includes(query.trim().toLowerCase())), [groups, query]);
  const filteredProducts = useMemo(() => products.filter((product) => `${product.name} ${product.productCode || ""}`.toLowerCase().includes(productQuery.trim().toLowerCase())), [products, productQuery]);
  function openCreate() { setEditor(null); setName(""); setSelected([]); setProductQuery(""); }
  function openEdit(group: ProductGroup) { setEditor(group); setName(group.name); setSelected(group.productIds); setProductQuery(""); }
  async function save() {
    if (!name.trim() || selected.length < 2) { setError("A product group needs a name and at least two products."); return; }
    setSaving(true);
    try { if (editor) await updateProductGroup(editor.id, { name: name.trim(), productIds: selected }); else await createProductGroup({ name: name.trim(), productIds: selected }); setEditor(undefined); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save product group"); }
    finally { setSaving(false); }
  }
  async function remove(group: ProductGroup) { try { await deleteProductGroup(group.id); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : "Could not delete product group"); } }
  function toggleProduct(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <Header title="Product Groups" subtitle={`${filteredGroups.length} of ${groups.length}`} onBack={() => router.back()} right={<TouchableOpacity testID="open-add-product-group" onPress={openCreate} hitSlop={8}><Ionicons name="add-circle" size={26} color={colors.primary} /></TouchableOpacity>} />
    <View style={styles.controls}><Input testID="product-group-search" value={query} onChangeText={setQuery} placeholder="Search product groups" style={styles.search} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : <FlatList data={filteredGroups} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>No product groups yet.</Text>} renderItem={({ item }) => <View style={styles.row} testID={`product-group-row-${item.id}`}><View style={styles.main}><Text style={styles.name}>{item.name}</Text><Text style={styles.count}>{item.productCount} products</Text></View><TouchableOpacity testID={`edit-product-group-${item.id}`} onPress={() => openEdit(item)} style={styles.icon} hitSlop={8}><Ionicons name="create-outline" size={19} color={colors.primary} /></TouchableOpacity><TouchableOpacity testID={`delete-product-group-${item.id}`} onPress={() => remove(item)} style={styles.icon} hitSlop={8}><Ionicons name="trash-outline" size={19} color={colors.error} /></TouchableOpacity></View>} />}
    <View style={styles.footer}><Button testID="bulk-product-group-action" title="New product group" icon="add" onPress={openCreate} fullWidth /></View>
    <AppModal testID="product-group-editor" visible={editor !== undefined} onClose={() => setEditor(undefined)} title={editor ? "Edit product group" : "New product group"}>
      <Input testID="product-group-name-input" label="Group name" value={name} onChangeText={setName} placeholder="e.g. Plumbing essentials" autoCapitalize="words" />
      <Text style={styles.selection}>{selected.length} selected; choose at least 2 products</Text>
      <Input testID="group-product-search" value={productQuery} onChangeText={setProductQuery} placeholder="Search products" />
      {filteredProducts.map((product) => <TouchableOpacity key={product.id} testID={`group-product-${product.id}`} style={styles.product} onPress={() => toggleProduct(product.id)}><View style={[styles.checkbox, selected.includes(product.id) && styles.checked]}>{selected.includes(product.id) && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}</View><View style={styles.main}><Text style={styles.productName}>{product.name}</Text><Text style={styles.count}>{product.productCode || "Legacy product"}</Text></View></TouchableOpacity>)}
      <View style={{ height: spacing.md }} /><Button testID="save-product-group" title={editor ? "Save changes" : "Create group"} onPress={save} loading={saving} disabled={selected.length < 2} fullWidth />
    </AppModal>
    <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bg }, controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md }, search: { marginBottom: 0 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, list: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 80 }, row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm }, main: { flex: 1 }, name: { ...font.title, color: colors.textPrimary }, count: { color: colors.textSecondary, fontSize: 12, marginTop: 4 }, icon: { padding: 4 }, empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl }, footer: { position: "absolute", bottom: 12, left: spacing.lg, right: spacing.lg }, selection: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.sm }, product: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm }, checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" }, checked: { backgroundColor: colors.primary, borderColor: colors.primary }, productName: { color: colors.textPrimary, fontWeight: "600" } });
