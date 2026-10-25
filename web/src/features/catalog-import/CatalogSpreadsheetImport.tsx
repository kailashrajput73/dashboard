import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  importCatalogMaster,
  importCatalogPricing,
  importCatalogStock,
  importPipesFittings,
  importPipesFittingsImages,
  fetchPipesFittingsImagesTemplate,
  listSubcategories,
  validatePipesFittingsImagesImport,
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
import {
  downloadCsvFromObjects,
  downloadImportTemplate,
  PIPES_FITTINGS_IMAGE_HEADERS,
  type ImportTemplateKind,
} from "../../utils/import-templates";
import { SheetValidationPanel } from "./SheetValidationPanel";

type SheetCheckState = {
  checking: boolean;
  valid: boolean;
  errors: SheetValidationError[];
  rowCount: number;
  skippedBlankRows?: number;
  rejectedHeaderRows?: number;
};

function mapPipesImageRows(rows: Record<string, string>[]) {
  return rows.map((row) => ({
    brand: row.brand ?? row.Brand ?? "",
    product_family: row.product_family ?? row.product ?? row.productFamily ?? "",
    type: row.type ?? row.Type ?? "",
    class: row.class ?? row.Class ?? row.product_class ?? "",
    image_url: row.image_url ?? row.imageurl ?? row.imageUrl ?? "",
  }));
}

function errorsFromApi(cause: unknown): SheetValidationError[] | null {
  if (!(cause instanceof ApiError)) return null;
  const data = cause.body?.data;
  if (data && Array.isArray(data.errors)) return data.errors as SheetValidationError[];
  return null;
}

const COLUMN_HELP_PANEL_WIDTH = 320;
const COLUMN_HELP_VIEWPORT_MARGIN = 12;

function ColumnHelpInfo(props: { help: string; testID: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPanelStyle(null);
      return;
    }
    const place = () => {
      const anchor = buttonRef.current!.getBoundingClientRect();
      const panelWidth = Math.min(COLUMN_HELP_PANEL_WIDTH, window.innerWidth - COLUMN_HELP_VIEWPORT_MARGIN * 2);
      let panelLeft = anchor.left + anchor.width / 2 - panelWidth / 2;
      panelLeft = Math.max(
        COLUMN_HELP_VIEWPORT_MARGIN,
        Math.min(panelLeft, window.innerWidth - panelWidth - COLUMN_HELP_VIEWPORT_MARGIN),
      );
      let panelTop = anchor.bottom + 8;
      const panelHeight = panelRef.current?.offsetHeight ?? 0;
      if (panelHeight > 0 && panelTop + panelHeight > window.innerHeight - COLUMN_HELP_VIEWPORT_MARGIN) {
        panelTop = Math.max(COLUMN_HELP_VIEWPORT_MARGIN, anchor.top - 8 - panelHeight);
      }
      setPanelStyle({
        position: "fixed",
        top: panelTop,
        left: panelLeft,
        width: panelWidth,
        zIndex: 10000,
        padding: spacing.sm,
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.15)",
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 1.45,
        overflowWrap: "anywhere",
        maxHeight: `min(240px, calc(100vh - ${COLUMN_HELP_VIEWPORT_MARGIN * 2}px))`,
        overflowY: "auto",
      });
    };
    place();
    requestAnimationFrame(place);
  }, [open, props.help]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const panel =
    open && panelStyle ? (
      <div ref={panelRef} role="tooltip" data-testid={`${props.testID}-panel`} style={panelStyle}>
        {props.help}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-testid={props.testID}
        aria-label="Show column list for this sheet"
        aria-expanded={open}
        title={props.help}
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "grid",
          placeItems: "center",
          width: 28,
          height: 28,
          padding: 0,
          border: `1px solid ${colors.border}`,
          borderRadius: "50%",
          background: colors.surface,
          color: colors.primary,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Icon name="information-circle-outline" size={18} color={colors.primary} />
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </>
  );
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
  /** Hide long column list; show (i) next to section title instead. */
  columnHelpDisplay?: "inline" | "info";
  showCategoryMode?: boolean;
  /** Full product master only: link to pipes v1 (hub modal or product-management route). */
  showPipesFittingsEntry?: boolean;
  /** When set (import hub), switch to pipes flow without leaving the modal. */
  onOpenPipesFittings?: () => void;
  /** Step section inside combined pipes v1 page (no page header). */
  embedded?: boolean;
  sectionTitle?: string;
  sectionId?: string;
  /** Import hub modal: no page shell. */
  layout?: "page" | "embedded";
  onClose?: () => void;
  onImported?: () => void;
};

export function CatalogSpreadsheetImport(props: Props) {
  const navigate = useNavigate();
  const hubEmbedded = props.layout === "embedded";
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
  const [downloadingCatalogSheet, setDownloadingCatalogSheet] = useState(false);
  const [pipesImageSubcategory, setPipesImageSubcategory] = useState("");
  const [pipesImageSubcategoryOptions, setPipesImageSubcategoryOptions] = useState<string[]>([]);

  useEffect(() => {
    if (props.kind !== "pipes-fittings-images") return;
    void listSubcategories()
      .then((rows) => {
        const names = [...new Set((rows || []).map((row) => row.name.trim()).filter(Boolean))].sort();
        setPipesImageSubcategoryOptions(names);
      })
      .catch(() => setPipesImageSubcategoryOptions([]));
  }, [props.kind]);

  async function downloadPipesImagesSheetFromCatalog() {
    setDownloadingCatalogSheet(true);
    setError(null);
    try {
      const data = await fetchPipesFittingsImagesTemplate(
        pipesImageSubcategory.trim() || undefined,
      );
      if (!data.items.length) {
        setError(
          pipesImageSubcategory.trim()
            ? `No families missing images for subcategory “${pipesImageSubcategory.trim()}”. Try another subcategory or import the pipes master first.`
            : "No families missing images. Pick a subcategory or import the pipes master sheet first.",
        );
        return;
      }
      downloadCsvFromObjects(
        PIPES_FITTINGS_IMAGE_HEADERS,
        data.items,
        "pipes-fittings-images-from-catalog.csv",
      );
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : "Could not download catalog sheet.");
    } finally {
      setDownloadingCatalogSheet(false);
    }
  }

  async function runPipesSheetValidation(rows: Record<string, string>[]) {
    setSheetCheck({ checking: true, valid: false, errors: [], rowCount: rows.length });
    try {
      if (props.kind === "pipes-fittings-images") {
        const check = await validatePipesFittingsImagesImport({ items: mapPipesImageRows(rows) });
        setSheetCheck({
          checking: false,
          valid: check.valid,
          errors: check.errors ?? [],
          rowCount: check.rowCount ?? rows.length,
        });
      } else {
        const check = await validatePipesFittingsImport({ rows });
        setSheetCheck({
          checking: false,
          valid: check.valid,
          errors: check.errors ?? [],
          rowCount: check.rowCount ?? rows.length,
          skippedBlankRows: check.skippedBlankRows,
          rejectedHeaderRows: check.rejectedHeaderRows,
        });
      }
    } catch (cause: unknown) {
      const apiErrors = errorsFromApi(cause);
      if (apiErrors?.length) {
        setSheetCheck({
          checking: false,
          valid: false,
          errors: apiErrors,
          rowCount: rows.length,
          skippedBlankRows: undefined,
          rejectedHeaderRows: undefined,
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
      } else if (props.kind === "pipes-fittings-images") {
        const rows = parsed.rows as Record<string, string>[];
        setPayload(rows);
        setPreviewCount(rows.length);
        setInvalidCount(0);
        if (!rows.length) {
          setError("No data rows. Need brand, product_family, and image_url.");
        } else {
          await runPipesSheetValidation(rows);
        }
      } else {
        setPayload(parsed.rows);
        setPreviewCount(parsed.rows.length);
        setInvalidCount(0);
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
            skippedBlankRows: check.skippedBlankRows,
            rejectedHeaderRows: check.rejectedHeaderRows,
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
      } else if (props.kind === "pipes-fittings-images") {
        const rows = payload as Record<string, string>[];
        if (sheetCheck && !sheetCheck.valid) {
          return;
        }
        const items = mapPipesImageRows(rows);
        const check = await validatePipesFittingsImagesImport({ items });
        if (!check.valid) {
          setSheetCheck({
            checking: false,
            valid: false,
            errors: check.errors ?? [],
            rowCount: check.rowCount ?? rows.length,
          });
          return;
        }
        const response = await importPipesFittingsImages({ items });
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
        setResult(`Updated images on ${response.updated} product family row(s).`);
      }
      props.onImported?.();
      setPayload([]);
      setPreviewCount(0);
      setFileName("");
    } catch (cause: unknown) {
      const apiErrors = errorsFromApi(cause);
      if (
        apiErrors?.length &&
        (props.kind === "pipes-fittings" || props.kind === "pipes-fittings-images")
      ) {
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

  const pipesImportBlocked =
    (props.kind === "pipes-fittings" || props.kind === "pipes-fittings-images") &&
    sheetCheck !== null &&
    (sheetCheck.checking || !sheetCheck.valid);

  const sheetBody = (
    <>
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
            <button
              type="button"
              data-testid="nav-import-pipes-fittings"
              onClick={() => {
                if (props.onOpenPipesFittings) {
                  props.onOpenPipesFittings();
                  return;
                }
                navigate("/product-management", { state: { openImport: "pipes-fittings" } });
              }}
              style={{ ...pipesEntryButtonStyle, width: "100%" }}
            >
              <Icon name="git-branch-outline" size={20} color={colors.primary} />
              <span style={{ flex: 1, textAlign: "left" }}>
                <span style={{ ...font.title, display: "block", fontSize: 14 }}>Pipes &amp; fittings (v1)</span>
                <span style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Master sheet + family images on one page
                </span>
              </span>
              <Icon name="chevron-forward" size={16} color={colors.textMuted} />
            </button>
          </Card>
        ) : null}
        <Card>
          {props.columnHelpDisplay !== "info" ? (
            <>
              <h2 style={{ ...font.title, color: colors.textPrimary, margin: `0 0 ${spacing.sm}px` }}>Columns</h2>
              <p style={{ color: colors.textSecondary, lineHeight: "20px", margin: 0 }}>{props.columnHelp}</p>
            </>
          ) : null}
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={onFileChange}
            data-testid={`${props.kind}-import-file`}
            style={{ display: "none" }}
          />
          <div style={{ display: "grid", gap: spacing.md, marginTop: spacing.sm }}>
            {props.kind === "pipes-fittings-images" ? (
              <>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ ...font.caption, color: colors.textSecondary, fontWeight: 600 }}>
                    Subcategory (families missing image only)
                  </span>
                  <select
                    value={pipesImageSubcategory}
                    onChange={(event) => setPipesImageSubcategory(event.currentTarget.value)}
                    data-testid="pipes-images-subcategory-filter"
                    style={{
                      height: 40,
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      padding: "0 10px",
                      font: "inherit",
                    }}
                  >
                    <option value="">Select subcategory…</option>
                    {pipesImageSubcategoryOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  testID="download-pipes-fittings-images-from-catalog"
                  title="Download sheet from catalog (fill image URLs)"
                  icon="download-outline"
                  loading={downloadingCatalogSheet}
                  disabled={!pipesImageSubcategory.trim()}
                  onPress={() => void downloadPipesImagesSheetFromCatalog()}
                  style={{ width: "100%" }}
                />
                <Button
                  testID={`download-${props.kind}-template`}
                  title="Empty template (headers only)"
                  icon="download-outline"
                  variant="ghost"
                  size="sm"
                  onPress={() => downloadImportTemplate("pipes_fittings_images")}
                  style={{ width: "100%" }}
                />
              </>
            ) : (
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
                      : (props.kind as ImportTemplateKind),
                  )
                }
                style={{ width: "100%" }}
              />
            )}
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
              (props.kind === "pipes-fittings" || props.kind === "pipes-fittings-images") &&
              sheetCheck?.checking
                ? "Validating…"
                : (props.kind === "pipes-fittings" || props.kind === "pipes-fittings-images") &&
                    sheetCheck &&
                    !sheetCheck.valid
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
        {(props.kind === "pipes-fittings" || props.kind === "pipes-fittings-images") &&
        sheetCheck ? (
          <SheetValidationPanel
            checking={sheetCheck.checking}
            valid={sheetCheck.valid}
            errors={sheetCheck.errors}
            rowCount={sheetCheck.rowCount}
            sourceFileName={fileName}
            skippedBlankRows={sheetCheck.skippedBlankRows}
            rejectedHeaderRows={sheetCheck.rejectedHeaderRows}
          />
        ) : null}
        {result ? (
          <Card style={{ backgroundColor: colors.successBg, borderColor: colors.success, marginTop: spacing.md }}>
            <p style={{ color: colors.textPrimary, lineHeight: 1.45, margin: 0 }}>{result}</p>
          </Card>
        ) : null}
    </>
  );

  const modals = (
    <>
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
    </>
  );

  if (props.embedded) {
    return (
      <section
        id={props.sectionId}
        aria-label={props.sectionTitle}
        style={{ marginTop: spacing.xl }}
      >
        {props.sectionTitle ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: spacing.xs,
              margin: `0 0 ${spacing.sm}px`,
            }}
          >
            <h2
              style={{
                ...font.title,
                color: colors.textPrimary,
                margin: 0,
                fontSize: 17,
                flex: 1,
              }}
            >
              {props.sectionTitle}
            </h2>
            {props.columnHelpDisplay === "info" && props.columnHelp ? (
              <ColumnHelpInfo help={props.columnHelp} testID={`${props.kind}-column-help-info`} />
            ) : null}
          </div>
        ) : null}
        {sheetBody}
        {modals}
      </section>
    );
  }

  if (hubEmbedded) {
    return (
      <>
        <div
          className="admin-page-container"
          style={{ maxWidth: "none", margin: 0, padding: 0 }}
        >
          {sheetBody}
        </div>
        {modals}
      </>
    );
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title={props.title}
        subtitle={props.subtitle}
        onBack={() => (props.onClose ? props.onClose() : navigate(-1))}
      />
      <div className="admin-page-container" style={{ maxWidth: "none", margin: "0 auto", padding: spacing.lg }}>
        {sheetBody}
      </div>
      {modals}
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