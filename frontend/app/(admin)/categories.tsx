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
import { createCategory, deleteCategoryCascade, listCatalog, listCategories, updateCategory, type CatalogItem, type Category } from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";

export default function AdminCategories() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Category | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextCategories, nextProducts] = await Promise.all([listCategories(), listCatalog()]);
      setCategories(nextCategories || []);
      setProducts(nextProducts || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load categories");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => categories.filter((category) => {
    const matchesQuery = category.name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || (status === "active" ? category.isActive : !category.isActive);
    return matchesQuery && matchesStatus;
  }), [categories, query, status]);

  function productsFor(category: Category) {
    return products.filter((item) => (item.category || "").toLowerCase() === category.name.toLowerCase());
  }

  function openCreate() {
    setName("");
    setImageUrl(undefined);
    setEditor(null);
  }

  function openEdit(category: Category) {
    setName(category.name);
    setImageUrl(category.imageUrl || undefined);
    setEditor(category);
  }

  async function save() {
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editor) await updateCategory(editor.id, { name: name.trim(), isActive: editor.isActive, imageUrl: imageUrl || null });
      else await createCategory(name.trim(), imageUrl);
      setEditor(undefined);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save category");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(category: Category) {
    try {
      await updateCategory(category.id, { name: category.name, isActive: !category.isActive });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update category status");
    }
  }

  async function confirmDeleteCategory(credentials: { contactNumber: string; passcode: string }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteCategoryCascade(deleteTarget.id, credentials);
      setDeleteTarget(null);
      await load();
      setError(`Deleted ${deleteTarget.name} and ${res.productsRemoved} product(s).`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete category");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header title="Categories" subtitle="Tap Photo to add a home picture or URL" onBack={() => router.back()} right={
        <TouchableOpacity testID="open-add-category" onPress={openCreate} hitSlop={8}>
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      } />
      <View style={styles.controls}>
        <Input testID="category-search" value={query} onChangeText={setQuery} placeholder="Search categories" style={styles.search} />
        <View style={styles.chips}>
          <Chip label="All" selected={status === "all"} onPress={() => setStatus("all")} testID="category-filter-all" />
          <Chip label="Active" selected={status === "active"} onPress={() => setStatus("active")} testID="category-filter-active" />
          <Chip label="Inactive" selected={status === "inactive"} onPress={() => setStatus("inactive")} testID="category-filter-inactive" />
        </View>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No categories match your search.</Text>}
          renderItem={({ item }) => {
            const open = openId === item.id;
            const listed = productsFor(item);
            return (
              <View style={styles.card} testID={`category-row-${item.id}`}>
                <View style={styles.row}>
                  <TouchableOpacity testID={`photo-category-${item.id}`} onPress={() => openEdit(item)} hitSlop={8}>
                    <RemoteImage uri={item.imageUrl} style={styles.thumb} placeholderSize={16} />
                  </TouchableOpacity>
                  <View style={styles.rowMain}>
                    <Text style={styles.name}>{item.name}</Text>
                    <ProductCountButton
                      count={listed.length}
                      selected={open}
                      onPress={() => setOpenId(open ? null : item.id)}
                      testID={`category-products-${item.id}`}
                    />
                  </View>
                  <View style={[styles.status, item.isActive ? styles.active : styles.inactive]}>
                    <Text style={[styles.statusText, { color: item.isActive ? colors.success : colors.textMuted }]}>{item.isActive ? "Active" : "Inactive"}</Text>
                  </View>
                  <TouchableOpacity testID={`edit-category-${item.id}`} onPress={() => openEdit(item)} hitSlop={8} style={styles.photoButton}>
                    <Ionicons name="image-outline" size={16} color={colors.primary} />
                    <Text style={styles.photoButtonText}>{item.imageUrl ? "Photo" : "Add photo"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID={`delete-category-${item.id}`} onPress={() => setDeleteTarget(item)} hitSlop={8} style={styles.iconButton}>
                    <Ionicons name="trash-outline" size={19} color={colors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity testID={`toggle-category-${item.id}`} onPress={() => toggle(item)} hitSlop={8} style={styles.iconButton}>
                    <Ionicons name={item.isActive ? "pause-circle-outline" : "play-circle-outline"} size={21} color={item.isActive ? colors.error : colors.success} />
                  </TouchableOpacity>
                </View>
                {open ? <ProductPeekList products={listed} emptyText={`No products in ${item.name}.`} /> : null}
              </View>
            );
          }}
        />
      )}
      <AppModal testID="category-editor" visible={editor !== undefined} onClose={() => setEditor(undefined)} title={editor ? "Edit category" : "New category"}>
        <Input testID="category-name-input" label="Category name" value={name} onChangeText={setName} placeholder="e.g. Electrical" autoCapitalize="words" />
        <CoverImageField testID="category-image" label="Category home photo" uri={imageUrl} onChange={setImageUrl} />
        <Button testID="save-category" title={editor ? "Save changes" : "Create category"} onPress={save} loading={saving} fullWidth />
      </AppModal>
      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete ${deleteTarget?.name || "category"}`}
        message="Deletes this category, its subcategories, and every product in this category."
        confirmLabel="Delete category and products"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteCategory}
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
  rowMain: { flex: 1, gap: 8 },
  name: { ...font.title, color: colors.textPrimary },
  status: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 4 },
  active: { backgroundColor: colors.successBg },
  inactive: { backgroundColor: colors.border },
  statusText: { fontSize: 11, fontWeight: "700" },
  iconButton: { padding: 4 },
  photoButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.primaryLight },
  photoButtonText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
});
