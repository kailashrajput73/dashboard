import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createCategory,
  deleteCategoryCascade,
  listCatalog,
  listCategories,
  updateCategory,
  type CatalogItem,
  type Category,
} from "../api/endpoints";
import { ApiError } from "../api/client";
import { CoverImageField } from "../components/CoverImageField";
import { Icon } from "../components/Icon";
import {
  CountButton as ProductCountButton,
  List as ProductPeekList,
} from "../components/LinkedProducts";
import { PasscodeConfirmModal } from "../components/PasscodeConfirmModal";
import { RemoteImage } from "../components/RemoteImage";
import {
  AppModal,
  Button,
  Chip,
  ErrorModal,
  Header,
  Input,
} from "../components/UI";
import { colors, font, radii, spacing } from "../theme";

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Category | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(
    () => Promise.all([listCategories(), listCatalog()]),
    [],
  );

  useEffect(() => {
    let active = true;
    void fetchData()
      .then(([nextCategories, nextProducts]) => {
        if (!active) return;
        setCategories(nextCategories || []);
        setProducts(nextProducts || []);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Failed to load categories",
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

  async function load() {
    try {
      const [nextCategories, nextProducts] = await fetchData();
      setCategories(nextCategories || []);
      setProducts(nextProducts || []);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Failed to load categories",
      );
    }
  }

  const filtered = useMemo(
    () =>
      categories.filter((category) => {
        const matchesQuery = category.name
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        const matchesStatus =
          status === "all" ||
          (status === "active" ? category.isActive : !category.isActive);
        return matchesQuery && matchesStatus;
      }),
    [categories, query, status],
  );

  function productsFor(category: Category) {
    return products.filter(
      (item) => (item.category || "").toLowerCase() === category.name.toLowerCase(),
    );
  }

  function openCreate() {
    setName("");
    setImageUrl(undefined);
    setEditor(null);
  }

  function openEdit(category: Category) {
    setName(category.name);
    setImageUrl(category.imageUrl || undefined);
    setEditor(category);
  }

  async function save() {
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editor) {
        await updateCategory(editor.id, {
          name: name.trim(),
          isActive: editor.isActive,
          imageUrl: imageUrl || null,
        });
      } else {
        await createCategory(name.trim(), imageUrl);
      }
      setEditor(undefined);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save category");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(category: Category) {
    try {
      await updateCategory(category.id, {
        name: category.name,
        isActive: !category.isActive,
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not update category status",
      );
    }
  }

  async function confirmDeleteCategory(credentials: {
    contactNumber: string;
    passcode: string;
  }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteCategoryCascade(deleteTarget.id, credentials);
      setDeleteTarget(null);
      await load();
      setError(
        `Deleted ${deleteTarget.name} and ${result.productsRemoved} product(s).`,
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not delete category",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Categories"
        subtitle="Tap Photo to add a home picture or URL"
        onBack={() => navigate(-1)}
        right={
          <button
            type="button"
            data-testid="open-add-category"
            aria-label="Add category"
            onClick={openCreate}
            style={iconActionStyle}
          >
            <Icon name="add-circle" size={26} color={colors.primary} />
          </button>
        }
      />

      <div style={{ padding: `${spacing.md}px ${spacing.lg}px 0` }}>
        <Input
          testID="category-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search categories"
          style={{ marginBottom: spacing.sm }}
        />
        <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.sm }}>
          <Chip
            label="All"
            selected={status === "all"}
            onPress={() => setStatus("all")}
            testID="category-filter-all"
          />
          <Chip
            label="Active"
            selected={status === "active"}
            onPress={() => setStatus("active")}
            testID="category-filter-active"
          />
          <Chip
            label="Inactive"
            selected={status === "inactive"}
            onPress={() => setStatus("inactive")}
            testID="category-filter-inactive"
          />
        </div>
      </div>

      {loading ? (
        <div style={centerStyle}>
          <span className="web-button-spinner" role="status" aria-label="Loading categories" />
        </div>
      ) : filtered.length ? (
        <div style={{ padding: `${spacing.sm}px ${spacing.lg}px 40px` }}>
          {filtered.map((category) => {
            const open = openId === category.id;
            const listed = productsFor(category);
            return (
              <div
                key={category.id}
                data-testid={`category-row-${category.id}`}
                style={categoryCardStyle}
              >
                <div style={categoryRowStyle}>
                  <button
                    type="button"
                    data-testid={`photo-category-${category.id}`}
                    aria-label={`Edit ${category.name} photo`}
                    onClick={() => openEdit(category)}
                    style={{ ...iconActionStyle, padding: 0 }}
                  >
                    <RemoteImage
                      uri={category.imageUrl}
                      style={{ width: 48, height: 48, borderRadius: 10 }}
                      placeholderSize={16}
                    />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...font.title, color: colors.textPrimary }}>
                      {category.name}
                    </div>
                    <ProductCountButton
                      count={listed.length}
                      selected={open}
                      onPress={() => setOpenId(open ? null : category.id)}
                      testID={`category-products-${category.id}`}
                    />
                  </div>
                  <span
                    style={{
                      ...statusStyle,
                      color: category.isActive ? colors.success : colors.textMuted,
                      backgroundColor: category.isActive
                        ? colors.successBg
                        : colors.border,
                    }}
                  >
                    {category.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    type="button"
                    data-testid={`edit-category-${category.id}`}
                    onClick={() => openEdit(category)}
                    style={photoActionStyle}
                  >
                    <Icon name="image-outline" size={16} color={colors.primary} />
                    {category.imageUrl ? "Photo" : "Add photo"}
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-category-${category.id}`}
                    aria-label={`Delete ${category.name}`}
                    onClick={() => setDeleteTarget(category)}
                    style={iconActionStyle}
                  >
                    <Icon name="trash-outline" size={19} color={colors.error} />
                  </button>
                  <button
                    type="button"
                    data-testid={`toggle-category-${category.id}`}
                    aria-label={`${category.isActive ? "Deactivate" : "Activate"} ${category.name}`}
                    onClick={() => void toggle(category)}
                    style={iconActionStyle}
                  >
                    <Icon
                      name={category.isActive ? "pause-circle-outline" : "play-circle-outline"}
                      size={21}
                      color={category.isActive ? colors.error : colors.success}
                    />
                  </button>
                </div>
                {open ? (
                  <ProductPeekList
                    products={listed}
                    emptyText={`No products in ${category.name}.`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={emptyStyle}>No categories match your search.</div>
      )}

      <AppModal
        testID="category-editor"
        visible={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={editor ? "Edit category" : "New category"}
      >
        <Input
          testID="category-name-input"
          label="Category name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Electrical"
          autoCapitalize="words"
        />
        <CoverImageField
          testID="category-image"
          label="Category home photo"
          uri={imageUrl}
          onChange={setImageUrl}
          onError={setError}
        />
        <Button
          testID="save-category"
          title={editor ? "Save changes" : "Create category"}
          onPress={() => void save()}
          loading={saving}
          fullWidth
        />
      </AppModal>

      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete ${deleteTarget?.name || "category"}`}
        message="Deletes this category, its subcategories, and every product in this category."
        confirmLabel="Delete category and products"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(credentials) => void confirmDeleteCategory(credentials)}
      />
      <ErrorModal
        visible={!!error}
        message={error || ""}
        onClose={() => setError(null)}
      />
    </main>
  );
}

const iconActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 4,
  border: 0,
  background: "transparent",
  cursor: "pointer",
  flexShrink: 0,
};

const categoryRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
};

const categoryCardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: spacing.md,
  marginBottom: spacing.sm,
};

const photoActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 8px",
  border: 0,
  borderRadius: radii.pill,
  backgroundColor: colors.primaryLight,
  color: colors.primary,
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const statusStyle: React.CSSProperties = {
  borderRadius: radii.pill,
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
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
}
