import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createProductType,
  listCatalog,
  listProductTypes,
  purgeCatalogByField,
  updateProductType,
  type CatalogItem,
  type ProductType,
} from "../../../api/endpoints";
import { ApiError } from "../../../api/client";
import { API_BASE_URL } from "../../../config/env";
import { CoverImageField } from "../../../components/CoverImageField";
import { Icon } from "../../../components/Icon";
import {
  CountButton as ProductCountButton,
  List as ProductPeekList,
} from "../../../components/LinkedProducts";
import { PasscodeConfirmModal } from "../../../components/PasscodeConfirmModal";
import { RemoteImage } from "../../../components/RemoteImage";
import { AppModal, Button, Chip, Input } from "../../../components/UI";
import { colors, font, radii, spacing } from "../../../theme";

function typesFromCatalog(products: CatalogItem[]): ProductType[] {
  const map = new Map<string, ProductType>();
  for (const item of products) {
    const name = (item.type || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const current = map.get(key);
    if (current) current.productCount += 1;
    else map.set(key, { id: key, name, isActive: true, productCount: 1, imageUrl: null });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

type Props = {
  onChanged: () => void;
  onError: (message: string) => void;
};

export function ManageProductTypesPanel(props: Props) {
  const [types, setTypes] = useState<ProductType[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [apiReady, setApiReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editor, setEditor] = useState<ProductType | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const catalog = (await listCatalog()) || [];
    setProducts(catalog);
    try {
      setTypes((await listProductTypes()) || []);
      setApiReady(true);
    } catch (error) {
      setTypes(typesFromCatalog(catalog));
      setApiReady(
        !(error instanceof ApiError && (error.status === 404 || /not found/i.test(error.message))),
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    void load()
      .catch((cause) => {
        if (active) props.onError(cause instanceof ApiError ? cause.message : "Failed to load types");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, props]);

  const filtered = useMemo(
    () =>
      types.filter((row) => {
        const matchesText = row.name.toLowerCase().includes(query.trim().toLowerCase());
        return (
          matchesText &&
          (filter === "all" || (filter === "active" ? row.isActive : !row.isActive))
        );
      }),
    [filter, query, types],
  );

  function productsFor(row: ProductType) {
    return products.filter((item) => (item.type || "").toLowerCase() === row.name.toLowerCase());
  }

  function openCreate() {
    setEditor(null);
    setName("");
    setImageUrl(undefined);
  }

  function openEdit(row: ProductType) {
    setEditor(row);
    setName(row.name);
    setImageUrl(row.imageUrl || undefined);
  }

  async function save() {
    if (!editor && !name.trim()) {
      props.onError("Type name is required.");
      return;
    }
    if (editor && !apiReady) {
      props.onError(
        `Cannot save photos until the VPS has /api/product-types. Redeploy ${API_BASE_URL} with the latest server.py.`,
      );
      return;
    }
    setSaving(true);
    try {
      if (editor) {
        await updateProductType(editor.id, {
          name: editor.name,
          isActive: editor.isActive,
          imageUrl: imageUrl || null,
        });
      } else {
        await createProductType(name.trim(), imageUrl || null);
      }
      setEditor(undefined);
      await load();
      props.onChanged();
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Could not save type");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: ProductType) {
    try {
      await updateProductType(row.id, { name: row.name, isActive: !row.isActive, imageUrl: row.imageUrl });
      await load();
      props.onChanged();
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Could not update type status");
    }
  }

  async function confirmPurge(credentials: { contactNumber: string; passcode: string }) {
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
      props.onChanged();
      props.onError(`Removed ${result.productsRemoved} product(s) for ${deleteTarget.name}.`);
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Could not delete products");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={centerStyle}>
        <span className="web-button-spinner" role="status" aria-label="Loading product types" />
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: spacing.sm }}>
        <Button testID="open-add-product-type" title="Add new" size="sm" onPress={openCreate} />
      </div>
      <Input
        testID="product-type-search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search product types"
        style={{ marginBottom: spacing.sm }}
      />
      <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.sm, flexWrap: "wrap" }}>
        {(["all", "active", "inactive"] as const).map((item) => (
          <Chip
            key={item}
            label={item === "all" ? "All" : item === "active" ? "Active" : "Inactive"}
            selected={filter === item}
            onPress={() => setFilter(item)}
            testID={`product-type-filter-${item}`}
          />
        ))}
      </div>
      <div style={listStyle}>
        {filtered.length ? (
          filtered.map((item) => {
            const open = openId === item.id;
            const listed = productsFor(item);
            return (
              <div key={item.id} data-testid={`product-type-row-${item.id}`} style={cardStyle}>
                <div style={rowStyle}>
                  <button
                    type="button"
                    data-testid={`photo-product-type-${item.id}`}
                    aria-label={`Edit ${item.name} photo`}
                    onClick={() => openEdit(item)}
                    style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
                  >
                    <RemoteImage uri={item.imageUrl} style={thumbStyle} placeholderSize={16} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={nameStyle}>{item.name}</div>
                    <ProductCountButton
                      count={listed.length}
                      selected={open}
                      onPress={() => setOpenId(open ? null : item.id)}
                      testID={`product-type-products-${item.id}`}
                    />
                  </div>
                  <span style={statusStyle(item.isActive)}>{item.isActive ? "Active" : "Inactive"}</span>
                  <button
                    type="button"
                    data-testid={`edit-product-type-${item.id}`}
                    onClick={() => openEdit(item)}
                    style={iconBtn}
                  >
                    <Icon name="image-outline" size={16} color={colors.primary} />
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-product-type-${item.id}`}
                    onClick={() => setDeleteTarget(item)}
                    style={iconBtn}
                  >
                    <Icon name="trash-outline" size={19} color={colors.error} />
                  </button>
                  <button
                    type="button"
                    data-testid={`toggle-product-type-${item.id}`}
                    onClick={() => void toggle(item)}
                    style={iconBtn}
                  >
                    <Icon
                      name={item.isActive ? "pause-circle-outline" : "play-circle-outline"}
                      size={19}
                      color={item.isActive ? colors.error : colors.success}
                    />
                  </button>
                </div>
                {open ? (
                  <ProductPeekList products={listed} emptyText={`No products for ${item.name}.`} />
                ) : null}
              </div>
            );
          })
        ) : (
          <p style={emptyStyle}>No product types found.</p>
        )}
      </div>
      <AppModal
        visible={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={editor ? "Edit product type photo" : "Add product type"}
      >
        {!editor ? (
          <Input testID="product-type-name-input" label="Type name" value={name} onChangeText={setName} />
        ) : null}
        <CoverImageField
          label="Photo"
          uri={imageUrl}
          onChange={setImageUrl}
          onError={props.onError}
          testID="product-type-cover"
        />
        <Button title="Save" loading={saving} fullWidth onPress={() => void save()} />
      </AppModal>
      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete products for ${deleteTarget?.name || "type"}`}
        message="Purge all products with this type."
        confirmLabel="Purge products"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmPurge}
      />
    </>
  );
}

function statusStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 700,
    color: active ? colors.success : colors.textMuted,
  };
}

const centerStyle: React.CSSProperties = { display: "flex", justifyContent: "center", padding: spacing.lg };
const listStyle: React.CSSProperties = { maxHeight: 420, overflowY: "auto", display: "grid", gap: spacing.sm };
const cardStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: spacing.sm,
  background: colors.surface,
};
const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.sm };
const thumbStyle: React.CSSProperties = { width: 48, height: 48, borderRadius: 10 };
const nameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, fontSize: 15 };
const iconBtn: React.CSSProperties = { border: 0, background: "transparent", cursor: "pointer", padding: 4 };
const emptyStyle: React.CSSProperties = { color: colors.textSecondary, textAlign: "center" };
