import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppModal, Button, Chip, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import { createCategory, listCategories, updateCategory, type Category } from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";

export default function AdminCategories() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Category | null | undefined>(undefined);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    try {
      setCategories((await listCategories()) || []);
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

  function openCreate() {
    setName("");
    setEditor(null);
  }

  function openEdit(category: Category) {
    setName(category.name);
    setEditor(category);
  }

  async function save() {
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editor) await updateCategory(editor.id, { name: name.trim(), isActive: editor.isActive });
      else await createCategory(name.trim());
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

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header title="Categories" subtitle={`${filtered.length} of ${categories.length}`} onBack={() => router.back()} right={
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
          renderItem={({ item }) => (
            <View style={styles.row} testID={`category-row-${item.id}`}>
              <View style={styles.rowMain}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.count}>{item.productCount} product{item.productCount === 1 ? "" : "s"}</Text>
              </View>
              <View style={[styles.status, item.isActive ? styles.active : styles.inactive]}>
                <Text style={[styles.statusText, { color: item.isActive ? colors.success : colors.textMuted }]}>{item.isActive ? "Active" : "Inactive"}</Text>
              </View>
              <TouchableOpacity testID={`edit-category-${item.id}`} onPress={() => openEdit(item)} hitSlop={8} style={styles.iconButton}>
                <Ionicons name="create-outline" size={19} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity testID={`toggle-category-${item.id}`} onPress={() => toggle(item)} hitSlop={8} style={styles.iconButton}>
                <Ionicons name={item.isActive ? "pause-circle-outline" : "play-circle-outline"} size={21} color={item.isActive ? colors.error : colors.success} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <AppModal testID="category-editor" visible={editor !== undefined} onClose={() => setEditor(undefined)} title={editor ? "Edit category" : "New category"}>
        <Input testID="category-name-input" label="Category name" value={name} onChangeText={setName} placeholder="e.g. Electrical" autoCapitalize="words" />
        <Button testID="save-category" title={editor ? "Save changes" : "Create category"} onPress={save} loading={saving} fullWidth />
      </AppModal>
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
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowMain: { flex: 1 },
  name: { ...font.title, color: colors.textPrimary },
  count: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  status: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 4 },
  active: { backgroundColor: colors.successBg },
  inactive: { backgroundColor: colors.border },
  statusText: { fontSize: 11, fontWeight: "700" },
  iconButton: { padding: 4 },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
});
