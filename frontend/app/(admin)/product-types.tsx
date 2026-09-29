import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppModal, Button, Chip, ErrorModal, Header, Input } from "@/src/components/UI";
import { CoverImageField } from "@/src/components/CoverImageField";
import { RemoteImage } from "@/src/components/RemoteImage";
import { PasscodeConfirmModal } from "@/src/components/PasscodeConfirmModal";
import { ProductCountButton, ProductPeekList } from "@/src/components/LinkedProducts";
import { ApiError } from "@/src/api/client";
import {
  listCatalog,
  listProductTypes,
  purgeCatalogByField,
  updateProductType,
  type CatalogItem,
  type ProductType,
} from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";
import { API_BASE_URL } from "@/src/config/env";

function typesFromCatalog(products: CatalogItem[]): ProductType[] {
  const map = new Map<string, ProductType>();
  for (const item of products) {
    const name = (item.type || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const current = map.get(key);
    if (current) current.productCount += 1;
    else map.set(key, { id: key, name, isActive: true, productCount: 1, imageUrl: null });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function AdminProductTypes() {
  const router = useRouter();
  const [types, setTypes] = useState<ProductType[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editor, setEditor] = useState<ProductType | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ProductType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [apiReady, setApiReady] = useState(true);

  const load = useCallback(async () => {
    try {
      const nextProducts = await listCatalog();
      setProducts(nextProducts || []);
      try {
        const nextTypes = await listProductTypes();
        setTypes(nextTypes || []);
        setApiReady(true);
      } catch (typeErr) {
        setTypes(typesFromCatalog(nextProducts || []));
        setApiReady(false);
        const missing = typeErr instanceof ApiError && (typeErr.status === 404 || /not found/i.test(typeErr.message));
        setError(
          missing
            ? `This page needs GET /api/product-types on the VPS. Your products are still there (${(nextProducts || []).length} SKUs). Copy the latest backend/server.py to ${API_BASE_URL} and restart the API. Until then types below are read from products and photos cannot be saved.`
            : typeErr instanceof ApiError
              ? typeErr.message
              : "Could not load product types",
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load product types");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => types.filter((row) => {
    const matchesText = row.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesText && (filter === "all" || (filter === "active" ? row.isActive : !row.isActive));
  }), [filter, query, types]);

  function productsFor(row: ProductType) {
    return products.filter((item) => (item.type || "").toLowerCase() === row.name.toLowerCase());
  }

  function openEdit(row: ProductType) {
    setEditor(row);
    setImageUrl(row.imageUrl || undefined);
  }

  async function save() {
    if (!editor) return;
    if (!apiReady) {
      setError(`Cannot save photos until the VPS has /api/product-types. Redeploy ${API_BASE_URL} with the latest server.py.`);
      return;
    }
    setSaving(true);
    try {
      await updateProductType(editor.id, { name: editor.name, isActive: editor.isActive, imageUrl: imageUrl || null });
      setEditor(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save type photo");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: ProductType) {
    try {
      await updateProductType(row.id, { name: row.name, isActive: !row.isActive });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update type status");
    }
  }

  async function confirmPurge(credentials: { contactNumber: string; passcode: string }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await purgeCatalogByField({ ...credentials, field: "type", value: deleteTarget.name });
      setDeleteTarget(null);
      await load();
      setError(`Removed ${res.productsRemoved} product(s) for ${deleteTarget.name}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete products");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header title="Product type" subtitle="Tap Add photo — file or URL (not Excel)" onBack={() => router.back()} />
      <View style={styles.controls}>
        <Input testID="product-type-search" value={query} onChangeText={setQuery} placeholder="Search product types" style={styles.search} />
        <View style={styles.chips}>
          <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} testID="product-type-filter-all" />
          <Chip label="Active" selected={filter === "active"} onPress={() => setFilter("active")} testID="product-type-filter-active" />
          <Chip label="Inactive" selected={filter === "inactive"} onPress={() => setFilter("inactive")} testID="product-type-filter-inactive" />
        </View>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No product types yet. Import a sheet with a Type column (CPVC, PVC, UPVC), then add photos here.</Text>}
          renderItem={({ item }) => {
            const open = openId === item.id;
            const listed = productsFor(item);
            return (
              <View style={styles.card} testID={`product-type-row-${item.id}`}>
                <View style={styles.row}>
                  <TouchableOpacity testID={`photo-product-type-${item.id}`} onPress={() => openEdit(item)} hitSlop={8}>
                    <RemoteImage uri={item.imageUrl} style={styles.thumb} placeholderSize={16} />
                  </TouchableOpacity>
                  <View style={styles.main}>
                    <Text style={styles.name}>{item.name}</Text>
                    <ProductCountButton count={listed.length} selected={open} onPress={() => setOpenId(open ? null : item.id)} testID={`product-type-products-${item.id}`} />
                  </View>
                  <View style={[styles.status, item.isActive ? styles.active : styles.inactive]}>
                    <Text style={[styles.statusText, { color: item.isActive ? colors.success : colors.textMuted }]}>{item.isActive ? "Active" : "Inactive"}</Text>
                  </View>
                  <TouchableOpacity testID={`edit-product-type-${item.id}`} onPress={() => openEdit(item)} style={styles.photoButton} hitSlop={8}>
                    <Ionicons name="image-outline" size={16} color={colors.primary} />
                    <Text style={styles.photoButtonText}>{item.imageUrl ? "Photo" : "Add photo"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID={`delete-product-type-${item.id}`} onPress={() => setDeleteTarget(item)} style={styles.icon} hitSlop={8}>
                    <Ionicons name="trash-outline" size={19} color={colors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity testID={`toggle-product-type-${item.id}`} onPress={() => toggle(item)} style={styles.icon} hitSlop={8}>
                    <Ionicons name={item.isActive ? "pause-circle-outline" : "play-circle-outline"} size={21} color={item.isActive ? colors.error : colors.success} />
                  </TouchableOpacity>
                </View>
                {open ? <ProductPeekList products={listed} emptyText={`No products in ${item.name}.`} /> : null}
              </View>
            );
          }}
        />
      )}
      <AppModal testID="product-type-editor" visible={!!editor} onClose={() => setEditor(null)} title={editor ? `Type photo: ${editor.name}` : "Type photo"}>
        <CoverImageField testID="product-type-image" label="Type photo (app sidebar)" uri={imageUrl} onChange={setImageUrl} />
        <Button testID="save-product-type" title="Save photo" onPress={save} loading={saving} fullWidth />
      </AppModal>
      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete all ${deleteTarget?.name || ""} products`}
        message="Removes every product with this type. Requires admin passcode."
        confirmLabel="Delete products"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmPurge}
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
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },
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
