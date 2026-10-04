import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  createSubcategory,
  deleteSubcategoryCascade,
  importSubcategories,
  listCatalog,
  listCategories,
  listSubcategories,
  updateSubcategory,
  type CatalogItem,
  type Category,
  type Subcategory,
} from "../api/endpoints";
import { ApiError } from "../api/client";
import { CountButton as ProductCountButton, List as ProductPeekList } from "../components/LinkedProducts";
import { PasscodeConfirmModal } from "../components/PasscodeConfirmModal";
import { Icon } from "../components/Icon";
import {
  AppModal,
  Button,
  Chip,
  ErrorModal,
  Header,
  Input,
} from "../components/UI";
import { colors, font, radii, spacing } from "../theme";
import { parseCsvBytes } from "../utils/csv-reader";
import { downloadCsv } from "../utils/download-csv";

export default function SubcategoriesPage() {
  const navigate = useNavigate();
  const importInput = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [parent, setParent] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Subcategory | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(
    () =>
      Promise.all([
        listCategories(),
        listSubcategories(),
        listCatalog(),
      ]),
    [],
  );

  const load = useCallback(async () => {
    try {
      const [nextCategories, nextItems, nextProducts] = await fetchData();
      setCategories(nextCategories || []);
      setItems(nextItems || []);
      setProducts(nextProducts || []);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Failed to load subcategories",
      );
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    void fetchData()
      .then(([nextCategories, nextItems, nextProducts]) => {
        if (!active) return;
        setCategories(nextCategories || []);
        setItems(nextItems || []);
        setProducts(nextProducts || []);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Failed to load subcategories",
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

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesParent = parent === "all" || item.categoryId === parent;
        const text = `${item.name} ${item.category}`.toLowerCase();
        return matchesParent && text.includes(query.trim().toLowerCase());
      }),
    [items, parent, query],
  );

  function productsFor(subcategory: Subcategory) {
    const subcategoryName = (subcategory.name || "").toLowerCase();
    const categoryName = (subcategory.category || "").toLowerCase();
    return products.filter((item) => {
      if (item.subcategoryId && item.subcategoryId === subcategory.id) {
        return true;
      }
      const sameCategory =
        (item.category || "").toLowerCase() === categoryName;
      const sameSubcategory =
        (item.subcategory || "").toLowerCase() === subcategoryName ||
        (item.type || "").toLowerCase() === subcategoryName;
      return sameCategory && sameSubcategory;
    });
  }

  function openCreate() {
    setEditor(null);
    setName("");
    setCategoryId(
      categories.find((category) => category.isActive)?.id ||
        categories[0]?.id ||
        "",
    );
  }

  function openEdit(item: Subcategory) {
    setEditor(item);
    setName(item.name);
    setCategoryId(item.categoryId);
  }

  async function save() {
    if (!name.trim() || !categoryId) {
      setError("Subcategory name and parent category are required.");
      return;
    }
    setSaving(true);
    try {
      if (editor) {
        await updateSubcategory(editor.id, {
          name: name.trim(),
          categoryId,
        });
      } else {
        await createSubcategory({ name: name.trim(), categoryId });
      }
      setEditor(undefined);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not save subcategory",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteSubcategory(credentials: {
    contactNumber: string;
    passcode: string;
  }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteSubcategoryCascade(deleteTarget.id, credentials);
      setDeleteTarget(null);
      await load();
      setError(
        `Deleted ${deleteTarget.name} and ${result.productsRemoved} product(s).`,
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not delete subcategory",
      );
    } finally {
      setDeleting(false);
    }
  }

  function exportCsv() {
    const csv = [
      "name,category",
      ...items.map((item) => `${csvCell(item.name)},${csvCell(item.category)}`),
    ].join("\n");
    try {
      downloadCsv(csv, "subcategories.csv");
    } catch {
      setError("Could not open the CSV export.");
    }
  }

  async function importCsv(file: File) {
    try {
      const parsed = parseCsvBytes(new Uint8Array(await file.arrayBuffer()));
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      const payload = parsed.rows
        .map((row) => ({
          name: (row.name || row.subcategory || "").trim(),
          category: (row.category || row["parent category"] || "").trim(),
        }))
        .filter((row) => row.name && row.category);
      if (!payload.length) {
        setError("CSV needs name and category columns.");
        return;
      }
      setSaving(true);
      const result = await importSubcategories(payload);
      await load();
      setError(`Subcategory import: ${result.inserted} added, ${result.skipped} skipped.`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Subcategory import failed");
    } finally {
      setSaving(false);
    }
  }

  function onImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void importCsv(file);
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Subcategories"
        subtitle={`${filtered.length} of ${items.length}`}
        onBack={() => navigate(-1)}
        right={
          <div style={headerActionsStyle}>
            <button
              type="button"
              data-testid="download-subcategory-template"
              aria-label="Download subcategory template"
              title="Download subcategory template"
              onClick={() => downloadCsv("\uFEFFname,category\n", "subcategories-template.csv")}
              style={iconActionStyle}
            >
              <Icon name="document-outline" size={23} color={colors.primary} />
            </button>
            <button
              type="button"
              data-testid="import-subcategories"
              aria-label="Import subcategories"
              title="Import subcategories"
              onClick={() => importInput.current?.click()}
              style={iconActionStyle}
            >
              <Icon name="cloud-upload-outline" size={23} color={colors.primary} />
            </button>
            <button
              type="button"
              data-testid="export-subcategories"
              aria-label="Export subcategories"
              title="Export subcategories"
              onClick={exportCsv}
              style={iconActionStyle}
            >
              <Icon name="download-outline" size={23} color={colors.primary} />
            </button>
            <button
              type="button"
              data-testid="open-add-subcategory"
              aria-label="Add subcategory"
              onClick={openCreate}
              style={iconActionStyle}
            >
              <Icon name="add-circle" size={26} color={colors.primary} />
            </button>
          </div>
        }
      />
      <input
        ref={importInput}
        type="file"
        onChange={onImportFileChange}
        style={{ display: "none" }}
        data-testid="subcategory-csv-input"
      />

      <div style={{ padding: `${spacing.md}px ${spacing.lg}px 0` }}>
        <Input
          testID="subcategory-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search subcategories"
          style={{ marginBottom: spacing.sm }}
        />
        <div
          style={{
            display: "flex",
            gap: spacing.sm,
            overflowX: "auto",
            paddingBottom: spacing.sm,
          }}
        >
          {[{ id: "all", name: "All" }, ...categories].map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              selected={parent === category.id}
              onPress={() => setParent(category.id)}
              testID={`subcategory-filter-${category.id}`}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div style={centerStyle}>
          <span
            className="web-button-spinner"
            role="status"
            aria-label="Loading subcategories"
          />
        </div>
      ) : filtered.length ? (
        <div style={{ padding: `${spacing.sm}px ${spacing.lg}px 88px` }}>
          {filtered.map((item) => {
            const open = openId === item.id;
            const listed = productsFor(item);
            return (
              <div
                key={item.id}
                data-testid={`subcategory-row-${item.id}`}
                style={subcategoryCardStyle}
              >
                <div style={subcategoryRowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...font.title, color: colors.textPrimary }}>
                      {item.name}
                    </div>
                    <div style={parentNameStyle}>{item.category}</div>
                    <ProductCountButton
                      count={listed.length || item.productCount || 0}
                      selected={open}
                      onPress={() => setOpenId(open ? null : item.id)}
                      testID={`subcategory-products-${item.id}`}
                    />
                  </div>
                  <button
                    type="button"
                    data-testid={`edit-subcategory-${item.id}`}
                    aria-label={`Edit ${item.name}`}
                    onClick={() => openEdit(item)}
                    style={iconActionStyle}
                  >
                    <Icon
                      name="create-outline"
                      size={19}
                      color={colors.primary}
                    />
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-subcategory-${item.id}`}
                    aria-label={`Delete ${item.name}`}
                    onClick={() => setDeleteTarget(item)}
                    style={iconActionStyle}
                  >
                    <Icon name="trash-outline" size={19} color={colors.error} />
                  </button>
                </div>
                {open ? (
                  <ProductPeekList
                    products={listed}
                    emptyText={`No products in ${item.name}.`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={emptyStyle}>No subcategories match your search.</div>
      )}

      <div style={importBarStyle}>
        <Button
          testID="nav-batch-product-import"
          title="Import products (batch sheet)"
          icon="cloud-upload-outline"
          onPress={() => navigate("/import-products-batch")}
          size="sm"
          fullWidth
        />
      </div>

      <AppModal
        testID="subcategory-editor"
        visible={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={editor ? "Edit subcategory" : "New subcategory"}
      >
        <Input
          testID="subcategory-name-input"
          label="Subcategory name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Cement"
          autoCapitalize="words"
        />
        <div style={fieldLabelStyle}>Parent category</div>
        <button
          type="button"
          data-testid="subcategory-parent-picker"
          onClick={() => setPickerOpen(true)}
          style={parentPickerStyle}
        >
          <span style={selectedParentStyle}>
            {categories.find((category) => category.id === categoryId)?.name ||
              "Select category"}
          </span>
          <Icon name="chevron-down" size={18} color={colors.textMuted} />
        </button>
        <div style={{ height: spacing.md }} />
        <Button
          testID="save-subcategory"
          title={editor ? "Save changes" : "Create subcategory"}
          onPress={() => void save()}
          loading={saving}
          fullWidth
        />
      </AppModal>

      <AppModal
        testID="subcategory-parent-modal"
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select parent category"
      >
        {categories
          .filter((category) => category.isActive)
          .map((category) => (
            <button
              key={category.id}
              type="button"
              data-testid={`pick-parent-${category.id}`}
              onClick={() => {
                setCategoryId(category.id);
                setPickerOpen(false);
              }}
              style={categoryOptionStyle}
            >
              <span style={selectedParentStyle}>{category.name}</span>
              {category.id === categoryId ? (
                <Icon name="checkmark" size={18} color={colors.primary} />
              ) : null}
            </button>
          ))}
      </AppModal>

      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete ${deleteTarget?.name || "subcategory"}`}
        message="Deletes this subcategory and every product matched to it."
        confirmLabel="Delete subcategory and products"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(credentials) => void confirmDeleteSubcategory(credentials)}
      />
      <ErrorModal
        visible={!!error}
        message={error || ""}
        onClose={() => setError(null)}
      />
    </main>
  );
}

function csvCell(value: string) {
  return /[,"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.md,
};

const importBarStyle: React.CSSProperties = {
  position: "fixed",
  zIndex: 2,
  bottom: 12,
  left: spacing.lg,
  right: spacing.lg,
};

const iconActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 5,
  border: 0,
  backgroundColor: "transparent",
  cursor: "pointer",
  flexShrink: 0,
};

const subcategoryRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: spacing.sm,
};

const subcategoryCardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: spacing.md,
  marginBottom: spacing.sm,
};

const parentNameStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: 12,
  marginTop: 4,
};

const fieldLabelStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: 12,
  fontWeight: 600,
  marginBottom: spacing.sm,
};

const parentPickerStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
  padding: spacing.md,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: radii.sm,
  backgroundColor: colors.surface,
  textAlign: "left",
  cursor: "pointer",
};

const selectedParentStyle: React.CSSProperties = {
  color: colors.textPrimary,
  fontSize: 15,
};

const categoryOptionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: `${spacing.md}px 0`,
  border: 0,
  borderBottom: `1px solid ${colors.border}`,
  backgroundColor: "transparent",
  textAlign: "left",
  cursor: "pointer",
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  minHeight: 240,
  alignItems: "center",
  justifyContent: "center",
};

const emptyStyle: React.CSSProperties = {
  padding: spacing.xl,
  color: colors.textSecondary,
  textAlign: "center",
};
