import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppModal, Button, Chip, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import { createBrand, listBrands, updateBrand, type Brand } from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";

export default function AdminBrands() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editor, setEditor] = useState<Brand | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setBrands((await listBrands()) || []); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Failed to load brands"); }
  }, []);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const filtered = useMemo(() => brands.filter((brand) => {
    const matchesText = brand.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesText && (filter === "all" || (filter === "active" ? brand.isActive : !brand.isActive));
  }), [brands, filter, query]);
  function openCreate() { setEditor(null); setName(""); }
  function openEdit(brand: Brand) { setEditor(brand); setName(brand.name); }
  async function save() {
    if (!name.trim()) { setError("Brand name is required."); return; }
    setSaving(true);
    try { if (editor) await updateBrand(editor.id, { name: name.trim(), isActive: editor.isActive }); else await createBrand(name.trim()); setEditor(undefined); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save brand"); }
    finally { setSaving(false); }
  }
  async function toggle(brand: Brand) {
    try { await updateBrand(brand.id, { name: brand.name, isActive: !brand.isActive }); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not update brand status"); }
  }
  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <Header title="Brands" subtitle={`${filtered.length} of ${brands.length}`} onBack={() => router.back()} right={<TouchableOpacity testID="open-add-brand" onPress={openCreate} hitSlop={8}><Ionicons name="add-circle" size={26} color={colors.primary} /></TouchableOpacity>} />
    <View style={styles.controls}>
      <Input testID="brand-search" value={query} onChangeText={setQuery} placeholder="Search brands" style={styles.search} />
      <View style={styles.chips}><Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} testID="brand-filter-all" /><Chip label="Active" selected={filter === "active"} onPress={() => setFilter("active")} testID="brand-filter-active" /><Chip label="Inactive" selected={filter === "inactive"} onPress={() => setFilter("inactive")} testID="brand-filter-inactive" /></View>
    </View>
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : <FlatList data={filtered} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>No brands match your search.</Text>} renderItem={({ item }) => <View style={styles.row} testID={`brand-row-${item.id}`}><View style={styles.main}><Text style={styles.name}>{item.name}</Text><Text style={styles.count}>{item.productCount} product{item.productCount === 1 ? "" : "s"}</Text></View><View style={[styles.status, item.isActive ? styles.active : styles.inactive]}><Text style={[styles.statusText, { color: item.isActive ? colors.success : colors.textMuted }]}>{item.isActive ? "Active" : "Inactive"}</Text></View><TouchableOpacity testID={`edit-brand-${item.id}`} onPress={() => openEdit(item)} style={styles.icon} hitSlop={8}><Ionicons name="create-outline" size={19} color={colors.primary} /></TouchableOpacity><TouchableOpacity testID={`toggle-brand-${item.id}`} onPress={() => toggle(item)} style={styles.icon} hitSlop={8}><Ionicons name={item.isActive ? "pause-circle-outline" : "play-circle-outline"} size={21} color={item.isActive ? colors.error : colors.success} /></TouchableOpacity></View>} />}
    <AppModal testID="brand-editor" visible={editor !== undefined} onClose={() => setEditor(undefined)} title={editor ? "Edit brand" : "New brand"}><Input testID="brand-name-input" label="Brand name" value={name} onChangeText={setName} placeholder="e.g. ACME" autoCapitalize="words" /><Button testID="save-brand" title={editor ? "Save changes" : "Create brand"} onPress={save} loading={saving} fullWidth /></AppModal>
    <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.bg }, controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md }, search: { marginBottom: spacing.sm }, chips: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, list: { padding: spacing.lg, paddingTop: spacing.sm }, row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm }, main: { flex: 1 }, name: { ...font.title, color: colors.textPrimary }, count: { color: colors.textSecondary, fontSize: 12, marginTop: 4 }, status: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 4 }, active: { backgroundColor: colors.successBg }, inactive: { backgroundColor: colors.border }, statusText: { fontSize: 11, fontWeight: "700" }, icon: { padding: 4 }, empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl } });
