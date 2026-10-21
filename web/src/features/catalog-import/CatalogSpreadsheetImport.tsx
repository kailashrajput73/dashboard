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
import { Icon } from "../../components/Icon";
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
import { SheetValidationPanel } from "./SheetValidationPanel";

type SheetCheckState = {
  checking: boolean;
  valid: boolean;
  errors: SheetValidationError[];
  rowCount: number;
};

function errorsFromApi(cause: unknown): SheetValidationError[] | null {
  if (!(cause instanceof ApiError)) return null;
  const data = cause.body?.data;
  if (data && Array.isArray(data.errors)) return data.errors as SheetValidationError[];
  return null;
}

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
  /** Full product master only: links to pipes v1 imports (not on spreadsheet hub). */
  showPipesFittingsEntry?: boolean;
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
  const [sheetCheck, setSheetCheck] = useState<SheetCheckState | null>(null);

  async function runPipesSheetValidation(rows: Record<string, string>[]) {
    setSheetCheck({ checking: true, valid: false, errors: [], rowCount: rows.length });
    try {
      const check = await validatePipesFittingsImport({ rows });
      setSheetCheck({
        checking: false,
        valid: check.valid,
        errors: check.errors ?? [],
        rowCount: check.rowCount ?? rows.length,
      });
    } catch (cause: unknown) {
      const apiErrors = errorsFromApi(cause);
      if (apiErrors?.length) {
        setSheetCheck({
          checking: false,
          valid: false,
          errors: apiErrors,
          rowCount: rows.length,
        });
      } else {
        setSheetCheck(null);
        setError(cause instanceof ApiError ? cause.message : "Could not validate the sheet.");
      }
    }
  }

  async function readFile(file: File) {
    setPicking(true);
    setResult(null);
    setSheetCheck(null);
    setError(null);
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
        const rows = parsed.rows as Record<string, string>[];
        setPayload(rows);
        setPreviewCount(rows.length);
        setInvalidCount(0);
        if (!rows.length) {
          setError("No data rows found.");
        } else {
          await runPipesSheetValidation(rows);
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
        if (sheetCheck && !sheetCheck.valid) {
          return;
        }
        const check = await validatePipesFittingsImport({ rows });
        if (!check.valid) {
          setSheetCheck({
            checking: false,
            valid: false,
            errors: check.errors ?? [],
            rowCount: check.rowCount ?? rows.length,
          });
          return;
        }
        const response = await importPipesFittings({ rows });
        if (response.errors?.length) {
          setSheetCheck({
            checking: false,
            valid: false,
            errors: response.errors,
            rowCount: rows.length,
          });
          return;
        }
        setSheetCheck(null);
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
      const apiErrors = errorsFromApi(cause);
      if (apiErrors?.length && props.kind === "pipes-fittings") {
        setSheetCheck({
          checking: false,
          valid: false,
          errors: apiErrors,
          rowCount: (payload as unknown[]).length,
        });
      } else if (cause instanceof ApiError && cause.status === 404) {
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
    return errors
      .slice(0, 12)
      .map((entry) => {
        const where = entry.row ? `Row ${entry.row}` : "Sheet";
        const col = entry.column ? `, ${entry.column}` : "";
        return `${where}${col}: ${entry.message}`;
      })
      .join("\n");
  }

  const pipesImportBlocked =
    props.kind === "pipes-fittings" &&
    sheetCheck !== null &&
    (sheetCheck.checking || !sheetCheck.valid);

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
        {props.showPipesFittingsEntry ? (
          <Card style={{ marginBottom: spacing.md, backgroundColor: colors.primaryLight }}>
            <p style={{ ...font.caption, color: colors.textSecondary, margin: `0 0 ${spacing.sm}px`, lineHeight: 1.45 }}>
              Pipes &amp; fitting (new format) — use while testing; legacy master below will be retired.
            </p>
            <nav aria-label="Pipes and fittings imports" style={{ display: "grid", gap: spacing.sm }}>
              <button
                type="button"
                data-testid="nav-import-pipes-fittings"
                onClick={() => navigate("/import-pipes-fittings")}
                style={pipesEntryButtonStyle}
              >
                <Icon name="git-branch-outline" size={20} color={colors.primary} />
                <span style={{ flex: 1, textAlign: "left" }}>
                  <span style={{ ...font.title, display: "block", fontSize: 14 }}>Pipes &amp; fittings (v1)</span>
                  <span style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Families + SKU rows — validate before import
                  </span>
                </span>
                <Icon name="chevron-forward" size={16} color={colors.textMuted} />
              </button>
              <button
                type="button"
                data-testid="nav-import-pipes-fittings-images"
                onClick={() => navigate("/import-pipes-fittings-images")}
                style={pipesEntryButtonStyle}
              >
                <Icon name="image-outline" size={20} color={colors.primary} />
                <span style={{ flex: 1, textAlign: "left" }}>
                  <span style={{ ...font.title, display: "block", fontSize: 14 }}>Pipes &amp; fittings images</span>
                  <span style={{ color: colors.textSecondary, fontSize: 12 }}>brand + product_family + image_url</span>
                </span>
                <Icon name="chevron-forward" size={16} color={colors.textMuted} />
              </button>
            </nav>
          </Card>
        ) : null}
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
            title={
              props.kind === "pipes-fittings" && sheetCheck?.checking
                ? "Validating…"
                : props.kind === "pipes-fittings" && sheetCheck && !sheetCheck.valid
                  ? "Fix sheet errors to import"
                  : "Import now"
            }
            onPress={() => void submitImport()}
            loading={importing}
            disabled={!previewCount || pipesImportBlocked}
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
        {props.kind === "pipes-fittings" && sheetCheck ? (
          <SheetValidationPanel
            checking={sheetCheck.checking}
            valid={sheetCheck.valid}
            errors={sheetCheck.errors}
            rowCount={sheetCheck.rowCount}
            sourceFileName={fileName}
          />
        ) : null}
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

const pipesEntryButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  padding: spacing.sm,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  background: colors.surface,
  color: colors.textPrimary,
  cursor: "pointer",
};