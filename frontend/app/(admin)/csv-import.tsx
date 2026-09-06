import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
// Legacy namespace still ships `readAsStringAsync` + `EncodingType` in
// expo-file-system 19; the new File API doesn't have a base64 shortcut yet.
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";

import {
  Header,
  Card,
  Button,
  Input,
  AppModal,
  ErrorModal,
} from "@/src/components/UI";
import { colors, spacing, radii, shadow, font } from "@/src/theme";
import { parseCsvBytes, rowsToItems, type ImportItem } from "@/src/utils/csv";
import { importCatalog } from "@/src/api/endpoints";
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

  async function pick() {
    setPicking(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/plain", "text/comma-separated-values", "*/*"],
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

      const lower = name.toLowerCase();
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        setErr(
          "Excel files (.xlsx / .xls) are not supported. Please export as CSV (UTF-8) and try again.",
        );
        setPicking(false);
        return;
      }

      const bytes = await readAssetBytes(asset.uri);
      const parsed = parseCsvBytes(bytes);
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
          "No valid rows found. CSV needs headers: name, category (optional), unit, standardRate/rate.",
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
      const res = await importCatalog({
        items,
        categoryMode: mode,
        overrideCategory: override.trim(),
      });
      setResult(`Imported ${res.inserted} item(s), skipped ${res.skipped}.`);
      setItems([]);
      setFileName("");
      setModeOpen(false);
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const canImport = items.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Import Catalog CSV"
        subtitle="Bulk-add items from a spreadsheet"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Card>
          <Text style={styles.title}>Step 1 — pick your file</Text>
          <Text style={styles.hint}>
            CSV headers required: <Text style={styles.mono}>name</Text>,{" "}
            <Text style={styles.mono}>unit</Text>,{" "}
            <Text style={styles.mono}>standardRate</Text>. Optional:{" "}
            <Text style={styles.mono}>category</Text>. Encodings auto-detected:
            UTF-8, UTF-8 BOM, UTF-16 LE/BE.
          </Text>
          <View style={{ height: spacing.md }} />
          <Button
            testID="pick-csv-btn"
            title={fileName ? `Change file` : "Choose CSV file"}
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
                <Text style={[styles.previewCell, { flex: 2 }]}>Name</Text>
                <Text style={styles.previewCell}>Category</Text>
                <Text style={styles.previewCell}>Unit</Text>
                <Text style={[styles.previewCell, { textAlign: "right" }]}>
                  Rate
                </Text>
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
                  <Text style={styles.previewCellBody}>{it.unit}</Text>
                  <Text
                    style={[styles.previewCellBody, { textAlign: "right" }]}
                  >
                    ₹{it.standardRate}
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
        <Button
          testID="run-import-btn"
          title={importing ? "Importing…" : `Import ${items.length} items`}
          icon="cloud-upload-outline"
          onPress={runImport}
          loading={importing}
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
    <TouchableOpacity
      testID={props.testID}
      style={[
        styles.modeRow,
        props.selected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
      ]}
      onPress={props.onPress}
      activeOpacity={0.7}
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
    </TouchableOpacity>
  );
}

async function readAssetBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Could not read the selected CSV file.");
    return new Uint8Array(await response.arrayBuffer());
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBytes(base64);
}

function base64ToBytes(b64: string): Uint8Array {
  // Node-free base64 decode that works on RN + web.
  const binary =
    typeof atob === "function"
      ? atob(b64)
      : // React Native (Hermes) exposes atob globally, but fallback anyway
        globalThis.Buffer
        ? globalThis.Buffer.from(b64, "base64").toString("binary")
        : "";
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { ...font.h3, color: colors.textPrimary, marginBottom: 4 },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  mono: { fontFamily: "Courier", color: colors.textPrimary },
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
