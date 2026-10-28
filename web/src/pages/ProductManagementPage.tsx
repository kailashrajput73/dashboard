import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createCatalogItem,
  deleteCatalogItemSecured,
  fetchCatalogFilterOptions,
  listBrands,
  listCatalogPage,
  listCategories,
  listProductGroups,
  listProductTypes,
  listSubcategories,
  updateCatalogActive,
  updateCatalogItem,
  type Brand,
  type CatalogItem,
  type Category,
  type ProductGroup,
  type ProductType,
  type Subcategory,
} from "../api/endpoints";
import { ApiError } from "../api/client";
import { Icon } from "../components/Icon";
import { AppModal, Button, ErrorModal, Header, Input } from "../components/UI";
import { colors, font, spacing } from "../theme";
import { CatalogProductEditor } from "../features/catalog/CatalogProductEditor";
import { CatalogProductListRow } from "../features/catalog/CatalogProductListRow";
import { PasscodeConfirmModal } from "../components/PasscodeConfirmModal";
import { getTaxonomyTabs, type TaxonomyTabs } from "../features/catalog-taxonomy/settings";
import {
  ALL_FILTER,
  TaxonomyFilterBar,
  type ProductFilters,
} from "../features/product-management/taxonomy-filter-bar";
import {
  CatalogImportHubModal,
  type ImportStep,
} from "../features/product-management/import-hub-modal";
import { ExportCatalogModal } from "../features/product-management/export-catalog-modal";
import { ExportSessionBar } from "../features/product-management/export-session-bar";
import {
  downloadMasterCatalogCsv,
  exportFullCatalogCsv,
  fetchAllCatalogMatching,
  type ExportScopeMode,
} from "../features/product-management/export-catalog-utils";
import { useCanWriteModule } from "../access/useAccess";
import { ReadOnlyBanner } from "../components/AccessGate";
const defaultFilters: ProductFilters = {
  category: ALL_FILTER,
  subcategory: ALL_FILTER,
  productType: ALL_FILTER,
  productClass: ALL_FILTER,
  brand: ALL_FILTER,
  productGroup: ALL_FILTER,
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default function ProductManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const canWrite = useCanWriteModule("product-management");
  const [tabs, setTabs] = useState<TaxonomyTabs>({ showProductType: true, showProductClass: true });
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [facetOptions, setFacetOptions] = useState({
    productTypes: [] as string[],
    productClasses: [] as string[],
    brands: [] as string[],
    productGroups: [] as string[],
  });
  const [pageItems, setPageItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importInitialStep, setImportInitialStep] = useState<ImportStep>("pick");
  const [importScrollFamilyImages, setImportScrollFamilyImages] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ExportScopeMode | null>(null);
  const [exportingFull, setExportingFull] = useState(false);
  const [sessionDownloading, setSessionDownloading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedItems, setSelectedItems] = useState<Map<string, CatalogItem>>(() => new Map());
  const [exportConflictOpen, setExportConflictOpen] = useState(false);
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { openImport?: string; scrollFamilyImages?: boolean } | null;
    if (state?.openImport === "pipes-fittings") {
      setImportInitialStep("pipes-fittings-combined");
      setImportScrollFamilyImages(Boolean(state.scrollFamilyImages));
      setImportOpen(true);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    if (state?.openImport === "electrical") {
      setImportInitialStep("electrical-combined");
      setImportScrollFamilyImages(Boolean(state.scrollFamilyImages));
      setImportOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const listFilters = useMemo(
    () => ({
      type: filters.productType,
      subcategory: filters.subcategory,
      productClass: filters.productClass,
      brand: filters.brand,
      productGroup: filters.productGroup,
    }),
    [filters],
  );

  const loadTaxonomy = useCallback(async () => {
    const [nextCategories, nextBrands, nextSubcategories, nextGroups] = await Promise.all([
      listCategories(),
      listBrands(),
      listSubcategories(),
      listProductGroups(),
    ]);
    let nextTypes: ProductType[] = [];
    try {
      nextTypes = (await listProductTypes()) || [];
    } catch {
      nextTypes = [];
    }
    setCategories(nextCategories || []);
    setBrands(nextBrands || []);
    setSubcategories(nextSubcategories || []);
    setProductGroups(nextGroups || []);
    setProductTypes(nextTypes);
  }, []);

  const loadFacets = useCallback(async () => {
    try {
      const data = await fetchCatalogFilterOptions(filters.category, filters.subcategory);
      setFacetOptions({
        productTypes: data.productTypes || [],
        productClasses: data.productClasses || [],
        brands: data.brands?.length ? data.brands : brands.map((b) => b.name),
        productGroups: data.productGroups || [],
      });
    } catch {
      setFacetOptions({
        productTypes: productTypes.map((t) => t.name),
        productClasses: [],
        brands: brands.map((b) => b.name),
        productGroups: productGroups.map((g) => g.name),
      });
    }
  }, [filters.category, filters.subcategory, brands, productGroups, productTypes]);

  const loadPage = useCallback(async () => {
    setPageLoading(true);
    try {
      const data = await listCatalogPage({
        category: filters.category,
        search: searchQuery,
        filters: listFilters,
        page,
        limit: pageSize,
        sort: "updated_desc",
      });
      setPageItems(data.items || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to load catalog");
    } finally {
      setPageLoading(false);
      setLoading(false);
    }
  }, [filters.category, filters.subcategory, filters.productType, filters.productClass, filters.brand, filters.productGroup, listFilters, page, pageSize, searchQuery]);

  useEffect(() => {
    void getTaxonomyTabs().then(setTabs);
    void loadTaxonomy().catch((cause: unknown) => {
      setError(cause instanceof ApiError ? cause.message : "Failed to load catalog");
      setLoading(false);
    });
  }, [loadTaxonomy]);

  useEffect(() => {
    void loadFacets();
  }, [loadFacets]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    setPage(1);
  }, [filters, searchQuery, pageSize]);

  const filterOptions = useMemo(() => {
    const subcatPool =
      filters.category === ALL_FILTER
        ? subcategories
        : subcategories.filter((row) => {
            const cat = categories.find((c) => c.id === row.categoryId);
            return cat?.name === filters.category;
          });
    const typeNames = [
      ...new Set([...productTypes.map((t) => t.name), ...facetOptions.productTypes]),
    ].sort();
    return {
      categories: categories.map((c) => c.name),
      subcategories: subcatPool.map((s) => s.name),
      productTypes: typeNames,
      productClasses: [...new Set(facetOptions.productClasses)].sort(),
      brands: [...new Set([...brands.map((b) => b.name), ...facetOptions.brands])].sort(),
      productGroups: [
        ...new Set([...productGroups.map((g) => g.name), ...facetOptions.productGroups]),
      ].sort(),
    };
  }, [categories, subcategories, brands, productGroups, productTypes, facetOptions, filters.category]);

  async function refreshAll() {
    await loadTaxonomy();
    await loadFacets();
    await loadPage();
  }

  async function saveItem(body: Parameters<typeof createCatalogItem>[0]) {
    setSaving(true);
    try {
      if (editing) await updateCatalogItem(editing.id, body);
      else await createCatalogItem(body);
      setEditorOpen(false);
      await refreshAll();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(credentials: { contactNumber: string; passcode: string }) {
    if (!deleteTarget) return;
    setDeletingProduct(true);
    try {
      await deleteCatalogItemSecured(deleteTarget.id, credentials);
      setDeleteTarget(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setSelectedItems((prev) => {
        const next = new Map(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      await refreshAll();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to delete item");
    } finally {
      setDeletingProduct(false);
    }
  }

  async function toggleActive(item: CatalogItem) {
    setTogglingActiveId(item.id);
    try {
      await updateCatalogActive(item.id, item.isActive === false);
      await loadPage();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not update product status");
    } finally {
      setTogglingActiveId(null);
    }
  }

  function toggleSelect(item: CatalogItem) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  }

  function clearExportSession() {
    setExportMode(null);
    setSelectedIds(new Set());
    setSelectedItems(new Map());
    setExportConflictOpen(false);
  }

  async function runFilteredExport() {
    setSessionDownloading(true);
    try {
      const items = await fetchAllCatalogMatching({
        category: filters.category,
        search: searchQuery,
        filters: listFilters,
      });
      downloadMasterCatalogCsv(items, "catalog-filtered.csv");
      clearExportSession();
    } catch {
      setError("Could not export filtered catalog.");
    } finally {
      setSessionDownloading(false);
      setExportConflictOpen(false);
    }
  }

  async function runSelectedExport() {
    setSessionDownloading(true);
    try {
      const items = [...selectedItems.values()];
      downloadMasterCatalogCsv(items, "catalog-selected.csv");
      clearExportSession();
    } catch {
      setError("Could not export selected products.");
    } finally {
      setSessionDownloading(false);
      setExportConflictOpen(false);
    }
  }

  function onSessionDownload() {
    if (!exportMode) return;
    if (exportMode === "selected") {
      void runSelectedExport();
      return;
    }
    if (exportMode === "filtered" && selectedIds.size > 0) {
      setExportConflictOpen(true);
      return;
    }
    void runFilteredExport();
  }

  const selectionEnabled = exportMode === "selected" || exportMode === "filtered";
  const gridCols = selectionEnabled
    ? "28px minmax(200px, 2fr) 120px 72px 72px 72px 56px 140px"
    : "minmax(200px, 2fr) 120px 72px 72px 72px 56px 140px";

  return (
    <main style={pageStyle}>
      <Header
        title="Product management"
        subtitle={`${pageItems.length ? (page - 1) * pageSize + 1 : 0}–${Math.min(page * pageSize, total)} of ${total} item${total === 1 ? "" : "s"}`}
        onBack={() => navigate(-1)}
        right={
          canWrite ? (
            <button
              type="button"
              data-testid="open-add-item"
              aria-label="Add item"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
              style={headerActionStyle}
            >
              <Icon name="add-circle" size={26} color={colors.primary} />
            </button>
          ) : null
        }
      />

      {!canWrite ? <ReadOnlyBanner moduleLabel="products" /> : null}

      <div className="admin-page-container" style={toolbarStyle}>
        <Input
          testID="product-search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search code, name, alias, or brand"
          style={searchInputStyle}
        />
        <div style={toolbarActionsStyle}>
          <button
            type="button"
            data-testid="export-catalog-csv"
            aria-label="Export catalog CSV"
            onClick={() => setExportModalOpen(true)}
            style={toolButtonStyle}
          >
            <Icon name="download-outline" size={20} color={colors.primary} />
            <span>Export</span>
          </button>
          {canWrite ? (
            <button
              type="button"
              data-testid="open-catalog-import-hub"
              aria-label="Import spreadsheet"
              onClick={() => {
                setImportInitialStep("pick");
                setImportOpen(true);
              }}
              style={toolButtonStyle}
            >
              <Icon name="cloud-upload-outline" size={20} color={colors.primary} />
              <span>Import</span>
            </button>
          ) : null}
        </div>
      </div>

      <TaxonomyFilterBar
        tabs={tabs}
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        onRefresh={() => void refreshAll()}
        onOpenBatchImport={() => {
          setImportInitialStep({ kind: "master", batch: true });
          setImportOpen(true);
        }}
      />

      {loading ? (
        <div style={centerStyle}>
          <span className="web-button-spinner" role="status" aria-label="Loading catalog" />
        </div>
      ) : total === 0 ? (
        <div style={emptyStateStyle}>
          <Icon name="cube-outline" size={26} color={colors.primary} />
          <div style={emptyTitleStyle}>No matching products</div>
          <div style={emptySubtitleStyle}>Adjust filters or add a product.</div>
        </div>
      ) : (
        <>
          <div className="admin-horizontal-scroll admin-page-container" style={tableScrollStyle}>
            <div style={{ ...tableStyle, ["--pm-row-cols" as string]: gridCols }}>
              <div style={{ ...tableHeaderStyle, gridTemplateColumns: gridCols }}>
                {selectionEnabled ? <span /> : null}
                <span>Product</span>
                <span>Size</span>
                <span style={headNumStyle}>MRP</span>
                <span style={headNumStyle}>Disc %</span>
                <span style={headNumStyle}>Sell</span>
                <span style={headNumStyle}>Stock</span>
                <span style={headActionsStyle}>Actions</span>
              </div>
              {pageLoading ? (
                <div style={centerStyle}>
                  <span className="web-button-spinner" role="status" aria-label="Loading page" />
                </div>
              ) : (
                pageItems.map((item) => (
                  <CatalogProductListRow
                    key={item.id}
                    item={item}
                    selectionEnabled={selectionEnabled}
                    selected={selectedIds.has(item.id)}
                    onToggleSelect={() => toggleSelect(item)}
                    onEdit={() => {
                      setEditing(item);
                      setEditorOpen(true);
                    }}
                    onDelete={() => setDeleteTarget(item)}
                    onToggleActive={() => void toggleActive(item)}
                    togglingActive={togglingActiveId === item.id}
                  />
                ))
              )}
            </div>
          </div>
          <div style={paginationStyle}>
            <label style={pageSizeLabelStyle}>
              Per page
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.currentTarget.value))}
                data-testid="catalog-page-size"
                style={pageSizeSelectStyle}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <span style={pageInfoStyle}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page <= 1 || pageLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={pageBtnStyle}
              data-testid="catalog-page-prev"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || pageLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={pageBtnStyle}
              data-testid="catalog-page-next"
            >
              Next
            </button>
          </div>
        </>
      )}

      {exportMode ? (
        <ExportSessionBar
          mode={exportMode}
          matchCount={total}
          selectedCount={selectedIds.size}
          onCancel={clearExportSession}
          onDownload={onSessionDownload}
          downloading={sessionDownloading}
        />
      ) : null}

      <ExportCatalogModal
        visible={exportModalOpen}
        exporting={exportingFull}
        onClose={() => setExportModalOpen(false)}
        onChoose={(mode) => {
          setExportModalOpen(false);
          setExportMode(mode);
          if (mode === "selected") {
            setSelectedIds(new Set());
            setSelectedItems(new Map());
          }
        }}
        onExportFullNow={async () => {
          setExportingFull(true);
          try {
            await exportFullCatalogCsv();
            setExportModalOpen(false);
          } catch {
            setError("Could not export full catalog.");
          } finally {
            setExportingFull(false);
          }
        }}
      />

      <AppModal
        visible={exportConflictOpen}
        onClose={() => setExportConflictOpen(false)}
        title="Export scope"
      >
        <p style={{ color: colors.textSecondary, lineHeight: 1.45, marginTop: 0 }}>
          Filters are active and you selected rows. Which set should download?
        </p>
        <Button
          testID="export-conflict-filtered"
          title={`All matching filters (${total} products)`}
          onPress={() => void runFilteredExport()}
          loading={sessionDownloading}
          fullWidth
        />
        <Button
          testID="export-conflict-selected"
          title={`Selected rows only (${selectedIds.size})`}
          variant="ghost"
          onPress={() => void runSelectedExport()}
          loading={sessionDownloading}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </AppModal>

      <CatalogImportHubModal
        visible={importOpen}
        initialStep={importInitialStep}
        scrollFamilyImages={importScrollFamilyImages}
        onClose={() => {
          setImportOpen(false);
          setImportInitialStep("pick");
          setImportScrollFamilyImages(false);
        }}
        onImported={() => void refreshAll()}
      />

      {editorOpen ? (
        <CatalogProductEditor
          key={`${editing?.id || "new"}-open`}
          item={editing}
          categories={categories}
          brands={brands}
          subcategories={subcategories}
          saving={saving}
          onSave={(body) => void saveItem(body)}
          onClose={() => setEditorOpen(false)}
          onError={setError}
          onCategoriesChanged={setCategories}
        />
      ) : null}
      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title="Delete product"
        message={`Remove ${deleteTarget?.name || "this item"} permanently.`}
        confirmLabel="Delete product"
        loading={deletingProduct}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  minWidth: 0,
  minHeight: "100vh",
  backgroundColor: colors.bg,
};

const headerActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 5,
  border: 0,
  backgroundColor: "transparent",
  cursor: "pointer",
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: spacing.sm,
  padding: `${spacing.sm}px ${spacing.lg}px`,
  borderBottom: `1px solid ${colors.border}`,
  backgroundColor: colors.bg,
};

const searchInputStyle: React.CSSProperties = {
  flex: "1 1 200px",
  minWidth: 160,
  maxWidth: 480,
  margin: 0,
};

const toolbarActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  marginLeft: "auto",
};

const toolButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 36,
  padding: "0 12px",
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 8,
  background: colors.surface,
  color: colors.primary,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  minHeight: 120,
  alignItems: "center",
  justifyContent: "center",
};

const emptyStateStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: spacing.sm,
  padding: spacing.xl,
  color: colors.textSecondary,
};

const emptyTitleStyle: React.CSSProperties = {
  ...font.title,
  color: colors.textPrimary,
};

const emptySubtitleStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: 14,
};

const tableScrollStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "100%",
  overflowX: "auto",
  padding: spacing.lg,
  paddingBottom: spacing.sm,
};

const tableStyle: React.CSSProperties = { minWidth: 720, display: "grid" };

const tableHeaderStyle: React.CSSProperties = {
  display: "grid",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderBottom: `1px solid ${colors.border}`,
  color: colors.textMuted,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
};

const headNumStyle: React.CSSProperties = { textAlign: "right" };
const headActionsStyle: React.CSSProperties = { textAlign: "right" };

const paginationStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: spacing.sm,
  padding: `0 ${spacing.lg}px ${spacing.lg}px`,
};

const pageSizeLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: colors.textSecondary,
};

const pageSizeSelectStyle: React.CSSProperties = {
  height: 32,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  padding: "0 8px",
};

const pageInfoStyle: React.CSSProperties = {
  fontSize: 13,
  color: colors.textSecondary,
  minWidth: 100,
  textAlign: "center",
};

const pageBtnStyle: React.CSSProperties = {
  height: 32,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${colors.borderStrong}`,
  background: colors.surface,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};
