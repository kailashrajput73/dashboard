import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createBrand,
  deleteBrandCascade,
  listBrands,
  listCatalog,
  updateBrand,
  type Brand,
  type CatalogItem,
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

export default function BrandsPage() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editor, setEditor] = useState<Brand | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(
    () => Promise.all([listBrands(), listCatalog()]),
    [],
  );

  const load = useCallback(async () => {
    try {
      const [nextBrands, nextProducts] = await fetchData();
      setBrands(nextBrands || []);
      setProducts(nextProducts || []);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Failed to load brands",
      );
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    void fetchData()
      .then(([nextBrands, nextProducts]) => {
        if (!active) return;
        setBrands(nextBrands || []);
        setProducts(nextProducts || []);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof ApiError ? cause.message : "Failed to load brands",
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
      brands.filter((brand) => {
        const matchesText = brand.name
          .toLowerCase()
          .includes(query.trim().toLowerCase());
        return (
          matchesText &&
          (filter === "all" ||
            (filter === "active" ? brand.isActive : !brand.isActive))
        );
      }),
    [brands, filter, query],
  );

  function productsFor(brand: Brand) {
    const brandName = brand.name.toLowerCase();
    return products.filter(
      (item) =>
        item.brandId === brand.id ||
        (item.brand || "").toLowerCase() === brandName,
    );
  }

  function openCreate() {
    setEditor(null);
    setName("");
    setLogoUrl(undefined);
  }

  function openEdit(brand: Brand) {
    setEditor(brand);
    setName(brand.name);
    setLogoUrl(brand.logoUrl || undefined);
  }

  async function save() {
    if (!name.trim()) {
      setError("Brand name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editor) {
        await updateBrand(editor.id, {
          name: name.trim(),
          isActive: editor.isActive,
          logoUrl: logoUrl || null,
        });
      } else {
        await createBrand(name.trim(), logoUrl);
      }
      setEditor(undefined);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not save brand",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggle(brand: Brand) {
    try {
      await updateBrand(brand.id, {
        name: brand.name,
        isActive: !brand.isActive,
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not update brand status",
      );
    }
  }

  async function confirmDeleteBrand(credentials: {
    contactNumber: string;
    passcode: string;
  }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteBrandCascade(deleteTarget.id, credentials);
      setDeleteTarget(null);
      await load();
      setError(
        `Deleted ${deleteTarget.name} and ${result.productsRemoved} product(s).`,
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not delete brand",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Brands"
        subtitle="Tap Photo to add a logo file or URL"
        onBack={() => navigate(-1)}
        right={
          <button
            type="button"
            data-testid="open-add-brand"
            aria-label="Add brand"
            onClick={openCreate}
            style={iconActionStyle}
          >
            <Icon name="add-circle" size={26} color={colors.primary} />
          </button>
        }
      />

      <div style={controlsStyle}>
        <Input
          testID="brand-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search brands"
          style={{ marginBottom: spacing.sm }}
        />
        <div style={filtersStyle}>
          <Chip
            label="All"
            selected={filter === "all"}
            onPress={() => setFilter("all")}
            testID="brand-filter-all"
          />
          <Chip
            label="Active"
            selected={filter === "active"}
            onPress={() => setFilter("active")}
            testID="brand-filter-active"
          />
          <Chip
            label="Inactive"
            selected={filter === "inactive"}
            onPress={() => setFilter("inactive")}
            testID="brand-filter-inactive"
          />
        </div>
      </div>

      {loading ? (
        <div style={centerStyle}>
          <span
            className="web-button-spinner"
            role="status"
            aria-label="Loading brands"
          />
        </div>
      ) : filtered.length ? (
        <div style={listStyle}>
          {filtered.map((brand) => {
            const open = openId === brand.id;
            const linked = productsFor(brand);
            return (
              <div
                key={brand.id}
                data-testid={`brand-row-${brand.id}`}
                style={brandCardStyle}
              >
                <div style={brandRowStyle}>
                  <button
                    type="button"
                    data-testid={`photo-brand-${brand.id}`}
                    aria-label={`Edit ${brand.name} logo`}
                    onClick={() => openEdit(brand)}
                    style={imageButtonStyle}
                  >
                    <RemoteImage
                      uri={brand.logoUrl}
                      style={thumbnailStyle}
                      placeholderSize={16}
                    />
                  </button>
                  <div style={brandMainStyle}>
                    <div style={brandNameStyle}>{brand.name}</div>
                    <ProductCountButton
                      count={linked.length}
                      selected={open}
                      onPress={() => setOpenId(open ? null : brand.id)}
                      testID={`brand-products-${brand.id}`}
                    />
                  </div>
                  <div
                    style={brand.isActive ? activeStatusStyle : inactiveStatusStyle}
                  >
                    <span
                      style={{
                        ...statusTextStyle,
                        color: brand.isActive ? colors.success : colors.textMuted,
                      }}
                    >
                      {brand.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-testid={`edit-brand-${brand.id}`}
                    aria-label={`${brand.logoUrl ? "Edit" : "Add"} ${brand.name} photo`}
                    onClick={() => openEdit(brand)}
                    style={photoButtonStyle}
                  >
                    <Icon name="image-outline" size={16} color={colors.primary} />
                    <span style={photoButtonTextStyle}>
                      {brand.logoUrl ? "Photo" : "Add photo"}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-brand-${brand.id}`}
                    aria-label={`Delete ${brand.name}`}
                    onClick={() => setDeleteTarget(brand)}
                    style={iconActionStyle}
                  >
                    <Icon name="trash-outline" size={19} color={colors.error} />
                  </button>
                  <button
                    type="button"
                    data-testid={`toggle-brand-${brand.id}`}
                    aria-label={`${brand.isActive ? "Deactivate" : "Activate"} ${brand.name}`}
                    onClick={() => void toggle(brand)}
                    style={iconActionStyle}
                  >
                    <Icon
                      name={brand.isActive ? "pause-circle-outline" : "play-circle-outline"}
                      size={21}
                      color={brand.isActive ? colors.error : colors.success}
                    />
                  </button>
                </div>
                {open ? (
                  <ProductPeekList
                    products={linked}
                    emptyText={`No products for ${brand.name}.`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={emptyStyle}>No brands match your search.</div>
      )}

      <AppModal
        testID="brand-editor"
        visible={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={editor ? "Edit brand" : "New brand"}
      >
        <Input
          testID="brand-name-input"
          label="Brand name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. ACME"
          autoCapitalize="words"
        />
        <CoverImageField
          testID="brand-logo"
          label="Brand logo"
          uri={logoUrl}
          onChange={setLogoUrl}
          onError={setError}
        />
        <Button
          testID="save-brand"
          title={editor ? "Save changes" : "Create brand"}
          onPress={() => void save()}
          loading={saving}
          fullWidth
        />
      </AppModal>

      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete ${deleteTarget?.name || "brand"}`}
        message="Deletes this brand and every product linked to it."
        confirmLabel="Delete brand and products"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(credentials) => void confirmDeleteBrand(credentials)}
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
  backgroundColor: "transparent",
  cursor: "pointer",
  flexShrink: 0,
};

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
  padding: `${spacing.sm}px ${spacing.lg}px`,
};

const brandCardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: spacing.md,
  marginBottom: spacing.sm,
};

const brandRowStyle: React.CSSProperties = {
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

const brandMainStyle: React.CSSProperties = { flex: 1, minWidth: 0 };

const brandNameStyle: React.CSSProperties = {
  ...font.title,
  color: colors.textPrimary,
};

const activeStatusStyle: React.CSSProperties = {
  borderRadius: radii.pill,
  padding: "4px 8px",
  backgroundColor: colors.successBg,
  flexShrink: 0,
};

const inactiveStatusStyle: React.CSSProperties = {
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

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  color: colors.textSecondary,
  padding: spacing.xl,
};