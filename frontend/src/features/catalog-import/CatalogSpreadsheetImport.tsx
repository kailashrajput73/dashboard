import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import { Header, Card, Button, Input, AppModal, ErrorModal } from "@/src/components/UI";
import { colors, spacing, radii, font } from "@/src/theme";
import { parseSpreadsheetBytes } from "@/src/utils/spreadsheet";
import { readAssetBytes } from "@/src/utils/read-asset-bytes";
import {
  rowsToMasterItems,
  rowsToPricingItems,
  rowsToStockItems,
} from "@/src/utils/csv";
import {
  importCatalogMaster,
  importCatalogPricing,
  importCatalogStock,
} from "@/src/api/endpoints";
import { downloadImportTemplate, type ImportTemplateKind } from "@/src/utils/import-templates";

type Mode = "fromCsv" | "overrideExisting" | "overrideNew";

export type CatalogImportKind = "master" | "pricing" | "stock";

type Props = {
  kind: CatalogImportKind;
  title: string;
  subtitle: string;
  columnHelp: string;
  showCategoryMode?: boolean;
};

export function CatalogSpreadsheetImport(props: Props) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [fileName, setFileName] = useState("");
  const [encoding, setEncoding] = useState("");
  const [previewCount, setPreviewCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [payload, setPayload] = useState<unknown[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("fromCsv");
  const [override, setOverride] = useState("");

  async function pick() {
    setPicking(true);
    setResult(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "*/*",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setFileName(asset.name || "file.csv");
      const bytes = await readAssetBytes(asset);
      const parsed = await parseSpreadsheetBytes(bytes, asset.name || "file.csv");
      if (!parsed.ok) {
        setErr(parsed.error);
        return;
      }
      setEncoding(parsed.encoding);
      if (props.kind === "master") {
        const mapped = rowsToMasterItems(parsed.rows);
        setPayload(mapped.items);
        setPreviewCount(mapped.items.length);
        setInvalidCount(mapped.invalid);
        if (mapped.items.length === 0) {
          setErr("No valid rows. Need at least Product Name (and product_code strongly recommended).");
        }
      } else if (props.kind === "pricing") {
        const mapped = rowsToPricingItems(parsed.rows);
        setPayload(mapped.items);
        setPreviewCount(mapped.items.length);
        setInvalidCount(mapped.invalid);
        if (mapped.items.length === 0) {
          setErr("No valid rows. Need product_code plus MRP, discount, or selling price.");
        }
      } else {
        const mapped = rowsToStockItems(parsed.rows);
        setPayload(mapped.items);
        setPreviewCount(mapped.items.length);
        setInvalidCount(mapped.invalid);
        if (mapped.items.length === 0) {
          setErr("No valid rows. Need product_code and qty (or stock_qty).");
        }
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not read the file.");
    } finally {
      setPicking(false);
    }
  }

  async function runImport() {
    if (payload.length === 0) return;
    setImporting(true);
    try {
      if (props.kind === "master") {
        const res = await importCatalogMaster({
          items: payload as Parameters<typeof importCatalogMaster>[0]["items"],
          categoryMode: mode,
          overrideCategory: override.trim(),
        });
        setResult(
          `Imported ${res.inserted} new, updated ${res.updated}, skipped ${res.skipped}. Existing products kept their stock and prices.`,
        );
      } else if (props.kind === "pricing") {
        const res = await importCatalogPricing({ items: payload as { productCode: string; mrp?: number; discount?: number; sellingPrice?: number }[] });
        const warn = res.warnings?.length ? ` Warnings: ${res.warnings.slice(0, 3).join("; ")}` : "";
        setResult(`Updated prices on ${res.updated} product(s), skipped ${res.skipped}.${warn}`);
      } else {
        const res = await importCatalogStock({ items: payload as { productCode: string; stock: number }[] });
        setResult(`Set stock on ${res.updated} product(s), skipped ${res.skipped}.`);
      }
      setPayload([]);
      setPreviewCount(0);
      setFileName("");
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        setErr(
          "Import API not found (404). Restart the backend on this machine (port 8001) and set env.ts USE_CLOUD_PREVIEW = false. Deploy the latest server.py before using cloud hosting.",
        );
      } else {
        setErr(e instanceof ApiError ? e.message : "Import failed");
      }
    } finally {
      setImporting(false);
    }
  }

  async function confirmMasterImport() {
    setModeOpen(false);
    setImporting(true);
    try {
      const res = await importCatalogMaster({
        items: payload as Parameters<typeof importCatalogMaster>[0]["items"],
        categoryMode: mode,
        overrideCategory: override.trim(),
      });
      setResult(`Imported ${res.inserted} new, updated ${res.updated}, skipped ${res.skipped}.`);
      setPayload([]);
      setPreviewCount(0);
      setFileName("");
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        setErr(
          "Import API not found (404). Restart the backend on this machine (port 8001) and set env.ts USE_CLOUD_PREVIEW = false. Deploy the latest server.py before using cloud hosting.",
        );
      } else {
        setErr(e instanceof ApiError ? e.message : "Import failed");
      }
    } finally {
      setImporting(false);
    }
  }

  const accent =
    props.kind === "master" ? colors.primary : props.kind === "pricing" ? colors.secondary : "#0D9488";

  function downloadTemplate() {
    downloadImportTemplate(props.kind as ImportTemplateKind);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header title={props.title} subtitle={props.subtitle} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.badge, { backgroundColor: accent + "18" }]}>
          <Text style={[styles.badgeText, { color: accent }]}>
            {props.kind === "master"
              ? "Product master — client sheet format; existing rows keep stock & prices"
              : props.kind === "pricing"
                ? "Prices only — matched by Product Code"
                : "Stock count — sets on-hand qty by Product Code"}
          </Text>
        </View>

        <Card>
          <Text style={styles.title}>Columns</Text>
          <Text style={styles.hint}>{props.columnHelp}</Text>
          <View style={{ height: spacing.sm }} />
          <Button
            testID={`download-${props.kind}-template`}
            title="Download empty template (CSV)"
            icon="download-outline"
            variant="ghost"
            size="sm"
            onPress={downloadTemplate}
            fullWidth
          />
          <View style={{ height: spacing.md }} />
          <Button
            testID={`pick-${props.kind}-import`}
            title={picking ? "Reading…" : fileName ? `Selected: ${fileName}` : "Choose CSV or Excel"}
            icon="document-outline"
            onPress={pick}
            loading={picking}
            fullWidth
          />
          {previewCount > 0 ? (
            <Text style={styles.meta}>
              {previewCount} row(s) ready · encoding {encoding}
              {invalidCount ? ` · ${invalidCount} skipped as invalid` : ""}
            </Text>
          ) : null}
          <View style={{ height: spacing.md }} />
          <Button
            testID={`run-${props.kind}-import`}
            title="Import now"
            onPress={runImport}
            loading={importing}
            disabled={previewCount === 0}
            fullWidth
          />
          {props.showCategoryMode ? (
            <Button
              title="Category routing options"
              variant="ghost"
              size="sm"
              onPress={() => setModeOpen(true)}
              testID="master-import-category-mode"
            />
          ) : null}
        </Card>

        {result ? (
          <Card style={styles.resultCard}>
            <Text style={styles.result}>{result}</Text>
          </Card>
        ) : null}
      </ScrollView>

      <AppModal visible={modeOpen} onClose={() => setModeOpen(false)} title="Category routing">
        <Text style={styles.hint}>Use sheet categories (recommended) or override for empty rows.</Text>
        <View style={{ height: spacing.sm }} />
        <Button
          title={mode === "fromCsv" ? "✓ From sheet" : "From sheet"}
          variant={mode === "fromCsv" ? "primary" : "ghost"}
          onPress={() => setMode("fromCsv")}
          size="sm"
        />
        <Input label="Override category (optional)" value={override} onChangeText={setOverride} />
        <View style={{ height: spacing.md }} />
        <Button title="Confirm import" onPress={confirmMasterImport} loading={importing} fullWidth />
      </AppModal>

      <ErrorModal visible={!!err} message={err || ""} onClose={() => setErr(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  badge: { borderRadius: radii.md, padding: spacing.md },
  badgeText: { ...font.caption, fontWeight: "700" },
  title: { ...font.title, color: colors.textPrimary, marginBottom: spacing.sm },
  hint: { color: colors.textSecondary, lineHeight: 20, fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  resultCard: { backgroundColor: colors.successBg, borderColor: colors.success },
  result: { color: colors.textPrimary, lineHeight: 22 },
});
