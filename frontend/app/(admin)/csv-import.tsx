import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";

import {
  Header,
  Card,
  Button,
  Input,
  AppModal,
  ErrorModal,
} from "@/src/components/UI";
import { colors, spacing, radii, shadow, font, pointer } from "@/src/theme";
import { rowsToItems, type ImportItem } from "@/src/utils/csv";
import { parseSpreadsheetBytes } from "@/src/utils/spreadsheet";
import { readAssetBytes } from "@/src/utils/read-asset-bytes";
import { clearCatalog, importCatalog, listCatalog } from "@/src/api/endpoints";
import { ApiError } from "@/src/api/client";

type Mode = "fromCsv" | "overrideExisting" | "overrideNew";

export default function CsvImport() {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [encoding, setEncoding] = useState<string>("");
  const [items, setItems] = useState<ImportItem[]>([]);
  const [invalidCount, setInvalidCount] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);

  const [modeOpen, setModeOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("fromCsv");
  const [override, setOverride] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [catalogCount, setCatalogCount] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);

  const refreshCount = useCallback(async () => {
    try {
      const rows = await listCatalog();
      setCatalogCount(rows?.length || 0);
    } catch {
      setCatalogCount(0);
    }
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  async function pick() {
    setPicking(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/plain", "text/comma-separated-values", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled) {
        setPicking(false);
        return;
      }
      const asset = res.assets?.[0];
      if (!asset) {
        setPicking(false);
        return;
      }
      const name = asset.name || "file.csv";
      setFileName(name);

      const bytes = await readAssetBytes(asset);
      const parsed = await parseSpreadsheetBytes(bytes, name);
      if (!parsed.ok) {
        setErr(parsed.error);
        setPicking(false);
        return;
      }
      const mapped = rowsToItems(parsed.rows);
      setEncoding(parsed.encoding);
      setItems(mapped.items);
      setInvalidCount(mapped.invalid);

      if (mapped.items.length === 0) {
        setErr(
          "No valid rows found. Need product_name, unit, and selling_price (or mrp). Brand, product_code, and image_url should be in the same header row.",
        );
      }
    } catch (e: any) {
      setErr(e?.message || "Could not read the file.");
    } finally {
      setPicking(false);
    }
  }

  async function runImport() {
    setImporting(true);
    try {
      if (replaceExisting && catalogCount > 0) {
        await clearCatalog();
        setCatalogCount(0);
      }
      const res = await importCatalog({
        items,
        categoryMode: mode,
        overrideCategory: override.trim(),
        replaceExisting,
      });
      const hasProductCodes = items.some((item) => item.productCode);
      const listed = await listCatalog();
      const sample = listed?.[0];
      const missingBits = [
        items[0]?.brand && sample && !sample.brand ? "brand" : "",
        items[0]?.productCode && sample && !sample.productCode ? "product code" : "",
        items[0]?.imageUrl && sample && !sample.imageUrl ? "image" : "",
      ].filter(Boolean);
      const backendWarning = missingBits.length
        ? ` Imported rows are missing ${missingBits.join(", ")} on the server. Deploy the updated backend, then import again.`
        : hasProductCodes && res.updated === undefined
        ? " The connected backend is an older version and did not report product-code updates. Deploy/restart the updated backend before importing again."
        : "";
      setResult(
        `${replaceExisting ? "Replaced catalog. " : ""}Imported ${res.inserted} item(s), updated ${res.updated || 0}, skipped ${res.skipped}.${backendWarning}`,
      );
      setItems([]);
      setFileName("");
      setModeOpen(false);
      await refreshCount();
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function runClear() {
    setClearing(true);
    try {
      const res = await clearCatalog();
      setClearOpen(false);
      setResult(`Cleared ${res.deleted} product(s). Catalog is empty — you can import a CSV now.`);
      await refreshCount();
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Could not clear catalog");
    } finally {
      setClearing(false);
    }
  }

  const canImport = items.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Import Catalog"
        subtitle="CSV or Excel with brand, product code, prices, and image URLs"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Card style={styles.warnCard}>
          <Text style={styles.title}>Current catalog</Text>
          <Text style={styles.hint}>
            {catalogCount === 0
              ? "Catalog is empty. Import will add a clean product list."
              : `${catalogCount} product(s) are in the live catalog. A normal import only adds rows — it does not replace the messy ones. Clear first, or turn on “Replace catalog” when you import.`}
          </Text>
          <View style={{ height: spacing.md }} />
          <Button
            testID="clear-catalog-btn"
            title={catalogCount === 0 ? "Catalog already empty" : `Clear all ${catalogCount} products`}
            icon="trash-outline"
            variant="danger"
            onPress={() => setClearOpen(true)}
            disabled={catalogCount === 0}
            fullWidth
          />
        </Card>
        <View style={{ height: spacing.md }} />
        <Card>
          <Text style={styles.title}>Step 1 — pick your file</Text>
          <Text style={styles.hint}>
            Required headers: <Text style={styles.mono}>category, type, product_group, brand, product_name, size_mm, size_inch, product_code, length, unit, mrp, selling_price, purchase_price, stock_qty, discount, image_url, is_active</Text>.{" "}
            <Text style={styles.mono}>product_code</Text> updates existing products instead of creating duplicates. Encodings auto-detected:
            UTF-8, UTF-8 BOM, UTF-16 LE/BE. You can also upload the same columns as <Text style={styles.mono}>.xlsx</Text>.
          </Text>
          <Text style={styles.hint}>
            Brand, product_code, product_group, type, and image_url are saved on each product — they are not optional extras. For photos, put a publicly reachable image URL in <Text style={styles.mono}>image_url</Text>. Discount can be <Text style={styles.mono}>25</Text> or <Text style={styles.mono}>25%</Text>. After import, change MRP, discount, and stock on Products — you do not need to upload again.
          </Text>
          <View style={{ height: spacing.md }} />
          <Button
            testID="pick-csv-btn"
            title={fileName ? `Change file` : "Choose CSV or Excel file"}
            icon="folder-open-outline"
            onPress={pick}
            loading={picking}
            fullWidth
          />
          {fileName ? (
            <View style={styles.fileRow}>
              <Ionicons name="document-text" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {fileName}
                </Text>
                <Text style={styles.fileMeta}>
                  {items.length} valid row(s) · {invalidCount} skipped ·{" "}
                  {encoding}
                </Text>
              </View>
            </View>
          ) : null}
        </Card>

        {items.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Preview</Text>
            <Card style={{ padding: 0 }}>
              <View style={styles.previewHead}>
                <Text style={[styles.previewCell, { flex: 2 }]}>Product</Text>
                <Text style={styles.previewCell}>Category</Text>
                <Text style={styles.previewCell}>Brand</Text>
                <Text style={styles.previewCell}>Code</Text>
                <Text style={[styles.previewCell, { textAlign: "right" }]}>MRP</Text>
                <Text style={[styles.previewCell, { textAlign: "right" }]}>Disc</Text>
                <Text style={[styles.previewCell, { textAlign: "right" }]}>Sell</Text>
                <Text style={[styles.previewCell, { textAlign: "right" }]}>Qty</Text>
              </View>
              {items.slice(0, 30).map((it, idx) => (
                <View key={`${it.name}-${idx}`} style={styles.previewRow}>
                  <Text
                    numberOfLines={1}
                    style={[styles.previewCellBody, { flex: 2 }]}
                  >
                    {it.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.previewCellBody}>
                    {it.category || "—"}
                  </Text>
                  <Text numberOfLines={1} style={styles.previewCellBody}>
                    {it.brand || "—"}
                  </Text>
                  <Text numberOfLines={1} style={styles.previewCellBody}>
                    {it.productCode || "—"}
                  </Text>
                  <Text style={[styles.previewCellBody, { textAlign: "right" }]}>
                    {it.mrp ?? "—"}
                  </Text>
                  <Text style={[styles.previewCellBody, { textAlign: "right" }]}>
                    {it.discount == null ? "—" : `${it.discount}%`}
                  </Text>
                  <Text style={[styles.previewCellBody, { textAlign: "right" }]}>
                    ₹{it.sellingPrice ?? it.standardRate}
                  </Text>
                  <Text style={[styles.previewCellBody, { textAlign: "right" }]}>
                    {it.stock ?? 0}
                  </Text>
                </View>
              ))}
              {items.length > 30 ? (
                <Text style={styles.previewMore}>
                  … and {items.length - 30} more
                </Text>
              ) : null}
            </Card>

            <View style={{ height: spacing.lg }} />
            <Button
              testID="open-mode-btn"
              title="Continue to category routing"
              icon="arrow-forward"
              onPress={() => setModeOpen(true)}
              fullWidth
              disabled={!canImport}
            />
          </>
        ) : null}
      </ScrollView>

      {/* Category routing prompt */}
      <AppModal
        testID="category-mode-modal"
        visible={modeOpen}
        onClose={() => setModeOpen(false)}
        title="Choose category routing"
      >
        <Text style={styles.hint}>
          How should we assign categories for these {items.length} items?
        </Text>
        <View style={{ height: spacing.md }} />
        <ModeRow
          testID="mode-fromCsv"
          selected={mode === "fromCsv"}
          title="Use categories from CSV"
          subtitle="Rows without a category fall back to “General”."
          onPress={() => setMode("fromCsv")}
        />
        <ModeRow
          testID="mode-overrideExisting"
          selected={mode === "overrideExisting"}
          title="Force ALL items into one category"
          subtitle="Overrides any category in the CSV."
          onPress={() => setMode("overrideExisting")}
        />
        <ModeRow
          testID="mode-overrideNew"
          selected={mode === "overrideNew"}
          title="Only fill blanks with one category"
          subtitle="Keeps CSV values, sets a default where empty."
          onPress={() => setMode("overrideNew")}
        />

        {mode !== "fromCsv" ? (
          <>
            <View style={{ height: spacing.md }} />
            <Input
              testID="override-category-input"
              label="Override category name"
              placeholder="e.g. Materials"
              value={override}
              onChangeText={setOverride}
              autoCapitalize="words"
            />
          </>
        ) : null}

        <View style={{ height: spacing.md }} />
        <Pressable
          testID="toggle-replace-existing"
          accessibilityRole="button"
          onPress={() => setReplaceExisting((v) => !v)}
          style={({ hovered }) => [
            styles.modeRow,
            pointer,
            replaceExisting && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
            hovered && { borderColor: colors.primary },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.modeTitle, replaceExisting && { color: colors.primary }]}>
              Replace catalog with this CSV
            </Text>
            <Text style={styles.modeSub}>
              Deletes every existing product first, then imports. Use this after a bad import.
            </Text>
          </View>
          <Ionicons
            name={replaceExisting ? "checkbox" : "square-outline"}
            size={22}
            color={replaceExisting ? colors.primary : colors.textMuted}
          />
        </Pressable>

        <View style={{ height: spacing.md }} />
        <Button
          testID="run-import-btn"
          title={
            importing
              ? "Importing…"
              : replaceExisting
              ? `Replace catalog with ${items.length} items`
              : `Import ${items.length} items`
          }
          icon="cloud-upload-outline"
          onPress={runImport}
          loading={importing}
          fullWidth
        />
      </AppModal>

      <AppModal
        testID="clear-catalog-modal"
        visible={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear entire catalog?"
      >
        <Text style={styles.hint}>
          This deletes all {catalogCount} products from the live catalog. Categories, brands, and partners stay. This cannot be undone.
        </Text>
        <View style={{ height: spacing.md }} />
        <Button
          testID="confirm-clear-catalog"
          title={clearing ? "Clearing…" : "Yes, delete all products"}
          variant="danger"
          onPress={runClear}
          loading={clearing}
          fullWidth
        />
        <View style={{ height: spacing.sm }} />
        <Button
          testID="cancel-clear-catalog"
          title="Cancel"
          variant="ghost"
          onPress={() => setClearOpen(false)}
          fullWidth
        />
      </AppModal>

      {/* Success sheet */}
      <AppModal
        testID="import-success-modal"
        visible={!!result}
        onClose={() => setResult(null)}
        title="Import complete"
      >
        <Text style={styles.hint}>{result}</Text>
        <View style={{ height: spacing.md }} />
        <Button
          testID="import-done-btn"
          title="Done"
          onPress={() => {
            setResult(null);
            router.back();
          }}
          fullWidth
        />
      </AppModal>

      <ErrorModal
        visible={!!err}
        message={err || ""}
        onClose={() => setErr(null)}
      />
    </SafeAreaView>
  );
}

function ModeRow(props: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      style={({ hovered }) => [
        styles.modeRow,
        pointer,
        props.selected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
        hovered && { borderColor: colors.primary },
      ]}
      onPress={props.onPress}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.modeTitle,
            props.selected && { color: colors.primary },
          ]}
        >
          {props.title}
        </Text>
        <Text style={styles.modeSub}>{props.subtitle}</Text>
      </View>
      <Ionicons
        name={props.selected ? "radio-button-on" : "radio-button-off"}
        size={20}
        color={props.selected ? colors.primary : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { ...font.h3, color: colors.textPrimary, marginBottom: 4 },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  mono: { fontFamily: "Courier", color: colors.textPrimary },
  warnCard: {
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  fileRow: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fileName: { color: colors.textPrimary, fontWeight: "700" },
  fileMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  sectionTitle: {
    ...font.title,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  previewHead: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewCell: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  previewRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewCellBody: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  previewMore: {
    padding: spacing.md,
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 12,
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  modeTitle: { ...font.title, color: colors.textPrimary },
  modeSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
