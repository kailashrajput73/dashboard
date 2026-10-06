import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  applyCatalogPricingBulk,
  createCatalogItem,
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
import { Chip, ErrorModal, Header, Input, AppModal, Button } from "../components/UI";
import { colors, font, radii, spacing } from "../theme";
import { inferProductClass } from "../utils/infer-product-class";
import { CatalogProductEditor } from "../features/catalog/CatalogProductEditor";
import { CatalogPricingRow } from "../features/catalog/CatalogPricingRow";
import { downloadCsv } from "../utils/download-csv";

export default function CatalogPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedClass, setSelectedClass] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [draftType, setDraftType] = useState("All");
  const [draftClass, setDraftClass] = useState("All");
  const [draftBrand, setDraftBrand] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
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

  const categoryChips = useMemo(
    () => ["All", ...categories.map((category) => category.name)],
    [categories],
  );
  const listed = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedCategory !== "All" && (item.category || "") !== selectedCategory) {
        return false;
      }
      if (
        selectedType !== "All" &&
        (item.type || "").toLowerCase() !== selectedType.toLowerCase()
      ) {
        return false;
      }
      const className = inferProductClass(item);
      if (
        selectedClass !== "All" &&
        className.toLowerCase() !== selectedClass.toLowerCase()
      ) {
        return false;
      }
      if (
        selectedBrand !== "All" &&
        (item.brand || "").toLowerCase() !== selectedBrand.toLowerCase()
      ) {
        return false;
      }
      if (!query) return true;
      return `${item.name} ${item.productCode || ""} ${item.brand || ""} ${(item.aliases || []).join(" ")}`
        .toLowerCase()
        .includes(query);
    });
  }, [items, search, selectedCategory, selectedType, selectedClass, selectedBrand]);

  const typeChips = useMemo(() => {
    const pool = items.filter(
      (item) => selectedCategory === "All" || (item.category || "") === selectedCategory,
    );
    return [
      "All",
      ...[...new Set(pool.map((item) => (item.type || "").trim()).filter(Boolean))].sort(),
    ];
  }, [items, selectedCategory]);

  const classChips = useMemo(() => {
    const typeFilter = filterOpen ? draftType : selectedType;
    const pool = items.filter((item) => {
      if (selectedCategory !== "All" && (item.category || "") !== selectedCategory) {
        return false;
      }
      return (
        typeFilter === "All" ||
        (item.type || "").toLowerCase() === typeFilter.toLowerCase()
      );
    });
    return [
      "All",
      ...[...new Set(pool.map((item) => inferProductClass(item)).filter(Boolean))].sort(),
    ];
  }, [items, selectedCategory, selectedType, filterOpen, draftType]);

  const brandChips = useMemo(() => {
    const typeFilter = filterOpen ? draftType : selectedType;
    const classFilter = filterOpen ? draftClass : selectedClass;
    const pool = items.filter((item) => {
      if (selectedCategory !== "All" && (item.category || "") !== selectedCategory) {
        return false;
      }
      if (
        typeFilter !== "All" &&
        (item.type || "").toLowerCase() !== typeFilter.toLowerCase()
      ) {
        return false;
      }
      if (
        classFilter !== "All" &&
        inferProductClass(item).toLowerCase() !== classFilter.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
    return [
      "All",
      ...[...new Set(pool.map((item) => (item.brand || "").trim()).filter(Boolean))].sort(),
    ];
  }, [items, selectedCategory, selectedType, selectedClass, filterOpen, draftType, draftClass]);

  const extraFilterCount = [selectedType, selectedClass, selectedBrand].filter(
    (value) => value !== "All",
  ).length;

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

  async function applyListed(kind: "discount" | "stock") {
    if (listed.length === 0) return;
    const discount = parseFloat(bulkDiscount);
    const stock = parseFloat(bulkStock);
    if (kind === "discount" && Number.isNaN(discount)) {
      setError("Enter a discount % to apply to the listed products.");
      return;
    }
    if (kind === "stock" && Number.isNaN(stock)) {
      setError("Enter a stock quantity to apply to the listed products.");
      return;
    }
    setBulkSaving(true);
    try {
      const result = await applyCatalogPricingBulk(
        listed,
        kind === "discount" ? { discount } : { stock },
      );
      await load();
      if (result.skipped) {
        setError(`Updated ${result.updated}, skipped ${result.skipped}.`);
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not apply pricing");
    } finally {
      setBulkSaving(false);
    }
  }

  function exportCatalogCsv() {
    const header = "productCode,name,category,type,subcategory,class,brand,unit,mrp,sellingPrice,discount,stock,imageUrl";
    const cell = (value: string | number | undefined) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = listed.map((item) =>
      [
        item.productCode,
        item.name,
        item.category,
        item.type,
        item.subcategory,
        inferProductClass(item),
        item.brand,
        item.unit,
        item.mrp,
        item.sellingPrice ?? item.standardRate,
        item.discount,
        item.stock,
        item.imageUrl ? "(url)" : "",
      ]
        .map(cell)
        .join(","),
    );
    try {
      downloadCsv([header, ...rows].join("\n"), "catalog.csv");
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
      <div style={controlsStyle}>
        <Input
          testID="product-search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search code, name, alias, or brand"
          style={{ margin: `0 ${spacing.lg}px` }}
        />
        <div style={categoryBarStyle}>
          <span style={categoryLabelStyle}>Category</span>
          <div style={categoryRowStyle}>
            <div style={categoryChipsStyle}>
              {categoryChips.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  selected={selectedCategory === category}
                  onPress={() => {
                    setSelectedCategory(category);
                    setSelectedType("All");
                    setSelectedClass("All");
                    setSelectedBrand("All");
                  }}
                  testID={`admin-cat-${category}`}
                />
              ))}
            </div>
            <button
              type="button"
              data-testid="open-catalog-filter"
              onClick={() => {
                setDraftType(selectedType);
                setDraftClass(selectedClass);
                setDraftBrand(selectedBrand);
                setFilterOpen(true);
              }}
              style={filterButtonStyle(extraFilterCount > 0)}
            >
              <Icon
                name="options-outline"
                size={18}
                color={extraFilterCount > 0 ? "#FFFFFF" : colors.primary}
              />
              <span>
                Filter{extraFilterCount ? ` (${extraFilterCount})` : ""}
              </span>
            </button>
          </div>
        </div>
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
        <div style={tableScrollStyle}>
          <div style={tableHintStyle}>
            Day-to-day work: change MRP, discount %, or stock on a row, then Save.
            Selling price updates from MRP and discount.
          </div>
          <div style={bulkBarStyle}>
            <strong>Apply to {listed.length} listed product{listed.length === 1 ? "" : "s"}</strong>
            <input value={bulkDiscount} onChange={(event) => setBulkDiscount(event.currentTarget.value)} placeholder="Discount %" inputMode="decimal" style={bulkInputStyle} data-testid="bulk-discount-input" />
            <Button title="Apply discount" size="sm" onPress={() => void applyListed("discount")} loading={bulkSaving} testID="bulk-discount-btn" />
            <input value={bulkStock} onChange={(event) => setBulkStock(event.currentTarget.value)} placeholder="Stock qty" inputMode="decimal" style={bulkInputStyle} data-testid="bulk-stock-input" />
            <Button title="Set stock" size="sm" onPress={() => void applyListed("stock")} loading={bulkSaving} testID="bulk-stock-btn" />
          </div>
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
              />
            ))}
          </div>
        </div>
      )}

      <AppModal
        testID="catalog-filter-modal"
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter products"
      >
        <div style={filterHintStyle}>
          Pick product type, class, and brand, then Apply. Category stays on the main page.
        </div>
        <FacetPicker
          title="Product type"
          values={typeChips}
          selected={draftType}
          testID="admin-type"
          onSelect={(value) => {
            setDraftType(value);
            setDraftClass("All");
            setDraftBrand("All");
          }}
        />
        <FacetPicker
          title="Product class"
          values={classChips}
          selected={draftClass}
          testID="admin-class"
          onSelect={(value) => {
            setDraftClass(value);
            setDraftBrand("All");
          }}
        />
        <FacetPicker
          title="Brand"
          values={brandChips}
          selected={draftBrand}
          testID="admin-brand"
          onSelect={setDraftBrand}
        />
        <div style={{ height: spacing.md }} />
        <Button
          testID="apply-catalog-filter"
          title="Apply filters"
          onPress={() => {
            setSelectedType(draftType);
            setSelectedClass(draftClass);
            setSelectedBrand(draftBrand);
            setFilterOpen(false);
          }}
          fullWidth
        />
        <div style={{ height: spacing.sm }} />
        <Button
          testID="clear-catalog-filter"
          title="Clear type, class, and brand"
          variant="ghost"
          onPress={() => {
            setDraftType("All");
            setDraftClass("All");
            setDraftBrand("All");
            setSelectedType("All");
            setSelectedClass("All");
            setSelectedBrand("All");
            setFilterOpen(false);
          }}
          fullWidth
        />
      </AppModal>
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
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}

function FacetPicker(props: {
  title: string;
  values: string[];
  selected: string;
  testID: string;
  onSelect: (value: string) => void;
}) {
  return (
    <section style={{ marginBottom: spacing.md }}>
      <div style={filterLabelStyle}>{props.title}</div>
      <div style={facetChipsStyle}>
        {props.values.map((value) => (
          <Chip
            key={value}
            label={value}
            selected={props.selected === value}
            onPress={() => props.onSelect(value)}
            testID={`${props.testID}-${value}`}
          />
        ))}
      </div>
    </section>
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
};

const categoryBarStyle: React.CSSProperties = { marginTop: spacing.sm };

const categoryLabelStyle: React.CSSProperties = {
  display: "block",
  color: colors.textMuted,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  margin: `8px ${spacing.lg}px 4px`,
};

const categoryRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  paddingRight: spacing.md,
};

const categoryChipsStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  gap: spacing.sm,
  overflowX: "auto",
  padding: `0 ${spacing.lg}px`,
};

function filterButtonStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 36,
    padding: "0 12px",
    border: `1px solid ${colors.primary}`,
    borderRadius: radii.pill,
    backgroundColor: active ? colors.primary : colors.primaryLight,
    color: active ? "#FFFFFF" : colors.primary,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  };
}

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

const tableHintStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: 13,
  marginBottom: spacing.md,
  lineHeight: "20px",
};

const bulkBarStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  marginBottom: spacing.md,
  padding: 12,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  fontSize: 13,
};

const bulkInputStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: 120,
  height: 40,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: radii.sm,
  padding: "0 10px",
  color: colors.textPrimary,
  backgroundColor: colors.bg,
  fontSize: 14,
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

const filterHintStyle: React.CSSProperties = {
  color: colors.textSecondary,
  lineHeight: "20px",
  marginBottom: spacing.md,
};

const filterLabelStyle: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  marginBottom: spacing.sm,
};

const facetChipsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.sm,
};