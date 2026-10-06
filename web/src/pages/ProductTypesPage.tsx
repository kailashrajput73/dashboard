import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listCatalog,
  listProductTypes,
  purgeCatalogByField,
  updateProductType,
  type CatalogItem,
  type ProductType,
} from "../api/endpoints";
import { ApiError } from "../api/client";
import { API_BASE_URL } from "../config/env";
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

function typesFromCatalog(products: CatalogItem[]): ProductType[] {
  const map = new Map<string, ProductType>();
  for (const item of products) {
    const name = (item.type || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const current = map.get(key);
    if (current) {
      current.productCount += 1;
    } else {
      map.set(key, {
        id: key,
        name,
        isActive: true,
        productCount: 1,
        imageUrl: null,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchTypesData(): Promise<{
  products: CatalogItem[];
  types: ProductType[];
  apiReady: boolean;
  error: unknown;
}> {
  const products = (await listCatalog()) || [];
  try {
    return {
      products,
      types: (await listProductTypes()) || [],
      apiReady: true,
      error: null,
    };
  } catch (error) {
    const missing =
      error instanceof ApiError &&
      (error.status === 404 || /not found/i.test(error.message));
    return {
      products,
      types: typesFromCatalog(products),
      apiReady: false,
      error: missing ? null : error,
    };
  }
}

export default function ProductTypesPage() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<ProductType[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editor, setEditor] = useState<ProductType | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ProductType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [apiReady, setApiReady] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchTypesData();
      setProducts(data.products);
      setTypes(data.types);
      setApiReady(data.apiReady);
      if (data.error) {
        setError(
          data.error instanceof ApiError
            ? data.error.message
            : "Could not load product types",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Failed to load product types",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchTypesData()
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        setTypes(data.types);
        setApiReady(data.apiReady);
        if (data.error) {
          setError(
            data.error instanceof ApiError
              ? data.error.message
              : "Could not load product types",
          );
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Failed to load product types",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      types.filter((row) => {
        const matchesText = row.name
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        return (
          matchesText &&
          (filter === "all" ||
            (filter === "active" ? row.isActive : !row.isActive))
        );
      }),
    [filter, query, types],
  );

  function productsFor(row: ProductType) {
    return products.filter(
      (item) => (item.type || "").toLowerCase() === row.name.toLowerCase(),
    );
  }

  function openEdit(row: ProductType) {
    setEditor(row);
    setImageUrl(row.imageUrl || undefined);
  }

  async function save() {
    if (!editor) return;
    if (!apiReady) {
      setError(
        `Cannot save photos until the VPS has /api/product-types. Redeploy ${API_BASE_URL} with the latest server.py.`,
      );
      return;
    }
    setSaving(true);
    try {
      await updateProductType(editor.id, {
        name: editor.name,
        isActive: editor.isActive,
        imageUrl: imageUrl || null,
      });
      setEditor(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not save type photo",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: ProductType) {
    try {
      await updateProductType(row.id, {
        name: row.name,
        isActive: !row.isActive,
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not update type status",
      );
    }
  }

  async function confirmPurge(credentials: {
    contactNumber: string;
    passcode: string;
  }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await purgeCatalogByField({
        ...credentials,
        field: "type",
        value: deleteTarget.name,
      });
      setDeleteTarget(null);
      await load();
      setError(
        `Removed ${result.productsRemoved} product(s) for ${deleteTarget.name}.`,
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not delete products",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Product type"
        subtitle="Tap Add photo — file or URL (not Excel)"
        onBack={() => navigate(-1)}
      />
      <div style={controlsStyle}>
        <Input
          testID="product-type-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search product types"
          style={{ marginBottom: spacing.sm }}
        />
        <div style={filtersStyle}>
          <Chip
            label="All"
            selected={filter === "all"}
            onPress={() => setFilter("all")}
            testID="product-type-filter-all"
          />
          <Chip
            label="Active"
            selected={filter === "active"}
            onPress={() => setFilter("active")}
            testID="product-type-filter-active"
          />
          <Chip
            label="Inactive"
            selected={filter === "inactive"}
            onPress={() => setFilter("inactive")}
            testID="product-type-filter-inactive"
          />
        </div>
      </div>

      {loading ? (
        <div style={centerStyle}>
          <span
            className="web-button-spinner"
            role="status"
            aria-label="Loading product types"
          />
        </div>
      ) : filtered.length ? (
        <div style={listStyle}>
          {filtered.map((item) => {
            const open = openId === item.id;
            const listed = productsFor(item);
            return (
              <div
                key={item.id}
                data-testid={`product-type-row-${item.id}`}
                style={cardStyle}
              >
                <div style={rowStyle}>
                  <button
                    type="button"
                    data-testid={`photo-product-type-${item.id}`}
                    aria-label={`Edit ${item.name} photo`}
                    onClick={() => openEdit(item)}
                    style={imageButtonStyle}
                  >
                    <RemoteImage
                      uri={item.imageUrl}
                      style={thumbnailStyle}
                      placeholderSize={16}
                    />
                  </button>
                  <div style={mainStyle}>
                    <div style={nameStyle}>{item.name}</div>
                    <ProductCountButton
                      count={listed.length}
                      selected={open}
                      onPress={() => setOpenId(open ? null : item.id)}
                      testID={`product-type-products-${item.id}`}
                    />
                  </div>
                  <div style={item.isActive ? activeStyle : inactiveStyle}>
                    <span
                      style={{
                        ...statusTextStyle,
                        color: item.isActive ? colors.success : colors.textMuted,
                      }}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-testid={`edit-product-type-${item.id}`}
                    aria-label={`${item.imageUrl ? "Edit" : "Add"} ${item.name} photo`}
                    onClick={() => openEdit(item)}
                    style={photoButtonStyle}
                  >
                    <Icon name="image-outline" size={16} color={colors.primary} />
                    <span style={photoButtonTextStyle}>
                      {item.imageUrl ? "Photo" : "Add photo"}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-product-type-${item.id}`}
                    aria-label={`Delete products for ${item.name}`}
                    onClick={() => setDeleteTarget(item)}
                    style={iconActionStyle}
                  >
                    <Icon name="trash-outline" size={19} color={colors.error} />
                  </button>
                  <button
                    type="button"
                    data-testid={`toggle-product-type-${item.id}`}
                    aria-label={`${item.isActive ? "Deactivate" : "Activate"} ${item.name}`}
                    onClick={() => void toggle(item)}
                    style={iconActionStyle}
                  >
                    <Icon
                      name={item.isActive ? "pause-circle-outline" : "play-circle-outline"}
                      size={21}
                      color={item.isActive ? colors.error : colors.success}
                    />
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
        <div style={emptyStyle}>
          No product types yet. Import a sheet with a Type column (CPVC, PVC,
          UPVC), then add photos here.
        </div>
      )}

      <AppModal
        testID="product-type-editor"
        visible={!!editor}
        onClose={() => setEditor(null)}
        title={editor ? `Type photo: ${editor.name}` : "Type photo"}
      >
        <CoverImageField
          testID="product-type-image"
          label="Type photo (app sidebar)"
          uri={imageUrl}
          onChange={setImageUrl}
          onError={setError}
        />
        <Button
          testID="save-product-type"
          title="Save photo"
          onPress={() => void save()}
          loading={saving}
          fullWidth
        />
      </AppModal>

      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete all ${deleteTarget?.name || ""} products`}
        message="Removes every product with this type. Requires admin passcode."
        confirmLabel="Delete products"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(credentials) => void confirmPurge(credentials)}
      />
      <ErrorModal
        visible={!!error}
        message={error || ""}
        onClose={() => setError(null)}
      />
    </main>
  );
}

const controlsStyle: React.CSSProperties = {
  padding: `${spacing.md}px ${spacing.lg}px 0`,
};

const filtersStyle: React.CSSProperties = {
  display: "flex",
  gap: spacing.sm,
  marginBottom: spacing.sm,
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  minHeight: 240,
  alignItems: "center",
  justifyContent: "center",
};

const listStyle: React.CSSProperties = {
  padding: `${spacing.lg}px ${spacing.lg}px 40px`,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: spacing.md,
  marginBottom: spacing.sm,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
};

const imageButtonStyle: React.CSSProperties = {
  padding: 0,
  border: 0,
  backgroundColor: "transparent",
  cursor: "pointer",
  flexShrink: 0,
};

const thumbnailStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 10,
};

const mainStyle: React.CSSProperties = { flex: 1, minWidth: 0 };

const nameStyle: React.CSSProperties = {
  ...font.title,
  color: colors.textPrimary,
};

const activeStyle: React.CSSProperties = {
  borderRadius: radii.pill,
  padding: "4px 8px",
  backgroundColor: colors.successBg,
  flexShrink: 0,
};

const inactiveStyle: React.CSSProperties = {
  borderRadius: radii.pill,
  padding: "4px 8px",
  backgroundColor: colors.border,
  flexShrink: 0,
};

const statusTextStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
};

const photoButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 8px",
  border: 0,
  borderRadius: radii.pill,
  backgroundColor: colors.primaryLight,
  cursor: "pointer",
  flexShrink: 0,
};

const photoButtonTextStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: colors.primary,
};

const iconActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 4,
  border: 0,
  backgroundColor: "transparent",
  cursor: "pointer",
  flexShrink: 0,
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  color: colors.textSecondary,
  padding: spacing.xl,
};