import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

import { AppModal, Button, Chip, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import { createSubcategory, deleteSubcategory, importSubcategories, listCategories, listSubcategories, updateSubcategory, type Category, type Subcategory } from "@/src/api/endpoints";
import { parseCsvBytes } from "@/src/utils/csv";
import { colors, font, radii, spacing } from "@/src/theme";

export default function AdminSubcategories() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Subcategory[]>([]);
  const [parent, setParent] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Subcategory | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<{ name: string; category?: string }[]>([]);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cats, subs] = await Promise.all([listCategories(), listSubcategories()]);
      setCategories(cats || []);
      setItems(subs || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load subcategories");
    }
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => items.filter((item) => {
    const matchesParent = parent === "all" || item.categoryId === parent;
    const text = `${item.name} ${item.category}`.toLowerCase();
    return matchesParent && text.includes(query.trim().toLowerCase());
  }), [items, parent, query]);

  function openCreate() {
    setEditor(null);
    setName("");
    setCategoryId(categories.find((category) => category.isActive)?.id || categories[0]?.id || "");
  }

  function openEdit(item: Subcategory) {
    setEditor(item);
    setName(item.name);
    setCategoryId(item.categoryId);
  }

  async function save() {
    if (!name.trim() || !categoryId) {
      setError("Subcategory name and parent category are required.");
      return;
    }
    setSaving(true);
    try {
      if (editor) await updateSubcategory(editor.id, { name: name.trim(), categoryId });
      else await createSubcategory({ name: name.trim(), categoryId });
      setEditor(undefined);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save subcategory");
    } finally { setSaving(false); }
  }

  async function remove(item: Subcategory) {
    try {
      await deleteSubcategory(item.id);
      await load();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not delete subcategory"); }
  }

  async function pickImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/plain", "*/*"], copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const parsed = parseCsvBytes(base64ToBytes(base64));
      if (!parsed.ok) { setError(parsed.error); return; }
      const rows = parsed.rows.map((row) => ({
        name: (row.name || row.subcategory || row["sub category"] || "").trim(),
        category: (row.category || row.categoryname || "").trim() || undefined,
      }));
      const valid = rows.filter((row) => row.name && row.category);
      if (!valid.length) { setError("CSV needs name and category headers with at least one valid row."); return; }
      setImportRows(valid);
      setImportOpen(true);
    } catch (e: any) { setError(e?.message || "Could not read the CSV file"); }
  }

  async function runImport() {
    setImporting(true);
    try {
      const result = await importSubcategories(importRows);
      setImportOpen(false);
      setImportRows([]);
      await load();
      setError(`Imported ${result.inserted} subcategor${result.inserted === 1 ? "y" : "ies"}.`);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Import validation failed"); }
    finally { setImporting(false); }
  }

  async function exportCsv() {
    const csv = ["name,category", ...items.map((item) => `${csvCell(item.name)},${csvCell(item.category)}`)].join("\n");
    try {
      await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    } catch { setError("Could not open the CSV export."); }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header title="Subcategories" subtitle={`${filtered.length} of ${items.length}`} onBack={() => router.back()} right={
        <View style={styles.headerActions}>
          <TouchableOpacity testID="export-subcategories" onPress={exportCsv} hitSlop={8}><Ionicons name="download-outline" size={23} color={colors.primary} /></TouchableOpacity>
          <TouchableOpacity testID="open-add-subcategory" onPress={openCreate} hitSlop={8}><Ionicons name="add-circle" size={26} color={colors.primary} /></TouchableOpacity>
        </View>
      } />
      <View style={styles.controls}>
        <Input testID="subcategory-search" value={query} onChangeText={setQuery} placeholder="Search subcategories" style={styles.search} />
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={[{ id: "all", name: "All" }, ...categories]} keyExtractor={(item) => item.id} renderItem={({ item }) => <Chip label={item.name} selected={parent === item.id} onPress={() => setParent(item.id)} testID={`subcategory-filter-${item.id}`} />} contentContainerStyle={styles.chips} />
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No subcategories match your search.</Text>}
          renderItem={({ item }) => <View style={styles.row} testID={`subcategory-row-${item.id}`}>
            <View style={styles.rowMain}><Text style={styles.name}>{item.name}</Text><Text style={styles.parent}>{item.category}</Text></View>
            <TouchableOpacity testID={`edit-subcategory-${item.id}`} onPress={() => openEdit(item)} hitSlop={8} style={styles.icon}><Ionicons name="create-outline" size={19} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity testID={`delete-subcategory-${item.id}`} onPress={() => remove(item)} hitSlop={8} style={styles.icon}><Ionicons name="trash-outline" size={19} color={colors.error} /></TouchableOpacity>
          </View>}
        />
      )}
      <View style={styles.importBar}><Button testID="import-subcategories" title="Bulk import CSV" icon="cloud-upload-outline" onPress={pickImport} size="sm" /></View>

      <AppModal testID="subcategory-editor" visible={editor !== undefined} onClose={() => setEditor(undefined)} title={editor ? "Edit subcategory" : "New subcategory"}>
        <Input testID="subcategory-name-input" label="Subcategory name" value={name} onChangeText={setName} placeholder="e.g. Cement" autoCapitalize="words" />
        <Text style={styles.label}>Parent category</Text>
        <TouchableOpacity testID="subcategory-parent-picker" style={styles.select} onPress={() => setPickerOpen(true)}><Text style={styles.selectText}>{categories.find((category) => category.id === categoryId)?.name || "Select category"}</Text><Ionicons name="chevron-down" size={18} color={colors.textMuted} /></TouchableOpacity>
        <View style={{ height: spacing.md }} /><Button testID="save-subcategory" title={editor ? "Save changes" : "Create subcategory"} onPress={save} loading={saving} fullWidth />
      </AppModal>
      <AppModal testID="subcategory-parent-modal" visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Select parent category">
        {categories.filter((category) => category.isActive).map((category) => <TouchableOpacity key={category.id} style={styles.option} onPress={() => { setCategoryId(category.id); setPickerOpen(false); }} testID={`pick-parent-${category.id}`}><Text style={styles.selectText}>{category.name}</Text>{category.id === categoryId && <Ionicons name="checkmark" size={18} color={colors.primary} />}</TouchableOpacity>)}
      </AppModal>
      <AppModal testID="subcategory-import-modal" visible={importOpen} onClose={() => setImportOpen(false)} title="Review bulk import">
        <Text style={styles.hint}>{importRows.length} valid row{importRows.length === 1 ? "" : "s"}. Required columns: name, category.</Text>
        {importRows.slice(0, 20).map((row, index) => <View key={`${row.name}-${index}`} style={styles.preview}><Text style={styles.previewName}>{row.name}</Text><Text style={styles.parent}>{row.category}</Text></View>)}
        {importRows.length > 20 && <Text style={styles.hint}>And {importRows.length - 20} more rows</Text>}
        <View style={{ height: spacing.md }} /><Button testID="run-subcategory-import" title="Validate and import" onPress={runImport} loading={importing} fullWidth />
      </AppModal>
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </SafeAreaView>
  );
}

function base64ToBytes(base64: string) {
  const binary = typeof atob === "function"
    ? atob(base64)
    : globalThis.Buffer
      ? globalThis.Buffer.from(base64, "base64").toString("binary")
      : "";
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function csvCell(value: string) { return /[,"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: { marginBottom: spacing.sm },
  chips: { gap: spacing.sm, paddingBottom: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 82 },
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowMain: { flex: 1 },
  name: { ...font.title, color: colors.textPrimary },
  parent: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  icon: { padding: 5 },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
  importBar: { position: "absolute", bottom: 12, left: spacing.lg, right: spacing.lg },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: spacing.sm },
  select: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectText: { color: colors.textPrimary, fontSize: 15 },
  option: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between" },
  hint: { color: colors.textSecondary, lineHeight: 20 },
  preview: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  previewName: { color: colors.textPrimary, fontWeight: "600" },
});
