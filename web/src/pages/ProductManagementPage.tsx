import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createCatalogItem,
  deleteCatalogItemSecured,
  listBrands,
  listCatalog,
  listCategories,
  listProductGroups,
  listProductTypes,
  listSubcategories,
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
import { ErrorModal, Header, Input } from "../components/UI";
import { colors, font, spacing } from "../theme";
import { inferProductClass } from "../utils/infer-product-class";
import { CatalogProductEditor } from "../features/catalog/CatalogProductEditor";
import { CatalogPricingRow } from "../features/catalog/CatalogPricingRow";
import { downloadCsv } from "../utils/download-csv";
import { MASTER_TEMPLATE_HEADERS } from "../utils/import-templates";
import { gstToPercent } from "../utils/csv";
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
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [filters, setFilters] = useState<ProductFilters>(defaultFilters);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importInitialStep, setImportInitialStep] = useState<ImportStep>("pick");
  const [importScrollFamilyImages, setImportScrollFamilyImages] = useState(false);

  useEffect(() => {
    const state = location.state as { openImport?: string; scrollFamilyImages?: boolean } | null;
    if (state?.openImport !== "pipes-fittings") return;
    setImportInitialStep("pipes-fittings-combined");
    setImportScrollFamilyImages(Boolean(state.scrollFamilyImages));
    setImportOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const fetchData = useCallback(async () => {
    const [nextCategories, nextBrands, nextItems, nextSubcategories, nextGroups] = await Promise.all([
      listCategories(),
      listBrands(),
      listCatalog(),
      listSubcategories(),
      listProductGroups(),
    ]);
    let nextTypes: ProductType[] = [];
    try {
      nextTypes = (await listProductTypes()) || [];
    } catch {
      nextTypes = [];
    }
    return {
      categories: nextCategories || [],
      brands: nextBrands || [],
      items: nextItems || [],
      subcategories: nextSubcategories || [],
      productGroups: nextGroups || [],
      productTypes: nextTypes,
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchData();
      setCategories(data.categories);
      setBrands(data.brands);
      setItems(data.items);
      setSubcategories(data.subcategories);
      setProductGroups(data.productGroups);
      setProductTypes(data.productTypes);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to load catalog");
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    void getTaxonomyTabs().then((next) => {
      if (active) setTabs(next);
    });
    void fetchData()
      .then((data) => {
        if (!active) return;
        setCategories(data.categories);
        setBrands(data.brands);
        setItems(data.items);
        setSubcategories(data.subcategories);
        setProductGroups(data.productGroups);
        setProductTypes(data.productTypes);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof ApiError ? cause.message : "Failed to load catalog");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchData, navigate]);

  const filterOptions = useMemo(() => {
    const categoryNames = categories.map((c) => c.name);
    const subcatPool =
      filters.category === ALL_FILTER
        ? subcategories
        : subcategories.filter((row) => {
            const cat = categories.find((c) => c.id === row.categoryId);
            return cat?.name === filters.category;
          });
    const productPool = items.filter((item) => {
      if (filters.category !== ALL_FILTER && (item.category || "") !== filters.category) return false;
      if (filters.subcategory !== ALL_FILTER && (item.subcategory || "") !== filters.subcategory) {
        return false;
      }
      return true;
    });
    const typeNames = [
      ...new Set([
        ...productTypes.map((t) => t.name),
        ...productPool.map((item) => (item.type || "").trim()).filter(Boolean),
      ]),
    ].sort();
    const classNames = [
      ...new Set(productPool.map((item) => inferProductClass(item)).filter(Boolean)),
    ].sort();
    const brandNames = [
      ...new Set([
        ...brands.map((b) => b.name),
        ...productPool.map((item) => (item.brand || "").trim()).filter(Boolean),
      ]),
    ].sort();
    const groupNames = [
      ...new Set([
        ...productGroups.map((g) => g.name),
        ...productPool.map((item) => (item.productGroup || "").trim()).filter(Boolean),
      ]),
    ].sort();
    return {
      categories: categoryNames,
      subcategories: subcatPool.map((s) => s.name),
      productTypes: typeNames,
      productClasses: classNames,
      brands: brandNames,
      productGroups: groupNames,
    };
  }, [categories, subcategories, brands, productGroups, productTypes, items, filters.category, filters.subcategory]);

  const listed = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filters.category !== ALL_FILTER && (item.category || "") !== filters.category) return false;
      if (filters.subcategory !== ALL_FILTER && (item.subcategory || "") !== filters.subcategory) {
        return false;
      }
      if (
        filters.productType !== ALL_FILTER &&
        (item.type || "").toLowerCase() !== filters.productType.toLowerCase()
      ) {
        return false;
      }
      const className = inferProductClass(item);
      if (
        filters.productClass !== ALL_FILTER &&
        className.toLowerCase() !== filters.productClass.toLowerCase()
      ) {
        return false;
      }
      if (filters.brand !== ALL_FILTER && (item.brand || "").toLowerCase() !== filters.brand.toLowerCase()) {
        return false;
      }
      if (
        filters.productGroup !== ALL_FILTER &&
        (item.productGroup || "").toLowerCase() !== filters.productGroup.toLowerCase()
      ) {
        return false;
      }
      if (!query) return true;
      return `${item.name} ${item.productCode || ""} ${item.brand || ""} ${(item.aliases || []).join(" ")}`
        .toLowerCase()
        .includes(query);
    });
  }, [items, search, filters]);

  async function saveItem(body: Parameters<typeof createCatalogItem>[0]) {
    setSaving(true);
    try {
      if (editing) await updateCatalogItem(editing.id, body);
      else await createCatalogItem(body);
      setEditorOpen(false);
      await load();
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
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to delete item");
    } finally {
      setDeletingProduct(false);
    }
  }

  function exportCatalogCsv() {
    const header = MASTER_TEMPLATE_HEADERS.join(",");
    const cell = (value: string | number | undefined) => {
      const text = String(value ?? "");
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows = listed.map((item) =>
      [
        item.category,
        item.type,
        item.subcategory,
        inferProductClass(item),
        item.brand,
        item.name,
        item.sizeCm ?? (item.sizeMm == null ? undefined : item.sizeMm / 10),
        item.length,
        item.productCode,
        item.hsnCode,
        gstToPercent(item.gstRate),
        item.unit,
        item.mrp,
        item.discount,
        item.sellingPrice ?? item.standardRate,
        item.stdPkg,
        item.mrpPkg,
        item.reorderLevel,
        item.imageUrl && /^https?:\/\//i.test(item.imageUrl) ? item.imageUrl : "",
      ]
        .map(cell)
        .join(","),
    );
    try {
      downloadCsv(`\uFEFF${[header, ...rows].join("\n")}`, "catalog.csv");
    } catch {
      setError("Could not export catalog CSV.");
    }
  }

  return (
    <main style={pageStyle}>
      <Header
        title="Product management"
        subtitle={`${listed.length} of ${items.length} item${items.length === 1 ? "" : "s"}`}
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
            onClick={exportCatalogCsv}
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
        onRefresh={() => void load()}
        onOpenBatchImport={
          canWrite
            ? () => {
                setImportInitialStep({ kind: "master", batch: true });
                setImportOpen(true);
              }
            : undefined
        }
      />

      {loading ? (
        <div style={centerStyle}>
          <span className="web-button-spinner" role="status" aria-label="Loading catalog" />
        </div>
      ) : listed.length === 0 ? (
        <div style={emptyStateStyle}>
          <Icon name="cube-outline" size={26} color={colors.primary} />
          <div style={emptyTitleStyle}>No matching products</div>
          <div style={emptySubtitleStyle}>Adjust filters or add a product.</div>
        </div>
      ) : (
        <div className="admin-horizontal-scroll admin-page-container" style={tableScrollStyle}>
          <div style={tableStyle}>
            <div style={tableHeaderStyle}>
              <span style={productColumnStyle}>Product</span>
              <span style={sizeColumnStyle}>cm / mm</span>
              <span style={sizeColumnStyle}>Inch</span>
              <span style={sizeColumnStyle}>Length</span>
              <span style={numberColumnStyle}>MRP</span>
              <span style={numberColumnStyle}>Discount %</span>
              <span style={metricColumnStyle}>Selling</span>
              <span style={metricColumnStyle}>Stock</span>
              <span style={actionsColumnStyle} />
            </div>
            {listed.map((item) => (
              <CatalogPricingRow
                key={`${item.id}-${item.mrp}-${item.discount}-${item.sellingPrice}-${item.standardRate}-${item.stock}`}
                item={item}
                onEdit={() => {
                  setEditing(item);
                  setEditorOpen(true);
                }}
                onSaved={load}
                onError={setError}
                onDelete={() => setDeleteTarget(item)}
                readOnly={!canWrite}
              />
            ))}
          </div>
        </div>
      )}

      <CatalogImportHubModal
        visible={importOpen}
        initialStep={importInitialStep}
        scrollFamilyImages={importScrollFamilyImages}
        onClose={() => {
          setImportOpen(false);
          setImportInitialStep("pick");
          setImportScrollFamilyImages(false);
        }}
        onImported={() => void load()}
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
  minHeight: 300,
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
};

const tableStyle: React.CSSProperties = { minWidth: 1180 };

const tableHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  padding: "8px",
  borderBottom: `1px solid ${colors.border}`,
  color: colors.textMuted,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
};

const productColumnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: "2.4 0 220px",
  minWidth: 220,
};

const sizeColumnStyle: React.CSSProperties = { flex: "0 0 88px" };
const numberColumnStyle: React.CSSProperties = { flex: "0 0 110px", textAlign: "right" };
const metricColumnStyle: React.CSSProperties = { flex: "0 0 118px" };
const actionsColumnStyle: React.CSSProperties = { flex: "0 0 140px" };
