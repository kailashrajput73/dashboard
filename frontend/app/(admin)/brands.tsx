import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppModal, Button, Chip, ErrorModal, Header, Input } from "@/src/components/UI";
import { CoverImageField } from "@/src/components/CoverImageField";
import { RemoteImage } from "@/src/components/RemoteImage";
import { ProductCountButton, ProductPeekList } from "@/src/components/LinkedProducts";
import { ApiError } from "@/src/api/client";
import { createBrand, deleteBrandCascade, listBrands, listCatalog, updateBrand, type Brand, type CatalogItem } from "@/src/api/endpoints";
import { PasscodeConfirmModal } from "@/src/components/PasscodeConfirmModal";
import { colors, font, radii, spacing } from "@/src/theme";

export default function AdminBrands() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editor, setEditor] = useState<Brand | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextBrands, nextProducts] = await Promise.all([listBrands(), listCatalog()]);
      setBrands(nextBrands || []);
      setProducts(nextProducts || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load brands");
    }
  }, []);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const filtered = useMemo(() => brands.filter((brand) => {
    const matchesText = brand.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesText && (filter === "all" || (filter === "active" ? brand.isActive : !brand.isActive));
  }), [brands, filter, query]);

  function productsFor(brand: Brand) {
    return products.filter((item) => item.brandId === brand.id || (item.brand || "").toLowerCase() === brand.name.toLowerCase());
  }

  function openCreate() { setEditor(null); setName(""); setLogoUrl(undefined); }
  function openEdit(brand: Brand) { setEditor(brand); setName(brand.name); setLogoUrl(brand.logoUrl || undefined); }
  async function save() {
    if (!name.trim()) { setError("Brand name is required."); return; }
    setSaving(true);
    try {
      if (editor) await updateBrand(editor.id, { name: name.trim(), isActive: editor.isActive, logoUrl: logoUrl || null });
      else await createBrand(name.trim(), logoUrl);
      setEditor(undefined);
      await load();
    }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save brand"); }
    finally { setSaving(false); }
  }
  async function toggle(brand: Brand) {
    try { await updateBrand(brand.id, { name: brand.name, isActive: !brand.isActive }); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not update brand status"); }
  }

  async function confirmDeleteBrand(credentials: { contactNumber: string; passcode: string }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteBrandCascade(deleteTarget.id, credentials);
      setDeleteTarget(null);
      await load();
      setError(`Deleted ${deleteTarget.name} and ${res.productsRemoved} product(s).`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete brand");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header title="Brands" subtitle="Tap Photo to add a logo file or URL" onBack={() => router.back()} right={<TouchableOpacity testID="open-add-brand" onPress={openCreate} hitSlop={8}><Ionicons name="add-circle" size={26} color={colors.primary} /></TouchableOpacity>} />
      <View style={styles.controls}>
        <Input testID="brand-search" value={query} onChangeText={setQuery} placeholder="Search brands" style={styles.search} />
        <View style={styles.chips}>
          <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} testID="brand-filter-all" />
          <Chip label="Active" selected={filter === "active"} onPress={() => setFilter("active")} testID="brand-filter-active" />
          <Chip label="Inactive" selected={filter === "inactive"} onPress={() => setFilter("inactive")} testID="brand-filter-inactive" />
        </View>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No brands match your search.</Text>}
          renderItem={({ item }) => {
            const open = openId === item.id;
            const listed = productsFor(item);
            return (
              <View style={styles.card} testID={`brand-row-${item.id}`}>
                <View style={styles.row}>
                  <TouchableOpacity testID={`photo-brand-${item.id}`} onPress={() => openEdit(item)} hitSlop={8}>
                    <RemoteImage uri={item.logoUrl} style={styles.thumb} placeholderSize={16} />
                  </TouchableOpacity>
                  <View style={styles.main}>
                    <Text style={styles.name}>{item.name}</Text>
                    <ProductCountButton count={listed.length} selected={open} onPress={() => setOpenId(open ? null : item.id)} testID={`brand-products-${item.id}`} />
                  </View>
                  <View style={[styles.status, item.isActive ? styles.active : styles.inactive]}>
                    <Text style={[styles.statusText, { color: item.isActive ? colors.success : colors.textMuted }]}>{item.isActive ? "Active" : "Inactive"}</Text>
                  </View>
                  <TouchableOpacity testID={`edit-brand-${item.id}`} onPress={() => openEdit(item)} style={styles.photoButton} hitSlop={8}>
                    <Ionicons name="image-outline" size={16} color={colors.primary} />
                    <Text style={styles.photoButtonText}>{item.logoUrl ? "Photo" : "Add photo"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID={`delete-brand-${item.id}`} onPress={() => setDeleteTarget(item)} style={styles.icon} hitSlop={8}><Ionicons name="trash-outline" size={19} color={colors.error} /></TouchableOpacity>
                  <TouchableOpacity testID={`toggle-brand-${item.id}`} onPress={() => toggle(item)} style={styles.icon} hitSlop={8}><Ionicons name={item.isActive ? "pause-circle-outline" : "play-circle-outline"} size={21} color={item.isActive ? colors.error : colors.success} /></TouchableOpacity>
                </View>
                {open ? <ProductPeekList products={listed} emptyText={`No products for ${item.name}.`} /> : null}
              </View>
            );
          }}
        />
      )}
      <AppModal testID="brand-editor" visible={editor !== undefined} onClose={() => setEditor(undefined)} title={editor ? "Edit brand" : "New brand"}>
        <Input testID="brand-name-input" label="Brand name" value={name} onChangeText={setName} placeholder="e.g. ACME" autoCapitalize="words" />
        <CoverImageField testID="brand-logo" label="Brand logo" uri={logoUrl} onChange={setLogoUrl} />
        <Button testID="save-brand" title={editor ? "Save changes" : "Create brand"} onPress={save} loading={saving} fullWidth />
      </AppModal>
      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete ${deleteTarget?.name || "brand"}`}
        message="Deletes this brand and every product linked to it."
        confirmLabel="Delete brand and products"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteBrand}
      />
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: { marginBottom: spacing.sm },
  chips: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  main: { flex: 1, gap: 8 },
  name: { ...font.title, color: colors.textPrimary },
  status: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 4 },
  active: { backgroundColor: colors.successBg },
  inactive: { backgroundColor: colors.border },
  statusText: { fontSize: 11, fontWeight: "700" },
  icon: { padding: 4 },
  photoButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.primaryLight },
  photoButtonText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
});
