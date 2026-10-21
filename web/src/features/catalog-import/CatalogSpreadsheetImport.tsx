import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  importCatalogMaster,
  importCatalogPricing,
  importCatalogStock,
  importPipesFittings,
  importPipesFittingsImages,
  validatePipesFittingsImport,
  type SheetValidationError,
} from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { AppModal, Button, Card, ErrorModal, Header, Input } from "../../components/UI";
import { colors, font, spacing } from "../../theme";
import {
  rowsToMasterItems,
  rowsToPricingItems,
  rowsToStockItems,
  type MasterImportItem,
  type PricingImportItem,
  type StockImportItem,
} from "../../utils/csv";
import { parseSpreadsheetBytes } from "../../utils/spreadsheet";
import { downloadImportTemplate, type ImportTemplateKind } from "../../utils/import-templates";

type Mode = "fromCsv" | "overrideExisting" | "overrideNew";
export type CatalogImportKind =
  | "master"
  | "pricing"
  | "stock"
  | "pipes-fittings"
  | "pipes-fittings-images";

type Props = {
  kind: CatalogImportKind;
  title: string;
  subtitle: string;
  columnHelp: string;
  showCategoryMode?: boolean;
};

export function CatalogSpreadsheetImport(props: Props) {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [picking, setPicking] = useState(false);
  const [fileName, setFileName] = useState("");
  const [encoding, setEncoding] = useState("");
  const [previewCount, setPreviewCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [payload, setPayload] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("fromCsv");
  const [override, setOverride] = useState("");

  async function readFile(file: File) {
    setPicking(true);
    setResult(null);
    setFileName(file.name || "file.csv");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = await parseSpreadsheetBytes(bytes, file.name || "file.csv");
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setEncoding(parsed.encoding);
      if (props.kind === "master") {
        const mapped = rowsToMasterItems(parsed.rows);
        setPayload(mapped.items);
        setPreviewCount(mapped.items.length);
        setInvalidCount(mapped.invalid);
        if (!mapped.items.length) {
          setError("No valid rows. Need at least Product Name (and product_code strongly recommended).");
        }
      } else if (props.kind === "pricing") {
        const mapped = rowsToPricingItems(parsed.rows);
        setPayload(mapped.items);
        setPreviewCount(mapped.items.length);
        setInvalidCount(mapped.invalid);
        if (!mapped.items.length) {
          setError("No valid rows. Need product_code plus MRP, discount, or selling price.");
        }
      } else if (props.kind === "stock") {
        const mapped = rowsToStockItems(parsed.rows);
        setPayload(mapped.items);
        setPreviewCount(mapped.items.length);
        setInvalidCount(mapped.invalid);
        if (!mapped.items.length) {
          setError("No valid rows. Need product_code and qty (or stock_qty).");
        }
      } else if (props.kind === "pipes-fittings") {
        setPayload(parsed.rows);
        setPreviewCount(parsed.rows.length);
        setInvalidCount(0);
        if (!parsed.rows.length) {
          setError("No data rows found.");
        }
      } else {
        setPayload(parsed.rows);
        setPreviewCount(parsed.rows.length);
        setInvalidCount(0);
        if (!parsed.rows.length) {
          setError("No data rows. Need brand, product_family, and image_url.");
        }
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not read the file.");
    } finally {
      setPicking(false);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void readFile(file);
  }

  async function submitImport(categoryMode = mode, includeExistingProductNotice = true) {
    if (!payload.length) return;
    setImporting(true);
    try {
      if (props.kind === "master") {
        const response = await importCatalogMaster({
          items: payload as MasterImportItem[],
          categoryMode,
          overrideCategory: override.trim(),
        });
        const existingProductNotice = includeExistingProductNotice
          ? " Existing products kept their stock and prices."
          : "";
        setResult(`Imported ${response.inserted} new, updated ${response.updated}, skipped ${response.skipped}.${existingProductNotice}`);
      } else if (props.kind === "pricing") {
        const response = await importCatalogPricing({ items: payload as PricingImportItem[] });
        const warning = response.warnings?.length
          ? ` Warnings: ${response.warnings.slice(0, 3).join("; ")}`
          : "";
        setResult(`Updated prices on ${response.updated} product(s), skipped ${response.skipped}.${warning}`);
      } else if (props.kind === "stock") {
        const response = await importCatalogStock({ items: payload as StockImportItem[] });
        setResult(`Set stock on ${response.updated} product(s), skipped ${response.skipped}.`);
      } else if (props.kind === "pipes-fittings") {
        const rows = payload as Record<string, string>[];
        const check = await validatePipesFittingsImport({ rows });
        if (!check.valid) {
          setError(formatSheetErrors(check.errors));
          return;
        }
        const response = await importPipesFittings({ rows });
        if (response.errors?.length) {
          setError(formatSheetErrors(response.errors));
          return;
        }
        setResult(`Pipes & fittings: ${response.inserted} new, ${response.updated} updated.`);
      } else {
        const rows = payload as Record<string, string>[];
        const items = rows.map((row) => ({
          brand: row.brand ?? row.Brand ?? "",
          product_family: row.product_family ?? row.product ?? row.Product ?? "",
          image_url: row.image_url ?? row.imageUrl ?? "",
        }));
        const response = await importPipesFittingsImages({ items });
        if (response.errors?.length) {
          setError(formatSheetErrors(response.errors));
          return;
        }
        setResult(`Updated images on ${response.updated} product family row(s).`);
      }
      setPayload([]);
      setPreviewCount(0);
      setFileName("");
    } catch (cause: unknown) {
      if (cause instanceof ApiError && cause.status === 404) {
        setError(
          "Import API not found (404). Restart the backend on this machine (port 8001) and set env.ts USE_CLOUD_PREVIEW = false. Deploy the latest server.py before using cloud hosting.",
        );
      } else {
        setError(cause instanceof ApiError ? cause.message : "Import failed");
      }
    } finally {
      setImporting(false);
    }
  }

  const accent =
    props.kind === "master"
      ? colors.primary
      : props.kind === "pricing"
        ? colors.secondary
        : props.kind === "pipes-fittings"
          ? "#7C3AED"
          : props.kind === "pipes-fittings-images"
            ? "#9333EA"
            : "#0D9488";

  function formatSheetErrors(errors: SheetValidationError[]): string {
    const lines = errors.slice(0, 12).map((entry) => {
      const where = entry.row ? `Row ${entry.row}` : "Sheet";
      const col = entry.column ? `, ${entry.column}` : "";
      return `${where}${col}: ${entry.message}`;
    });
    if (errors.length > 12) lines.push(`…and ${errors.length - 12} more`);
    return lines.join("\n");
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header title={props.title} subtitle={props.subtitle} onBack={() => navigate(-1)} />
      <div className="admin-page-container" style={{ maxWidth: "none", margin: "0 auto", padding: spacing.lg }}>
        <div style={{ backgroundColor: `${accent}18`, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md }}>
          <span style={{ ...font.caption, color: accent, fontWeight: 700, display: "block", lineHeight: "14px" }}>
            {props.kind === "master"
              ? "Product master - client sheet format; existing rows keep stock & prices"
              : props.kind === "pricing"
                ? "Prices only - matched by Product Code"
                : props.kind === "pipes-fittings"
                  ? "Pipes & fittings v1 — families + SKUs; validates entire sheet before upload"
                  : props.kind === "pipes-fittings-images"
                    ? "Family images — brand, product_family, image_url"
                    : "Stock count - sets on-hand qty by Product Code"}
          </span>
        </div>
        <Card>
          <h2 style={{ ...font.title, color: colors.textPrimary, margin: `0 0 ${spacing.sm}px` }}>Columns</h2>
          <p style={{ color: colors.textSecondary, lineHeight: "20px", margin: 0 }}>{props.columnHelp}</p>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={onFileChange}
            data-testid={`${props.kind}-import-file`}
            style={{ display: "none" }}
          />
          <div style={{ display: "grid", gap: spacing.md, marginTop: spacing.sm }}>
            <Button
              testID={`download-${props.kind}-template`}
              title="Download empty template (CSV)"
              icon="download-outline"
              variant="ghost"
              size="sm"
              onPress={() =>
                downloadImportTemplate(
                  props.kind === "pipes-fittings"
                    ? "pipes_fittings"
                    : props.kind === "pipes-fittings-images"
                      ? "pipes_fittings_images"
                      : (props.kind as ImportTemplateKind),
                )
              }
              style={{ width: "100%" }}
            />
            <Button
              testID={`pick-${props.kind}-import`}
              title={picking ? "Reading..." : fileName ? `Selected: ${fileName}` : "Choose CSV or Excel"}
              icon="document-outline"
              loading={picking}
              onPress={() => fileInput.current?.click()}
              style={{ width: "100%" }}
            />
          </div>
          {previewCount ? (
            <p style={{ color: colors.textMuted, fontSize: 12, marginBottom: 0 }}>
              {previewCount} row(s) ready · encoding {encoding}
              {invalidCount ? ` · ${invalidCount} skipped as invalid` : ""}
            </p>
          ) : null}
          <Button
            testID={`run-${props.kind}-import`}
            title="Import now"
            onPress={() => void submitImport()}
            loading={importing}
            disabled={!previewCount}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
          {props.showCategoryMode ? (
            <Button
              title="Category routing options"
              variant="ghost"
              size="sm"
              onPress={() => setModeOpen(true)}
              testID="master-import-category-mode"
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
        </Card>
        {result ? (
          <Card style={{ backgroundColor: colors.successBg, borderColor: colors.success, marginTop: spacing.md }}>
            <p style={{ color: colors.textPrimary, lineHeight: 1.45, margin: 0 }}>{result}</p>
          </Card>
        ) : null}
      </div>
      <AppModal visible={modeOpen} onClose={() => setModeOpen(false)} title="Category routing">
        <p style={{ color: colors.textSecondary, lineHeight: 1.45, marginTop: 0 }}>
          Use sheet categories (recommended) or override for empty rows.
        </p>
        <Button
          title={mode === "fromCsv" ? "✓ From sheet" : "From sheet"}
          variant={mode === "fromCsv" ? "primary" : "ghost"}
          onPress={() => setMode("fromCsv")}
          size="sm"
        />
        <Input label="Override category (optional)" value={override} onChangeText={setOverride} />
        <Button title="Confirm import" onPress={() => { setModeOpen(false); void submitImport(mode, false); }} loading={importing} fullWidth />
      </AppModal>
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}