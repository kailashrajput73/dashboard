import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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

type PipesImageTemplateRow = {
  brand: string;
  product_family: string;
  type: string;
  class: string;
  image_url: string;
};

function pipesImageNorm(value: string) {
  return value.trim().toLowerCase();
}

function pipesImageRowMissingUrl(row: PipesImageTemplateRow) {
  const url = (row.image_url ?? "").trim().toLowerCase();
  return !url.startsWith("http://") && !url.startsWith("https://");
}

function pipesImageRowsForMissingDownload(rows: PipesImageTemplateRow[]) {
  return rows.map((row) => ({ ...row, image_url: "" }));
}

const PIPES_IMAGE_INLINE_MAX_ROWS = 25;

function pipesImageInlineRowKey(row: PipesImageTemplateRow) {
  return [
    pipesImageNorm(row.brand),
    pipesImageNorm(row.type),
    pipesImageNorm(row.class),
    pipesImageNorm(row.product_family),
  ].join("|");
}

function filterPipesImageTemplateItems(
  items: PipesImageTemplateRow[],
  filters: { brand?: string; type?: string; class?: string },
): PipesImageTemplateRow[] {
  let rows = items;
  if (filters.brand?.trim()) {
    const want = pipesImageNorm(filters.brand);
    rows = rows.filter((row) => pipesImageNorm(row.brand ?? "") === want);
  }
  if (filters.type?.trim()) {
    const want = pipesImageNorm(filters.type);
    rows = rows.filter((row) => pipesImageNorm(row.type ?? "") === want);
  }
  if (filters.class?.trim()) {
    const want = pipesImageNorm(filters.class);
    rows = rows.filter((row) => pipesImageNorm(row.class ?? "") === want);
  }
  return rows;
}

function pipesImageFacetsFromTemplateItems(
  items: { brand?: string; type?: string; class?: string }[],
): { brands: string[]; types: string[]; classes: string[] } {
  const brands = new Set<string>();
  const types = new Set<string>();
  const classes = new Set<string>();
  for (const item of items) {
    const brand = (item.brand ?? "").trim();
    const type = (item.type ?? "").trim();
    const klass = (item.class ?? "").trim();
    if (brand) brands.add(brand);
    if (type) types.add(type);
    if (klass) classes.add(klass);
  }
  const sort = (values: Set<string>) => [...values].sort((a, b) => a.localeCompare(b));
  return { brands: sort(brands), types: sort(types), classes: sort(classes) };
}

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
  const [pipesImageBrand, setPipesImageBrand] = useState("");
  const [pipesImageType, setPipesImageType] = useState("");
  const [pipesImageClass, setPipesImageClass] = useState("");
  const [pipesImageIncludeInactive, setPipesImageIncludeInactive] = useState(false);
  const [pipesImageSubcategoryItems, setPipesImageSubcategoryItems] = useState<PipesImageTemplateRow[]>(
    [],
  );
  const [pipesImageSubcategoryLoading, setPipesImageSubcategoryLoading] = useState(false);
  const [pipesImageAllMissingCount, setPipesImageAllMissingCount] = useState<number | null>(null);
  const [pipesImageAllMissingLoading, setPipesImageAllMissingLoading] = useState(false);
  const [pipesImageOptionalFiltersOpen, setPipesImageOptionalFiltersOpen] = useState(false);
  const [pipesImageUpdateConfirmOpen, setPipesImageUpdateConfirmOpen] = useState(false);
  const [pipesImageUpdateConfirmRows, setPipesImageUpdateConfirmRows] = useState<PipesImageTemplateRow[]>(
    [],
  );
  const [pipesImageInlineOpen, setPipesImageInlineOpen] = useState(false);
  const [pipesImageInlineRows, setPipesImageInlineRows] = useState<PipesImageTemplateRow[]>([]);
  const [pipesImageInlineSaving, setPipesImageInlineSaving] = useState(false);
  const [pipesImageInlineErrors, setPipesImageInlineErrors] = useState<SheetValidationError[]>([]);

  const pipesImageSelectStyle = {
    height: 36,
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    padding: "0 10px",
    font: "inherit" as const,
    width: "100%",
  };
  function pipesImageDownloadQuery() {
    const subcategory = pipesImageSubcategory.trim();
    return {
      includeInactive: pipesImageIncludeInactive,
      subcategory: subcategory || undefined,
      brand: subcategory && pipesImageBrand.trim() ? pipesImageBrand.trim() : undefined,
      type: subcategory && pipesImageType.trim() ? pipesImageType.trim() : undefined,
      class: subcategory && pipesImageClass.trim() ? pipesImageClass.trim() : undefined,
    };
  }

  useEffect(() => {
    if (props.kind !== "pipes-fittings-images") return;
    void listSubcategories()
      .then((rows) => {
        const names = [...new Set((rows || []).map((row) => row.name.trim()).filter(Boolean))].sort();
        setPipesImageSubcategoryOptions(names);
      })
      .catch(() => setPipesImageSubcategoryOptions([]));
  }, [props.kind]);

  useEffect(() => {
    if (props.kind !== "pipes-fittings-images") return;
    const subcategory = pipesImageSubcategory.trim();
    if (!subcategory) {
      setPipesImageSubcategoryItems([]);
      return;
    }
    let cancelled = false;
    setPipesImageSubcategoryLoading(true);
    void fetchPipesFittingsImagesTemplate({
      subcategory,
      includeInactive: pipesImageIncludeInactive,
      missingImageOnly: false,
    })
      .then((sheet) => {
        if (cancelled) return;
        setPipesImageSubcategoryItems(sheet.items ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setPipesImageSubcategoryItems([]);
      })
      .finally(() => {
        if (!cancelled) setPipesImageSubcategoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.kind, pipesImageSubcategory, pipesImageIncludeInactive]);

  useEffect(() => {
    if (props.kind !== "pipes-fittings-images") return;
    setPipesImageBrand("");
    setPipesImageType("");
    setPipesImageClass("");
    setPipesImageOptionalFiltersOpen(false);
  }, [props.kind, pipesImageSubcategory]);

  useEffect(() => {
    if (props.kind !== "pipes-fittings-images") return;
    setPipesImageType("");
    setPipesImageClass("");
  }, [props.kind, pipesImageBrand]);

  useEffect(() => {
    if (props.kind !== "pipes-fittings-images") return;
    setPipesImageClass("");
  }, [props.kind, pipesImageType]);

  const pipesImageItemsForTypeOptions = useMemo(() => {
    if (!pipesImageBrand.trim()) return pipesImageSubcategoryItems;
    return pipesImageSubcategoryItems.filter(
      (row) => pipesImageNorm(row.brand ?? "") === pipesImageNorm(pipesImageBrand),
    );
  }, [pipesImageSubcategoryItems, pipesImageBrand]);

  const pipesImageItemsForClassOptions = useMemo(() => {
    if (!pipesImageType.trim()) return pipesImageItemsForTypeOptions;
    return pipesImageItemsForTypeOptions.filter(
      (row) => pipesImageNorm(row.type ?? "") === pipesImageNorm(pipesImageType),
    );
  }, [pipesImageItemsForTypeOptions, pipesImageType]);

  const pipesImageBrandOptions = useMemo(
    () => pipesImageFacetsFromTemplateItems(pipesImageSubcategoryItems).brands,
    [pipesImageSubcategoryItems],
  );
  const pipesImageTypeOptions = useMemo(
    () => pipesImageFacetsFromTemplateItems(pipesImageItemsForTypeOptions).types,
    [pipesImageItemsForTypeOptions],
  );
  const pipesImageClassOptions = useMemo(
    () => pipesImageFacetsFromTemplateItems(pipesImageItemsForClassOptions).classes,
    [pipesImageItemsForClassOptions],
  );

  const pipesImageFilteredRows = useMemo(() => {
    if (!pipesImageSubcategory.trim()) return null;
    return filterPipesImageTemplateItems(pipesImageSubcategoryItems, {
      brand: pipesImageBrand,
      type: pipesImageType,
      class: pipesImageClass,
    });
  }, [
    pipesImageSubcategoryItems,
    pipesImageSubcategory,
    pipesImageBrand,
    pipesImageType,
    pipesImageClass,
  ]);

  const pipesImageMissingFilteredRows = useMemo(() => {
    if (!pipesImageFilteredRows) return null;
    return pipesImageFilteredRows.filter(pipesImageRowMissingUrl);
  }, [pipesImageFilteredRows]);

  const pipesImageFamiliesInScopeCount = useMemo(() => {
    if (pipesImageSubcategory.trim()) {
      return pipesImageFilteredRows?.length ?? 0;
    }
    return pipesImageAllMissingCount ?? 0;
  }, [pipesImageSubcategory, pipesImageFilteredRows, pipesImageAllMissingCount]);

  const pipesImageDownloadCount = useMemo(() => {
    if (pipesImageSubcategory.trim()) {
      return pipesImageMissingFilteredRows?.length ?? null;
    }
    return pipesImageAllMissingCount;
  }, [pipesImageSubcategory, pipesImageMissingFilteredRows, pipesImageAllMissingCount]);

  const pipesImageUpdateDownloadMode =
    !!pipesImageSubcategory.trim() &&
    pipesImageDownloadCount === 0 &&
    pipesImageFamiliesInScopeCount > 0;

  const pipesImageCountLoading =
    pipesImageSubcategory.trim() ? pipesImageSubcategoryLoading : pipesImageAllMissingLoading;

  const pipesImageDownloadScopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (pipesImageSubcategory.trim()) {
      parts.push(pipesImageSubcategory.trim());
    } else {
      parts.push("all subcategories");
    }
    if (pipesImageSubcategory.trim()) {
      if (pipesImageBrand.trim()) parts.push(pipesImageBrand.trim());
      if (pipesImageType.trim()) parts.push(pipesImageType.trim());
      if (pipesImageClass.trim()) parts.push(pipesImageClass.trim());
    }
    return parts.join(" · ");
  }, [pipesImageSubcategory, pipesImageBrand, pipesImageType, pipesImageClass]);

  useEffect(() => {
    if (props.kind !== "pipes-fittings-images") return;
    if (pipesImageSubcategory.trim()) return;
    let cancelled = false;
    setPipesImageAllMissingLoading(true);
    const timer = window.setTimeout(() => {
      void fetchPipesFittingsImagesTemplate({ includeInactive: pipesImageIncludeInactive })
        .then((result) => {
          if (cancelled) return;
          setPipesImageAllMissingCount(result.rowCount ?? result.items.length);
        })
        .catch(() => {
          if (cancelled) return;
          setPipesImageAllMissingCount(null);
        })
        .finally(() => {
          if (!cancelled) setPipesImageAllMissingLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [props.kind, pipesImageSubcategory, pipesImageIncludeInactive]);

  const pipesImageSubcategorySelected = !!pipesImageSubcategory.trim();

  function writePipesImageCatalogCsv(items: PipesImageTemplateRow[], suffix: string) {
    downloadCsvFromObjects(
      PIPES_FITTINGS_IMAGE_HEADERS,
      items,
      `pipes-fittings-images-from-catalog${suffix}.csv`,
    );
  }

  function pipesImageFilteredScopeRows(): PipesImageTemplateRow[] {
    const query = pipesImageDownloadQuery();
    if (query.subcategory && pipesImageSubcategoryItems.length) {
      return filterPipesImageTemplateItems(pipesImageSubcategoryItems, {
        brand: query.brand,
        type: query.type,
        class: query.class,
      });
    }
    return [];
  }

  function onPipesImageDownloadPress() {
    const query = pipesImageDownloadQuery();
    if (query.subcategory) {
      const scoped = pipesImageFilteredScopeRows();
      if (!scoped.length) {
        setError(
          "No families match this subcategory (and filters). Try another subcategory or import the pipes master first.",
        );
        return;
      }
      const missing = scoped.filter(pipesImageRowMissingUrl);
      if (missing.length > 0) {
        void downloadPipesImagesSheetFromCatalog(pipesImageRowsForMissingDownload(missing), "missing");
        return;
      }
      setPipesImageUpdateConfirmRows(scoped);
      setPipesImageUpdateConfirmOpen(true);
      return;
    }
    void downloadPipesImagesSheetFromCatalog();
  }

  function confirmPipesImageUpdateDownload() {
    setPipesImageUpdateConfirmOpen(false);
    writePipesImageCatalogCsv(pipesImageUpdateConfirmRows, "-update");
  }

  function pipesImageInlineCandidateRows(): PipesImageTemplateRow[] {
    const scoped = pipesImageFilteredScopeRows();
    const missing = scoped.filter(pipesImageRowMissingUrl);
    if (missing.length > 0) {
      return pipesImageRowsForMissingDownload(missing);
    }
    return scoped.map((row) => ({ ...row }));
  }

  const pipesImageInlineEligibleCount = useMemo(() => {
    if (!pipesImageSubcategory.trim()) return 0;
    if (pipesImageMissingFilteredRows?.length) return pipesImageMissingFilteredRows.length;
    return pipesImageFilteredRows?.length ?? 0;
  }, [pipesImageSubcategory, pipesImageMissingFilteredRows, pipesImageFilteredRows]);

  function openPipesImageInlineModal() {
    setPipesImageInlineErrors([]);
    if (!pipesImageSubcategory.trim()) {
      setError("Choose a subcategory to fill links here.");
      return;
    }
    const rows = pipesImageInlineCandidateRows();
    if (!rows.length) {
      setError("No families in this filter scope.");
      return;
    }
    if (rows.length > PIPES_IMAGE_INLINE_MAX_ROWS) {
      setError(
        `Too many families (${rows.length}) for quick upload. Use download sheet (max ${PIPES_IMAGE_INLINE_MAX_ROWS} here).`,
      );
      return;
    }
    setPipesImageInlineRows(rows);
    setPipesImageInlineOpen(true);
  }

  function setPipesImageInlineRowUrl(key: string, imageUrl: string) {
    setPipesImageInlineRows((prev) =>
      prev.map((row) =>
        pipesImageInlineRowKey(row) === key ? { ...row, image_url: imageUrl } : row,
      ),
    );
  }

  async function savePipesImageInline() {
    const items = pipesImageInlineRows
      .filter((row) => row.image_url.trim())
      .map((row) => ({
        brand: row.brand,
        product_family: row.product_family,
        type: row.type,
        class: row.class,
        image_url: row.image_url.trim(),
      }));
    if (!items.length) {
      setPipesImageInlineErrors([
        { row: 0, column: "image_url", message: "Enter at least one image URL." },
      ]);
      return;
    }
    setPipesImageInlineSaving(true);
    setPipesImageInlineErrors([]);
    try {
      const check = await validatePipesFittingsImagesImport({ items });
      if (!check.valid) {
        setPipesImageInlineErrors(check.errors ?? []);
        return;
      }
      const response = await importPipesFittingsImages({ items });
      if (response.errors?.length) {
        setPipesImageInlineErrors(response.errors);
        return;
      }
      setPipesImageInlineOpen(false);
      setPipesImageInlineRows([]);
      setResult(`Updated images on ${response.updated} product family row(s).`);
      props.onImported?.();
    } catch (cause: unknown) {
      const apiErrors = errorsFromApi(cause);
      if (apiErrors?.length) {
        setPipesImageInlineErrors(apiErrors);
      } else {
        setError(cause instanceof ApiError ? cause.message : "Could not save image links.");
      }
    } finally {
      setPipesImageInlineSaving(false);
    }
  }

  async function downloadPipesImagesSheetFromCatalog(
    prefilledItems?: PipesImageTemplateRow[],
    mode: "missing" | "default" = "default",
  ) {
    if (prefilledItems?.length) {
      setDownloadingCatalogSheet(true);
      try {
        const suffix =
          mode === "missing"
            ? pipesImageDownloadQuery().brand ||
              pipesImageDownloadQuery().type ||
              pipesImageDownloadQuery().class
              ? "-filtered"
              : "-subcategory"
            : "-update";
        writePipesImageCatalogCsv(prefilledItems, suffix);
      } finally {
        setDownloadingCatalogSheet(false);
      }
      return;
    }
    setDownloadingCatalogSheet(true);
    setError(null);
    try {
      const query = pipesImageDownloadQuery();
      const data = await fetchPipesFittingsImagesTemplate(query);
      const items = data.items ?? [];
      if (!items.length) {
        setError(
          "No families missing images. Import the pipes master sheet first, or include inactive-only families.",
        );
        return;
      }
      writePipesImageCatalogCsv(items, "-all-missing");
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
                <p style={{ ...font.caption, color: colors.textSecondary, margin: 0, lineHeight: 1.45 }}>
                  Download a sheet of families missing images. Leave subcategory blank for all, or pick a subcategory to
                  narrow; brand, type, and class only apply with a subcategory.
                </p>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={pipesImageIncludeInactive}
                    onChange={(event) => setPipesImageIncludeInactive(event.currentTarget.checked)}
                    data-testid="pipes-images-include-inactive"
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ ...font.caption, color: colors.textSecondary, lineHeight: 1.35 }}>
                    Include families whose SKUs are all inactive
                  </span>
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ ...font.caption, color: colors.textMuted, fontWeight: 600 }}>Subcategory</span>
                  <select
                    value={pipesImageSubcategory}
                    onChange={(event) => setPipesImageSubcategory(event.currentTarget.value)}
                    data-testid="pipes-images-subcategory-filter"
                    style={pipesImageSelectStyle}
                    aria-label="Subcategory"
                  >
                    <option value="">All subcategories</option>
                    {pipesImageSubcategoryOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                {pipesImageSubcategorySelected ? (
                  <>
                    <button
                      type="button"
                      data-testid="pipes-images-toggle-optional-filters"
                      onClick={() => setPipesImageOptionalFiltersOpen((open) => !open)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                        ...font.caption,
                        color: colors.primary,
                        fontWeight: 600,
                      }}
                    >
                      {pipesImageOptionalFiltersOpen ? "Hide" : "Show"} brand, type, class (optional)
                    </button>
                    {pipesImageOptionalFiltersOpen ? (
                      <div
                        style={{
                          display: "grid",
                          gap: spacing.sm,
                          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        }}
                      >
                        <label style={{ display: "grid", gap: 4 }}>
                          <span style={{ ...font.caption, color: colors.textMuted, fontSize: 11 }}>Brand</span>
                          <select
                            value={pipesImageBrand}
                            onChange={(event) => setPipesImageBrand(event.currentTarget.value)}
                            data-testid="pipes-images-brand-filter"
                            style={pipesImageSelectStyle}
                          >
                            <option value="">Any</option>
                            {pipesImageBrandOptions.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ display: "grid", gap: 4 }}>
                          <span style={{ ...font.caption, color: colors.textMuted, fontSize: 11 }}>Type</span>
                          <select
                            value={pipesImageType}
                            onChange={(event) => setPipesImageType(event.currentTarget.value)}
                            data-testid="pipes-images-type-filter"
                            style={pipesImageSelectStyle}
                          >
                            <option value="">Any</option>
                            {pipesImageTypeOptions.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ display: "grid", gap: 4 }}>
                          <span style={{ ...font.caption, color: colors.textMuted, fontSize: 11 }}>Class</span>
                          <select
                            value={pipesImageClass}
                            onChange={(event) => setPipesImageClass(event.currentTarget.value)}
                            data-testid="pipes-images-class-filter"
                            style={pipesImageSelectStyle}
                          >
                            <option value="">Any</option>
                            {pipesImageClassOptions.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : null}
                  </>
                ) : null}
                <p
                  style={{ ...font.caption, color: colors.textMuted, margin: 0, lineHeight: 1.45 }}
                  data-testid="pipes-images-download-scope"
                >
                  Sheet matches{" "}
                  <strong style={{ color: colors.textSecondary, fontWeight: 600 }}>
                    {pipesImageDownloadScopeLabel}
                  </strong>
                  {pipesImageSubcategorySelected &&
                  (pipesImageBrand.trim() || pipesImageType.trim() || pipesImageClass.trim())
                    ? " (subcategory + every filter you picked, combined)"
                    : pipesImageSubcategory.trim()
                      ? " (this subcategory only)"
                      : " (every family missing an image)"}
                  . Rows sorted brand → type → class → family.
                  {pipesImageUpdateDownloadMode
                    ? " Every family in this scope already has an image; download will ask before exporting current URLs for editing."
                    : null}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: spacing.sm,
                    alignItems: "stretch",
                  }}
                >
                  <Button
                    testID="download-pipes-fittings-images-from-catalog"
                    title={
                      pipesImageCountLoading
                        ? "Download sheet from catalog…"
                        : pipesImageUpdateDownloadMode
                          ? `Download to update images (${pipesImageFamiliesInScopeCount})`
                          : pipesImageDownloadCount != null
                            ? `Download sheet from catalog (${pipesImageDownloadCount} missing)`
                            : "Download sheet from catalog"
                    }
                    icon="download-outline"
                    size="sm"
                    loading={downloadingCatalogSheet || pipesImageCountLoading}
                    disabled={
                      pipesImageSubcategory.trim()
                        ? pipesImageFamiliesInScopeCount === 0
                        : pipesImageDownloadCount === 0
                    }
                    onPress={() => onPipesImageDownloadPress()}
                    style={{ flex: "1 1 220px" }}
                  />
                  <Button
                    testID="pipes-images-fill-links-here"
                    title="Fill links here"
                    icon="create-outline"
                    variant="secondary"
                    size="sm"
                    disabled={
                      !pipesImageSubcategory.trim() ||
                      pipesImageInlineEligibleCount === 0 ||
                      pipesImageInlineEligibleCount > PIPES_IMAGE_INLINE_MAX_ROWS ||
                      pipesImageSubcategoryLoading
                    }
                    onPress={() => openPipesImageInlineModal()}
                    style={{ flex: "0 1 auto", minWidth: 140 }}
                  />
                </div>
                <button
                  type="button"
                  data-testid={`download-${props.kind}-template`}
                  onClick={() => downloadImportTemplate("pipes_fittings_images")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    ...font.caption,
                    color: colors.textMuted,
                    textDecoration: "underline",
                    textAlign: "left",
                  }}
                >
                  Need a blank sheet? Empty template (headers only)
                </button>
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
      <AppModal
        testID="pipes-images-inline-upload"
        visible={pipesImageInlineOpen}
        onClose={() => {
          if (pipesImageInlineSaving) return;
          setPipesImageInlineOpen(false);
        }}
        title="Paste image links"
        wide
      >
        <p style={{ ...font.caption, color: colors.textSecondary, lineHeight: 1.45, marginTop: 0 }}>
          Scope: <strong>{pipesImageDownloadScopeLabel}</strong>. Same columns as the download sheet. Save
          applies only rows where you entered a URL.
        </p>
        <div
          style={{
            overflowX: "auto",
            maxHeight: "min(52vh, 420px)",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
            data-testid="pipes-images-inline-table"
          >
            <thead>
              <tr style={{ backgroundColor: colors.primaryLight, textAlign: "left" }}>
                {["brand", "product_family", "type", "class", "image_url"].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: "8px 10px",
                      fontWeight: 600,
                      color: colors.textSecondary,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pipesImageInlineRows.map((row) => {
                const key = pipesImageInlineRowKey(row);
                return (
                  <tr key={key} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "6px 10px", verticalAlign: "top" }}>{row.brand}</td>
                    <td style={{ padding: "6px 10px", verticalAlign: "top" }}>{row.product_family}</td>
                    <td style={{ padding: "6px 10px", verticalAlign: "top" }}>{row.type}</td>
                    <td style={{ padding: "6px 10px", verticalAlign: "top" }}>{row.class}</td>
                    <td style={{ padding: "6px 10px", minWidth: 200 }}>
                      <input
                        type="url"
                        value={row.image_url}
                        onChange={(event) => setPipesImageInlineRowUrl(key, event.currentTarget.value)}
                        placeholder="https://…"
                        data-testid={`pipes-images-inline-url-${key}`}
                        style={{
                          width: "100%",
                          height: 34,
                          borderRadius: 6,
                          border: `1px solid ${colors.border}`,
                          padding: "0 8px",
                          font: "inherit",
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pipesImageInlineErrors.length ? (
          <div style={{ marginTop: spacing.sm }}>
            <SheetValidationPanel
              checking={false}
              valid={false}
              errors={pipesImageInlineErrors}
              rowCount={pipesImageInlineRows.length}
              sourceFileName="inline-links"
            />
          </div>
        ) : null}
        <div style={{ display: "flex", gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            testID="pipes-images-inline-cancel"
            title="Cancel"
            variant="ghost"
            disabled={pipesImageInlineSaving}
            onPress={() => setPipesImageInlineOpen(false)}
            style={{ flex: 1 }}
          />
          <Button
            testID="pipes-images-inline-save"
            title="Save image links"
            loading={pipesImageInlineSaving}
            onPress={() => void savePipesImageInline()}
            style={{ flex: 1 }}
          />
        </div>
      </AppModal>
      <AppModal
        testID="pipes-images-update-download-confirm"
        visible={pipesImageUpdateConfirmOpen}
        onClose={() => setPipesImageUpdateConfirmOpen(false)}
        title="Download sheet to update images?"
      >
        <p style={{ ...font.caption, color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>
          All {pipesImageUpdateConfirmRows.length} famil
          {pipesImageUpdateConfirmRows.length === 1 ? "y" : "ies"} in{" "}
          <strong>{pipesImageDownloadScopeLabel}</strong> already have image URLs in the catalog.
          Download a sheet with those links filled in so you can change URLs and re-upload?
        </p>
        <div style={{ display: "flex", gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            testID="pipes-images-update-download-cancel"
            title="Cancel"
            variant="ghost"
            onPress={() => setPipesImageUpdateConfirmOpen(false)}
            style={{ flex: 1 }}
          />
          <Button
            testID="pipes-images-update-download-confirm-btn"
            title="Download with current URLs"
            onPress={() => confirmPipesImageUpdateDownload()}
            style={{ flex: 1 }}
          />
        </div>
      </AppModal>
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