import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createCatalogItem,
  deleteCatalogItemSecured,
  listCatalog,
  listCategories,
  listBrands,
  listSubcategories,
  updateCatalogItem,
  type Brand,
  type CatalogItem,
  type Category,
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

export default function CatalogPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    () => Promise.all([listCategories(), listBrands(), listCatalog(), listSubcategories()]),
    [],
  );

  useEffect(() => {
    let active = true;
    void fetchData()
      .then(([nextCategories, nextBrands, nextItems, nextSubcategories]) => {
        if (!active) return;
        setCategories(nextCategories || []);
        setBrands(nextBrands || []);
        setItems(nextItems || []);
        setSubcategories(nextSubcategories || []);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof ApiError ? cause.message : "Failed to load catalog",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchData]);

  const listed = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      `${item.name} ${item.productCode || ""} ${item.brand || ""} ${(item.aliases || []).join(" ")}`
        .toLowerCase()
        .includes(query),
    );
  }, [items, search]);

  const load = useCallback(async () => {
    try {
      const [nextCategories, nextBrands, nextItems, nextSubcategories] = await fetchData();
      setCategories(nextCategories || []);
      setBrands(nextBrands || []);
      setItems(nextItems || []);
      setSubcategories(nextSubcategories || []);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Failed to load catalog");
    }
  }, [fetchData]);

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
        title="Manage Catalog"
        subtitle={`${listed.length} of ${items.length} item${items.length === 1 ? "" : "s"} · edit MRP, discount, and stock without re-uploading`}
        onBack={() => navigate(-1)}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
            <button type="button" data-testid="export-catalog-csv" aria-label="Export catalog CSV" onClick={exportCatalogCsv} style={headerActionStyle}>
              <Icon name="download-outline" size={23} color={colors.primary} />
            </button>
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
          </div>
        }
      />
      <div className="admin-page-container" style={controlsStyle}>
        <Input
          testID="product-search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search code, name, alias, or brand"
          style={{ margin: `0 ${spacing.lg}px` }}
        />
      </div>

      {loading ? (
        <div style={centerStyle}>
          <span className="web-button-spinner" role="status" aria-label="Loading catalog" />
        </div>
      ) : listed.length === 0 ? (
        <div style={emptyStateStyle}>
          <Icon name="cube-outline" size={26} color={colors.primary} />
          <div style={emptyTitleStyle}>No items yet</div>
          <div style={emptySubtitleStyle}>Add your first item or import a CSV file.</div>
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
              />
            ))}
          </div>
        </div>
      )}

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

const controlsStyle: React.CSSProperties = {
  borderBottom: `1px solid ${colors.border}`,
  backgroundColor: colors.bg,
  paddingBottom: spacing.sm,
  paddingTop: spacing.sm,
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
