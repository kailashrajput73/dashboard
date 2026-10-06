import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProductGroup,
  deleteProductGroupCascade,
  listCatalog,
  listProductGroups,
  updateProductGroup,
  type CatalogItem,
  type ProductGroup,
} from "../api/endpoints";
import { ApiError } from "../api/client";
import { Icon } from "../components/Icon";
import {
  CountButton as ProductCountButton,
  List as ProductPeekList,
} from "../components/LinkedProducts";
import { PasscodeConfirmModal } from "../components/PasscodeConfirmModal";
import {
  AppModal,
  Button,
  ErrorModal,
  Header,
  Input,
} from "../components/UI";
import {
  SHELF_PRICE_BOARD_ENABLED,
  ShelfPriceBoard,
} from "../features/shelf-price-board";
import { colors, font, radii, spacing } from "../theme";

export default function ProductGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<ProductGroup | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextGroups, nextProducts] = await Promise.all([
        listProductGroups(),
        listCatalog(),
      ]);
      setGroups(nextGroups || []);
      setProducts(nextProducts || []);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Failed to load product groups",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([listProductGroups(), listCatalog()])
      .then(([nextGroups, nextProducts]) => {
        if (!active) return;
        setGroups(nextGroups || []);
        setProducts(nextProducts || []);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Failed to load product groups",
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

  const filteredGroups = useMemo(
    () =>
      groups.filter((group) =>
        group.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [groups, query],
  );
  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.productCode || ""}`
          .toLowerCase()
          .includes(productQuery.trim().toLowerCase()),
      ),
    [products, productQuery],
  );

  function productsFor(group: ProductGroup) {
    const ids = new Set(group.productIds || []);
    return products.filter(
      (item) =>
        ids.has(item.id) ||
        (item.productGroup || "").toLowerCase() === group.name.toLowerCase(),
    );
  }

  function openCreate() {
    setEditor(null);
    setName("");
    setSelected([]);
    setProductQuery("");
  }

  function openEdit(group: ProductGroup) {
    setEditor(group);
    setName(group.name);
    setSelected(group.productIds || []);
    setProductQuery("");
  }

  async function save() {
    if (!name.trim() || selected.length < 2) {
      setError("A product group needs a name and at least two products.");
      return;
    }
    setSaving(true);
    try {
      if (editor) {
        await updateProductGroup(editor.id, {
          name: name.trim(),
          productIds: selected,
        });
      } else {
        await createProductGroup({ name: name.trim(), productIds: selected });
      }
      setEditor(undefined);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not save product group",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteGroup(credentials: {
    contactNumber: string;
    passcode: string;
  }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteProductGroupCascade(
        deleteTarget.id,
        credentials,
      );
      setDeleteTarget(null);
      await load();
      setError(`Deleted group and ${result.productsRemoved} product(s).`);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not delete product group",
      );
    } finally {
      setDeleting(false);
    }
  }

  function toggleProduct(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Product Groups"
        subtitle={`${filteredGroups.length} of ${groups.length}`}
        onBack={() => navigate(-1)}
        right={
          <button
            type="button"
            data-testid="open-add-product-group"
            aria-label="Add product group"
            onClick={openCreate}
            style={iconActionStyle}
          >
            <Icon name="add-circle" size={26} color={colors.primary} />
          </button>
        }
      />
      <div style={controlsStyle}>
        <Input
          testID="product-group-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search product groups"
          style={{ marginBottom: 0 }}
        />
      </div>
      {loading ? (
        <div style={centerStyle}>
          <span className="web-button-spinner" role="status" aria-label="Loading product groups" />
        </div>
      ) : filteredGroups.length ? (
        <div style={listStyle}>
          {filteredGroups.map((group) => {
            const open = openId === group.id;
            const listed = productsFor(group);
            return (
              <section
                key={group.id}
                style={groupStyle}
                data-testid={`product-group-row-${group.id}`}
              >
                <div style={rowStyle}>
                  <div style={mainStyle}>
                    <div style={nameStyle}>{group.name}</div>
                    <ProductCountButton
                      count={listed.length}
                      selected={open}
                      onPress={() => setOpenId(open ? null : group.id)}
                      testID={`group-products-${group.id}`}
                    />
                  </div>
                  <button
                    type="button"
                    data-testid={`edit-product-group-${group.id}`}
                    aria-label={`Edit ${group.name}`}
                    title="Edit group"
                    onClick={() => openEdit(group)}
                    style={iconActionStyle}
                  >
                    <Icon name="create-outline" size={19} color={colors.primary} />
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-product-group-${group.id}`}
                    aria-label={`Delete ${group.name} and its products`}
                    title="Delete group and products"
                    onClick={() => setDeleteTarget(group)}
                    style={iconActionStyle}
                  >
                    <Icon name="trash-outline" size={19} color={colors.error} />
                  </button>
                </div>
                {open ?
                  SHELF_PRICE_BOARD_ENABLED ? (
                    <ShelfPriceBoard
                      title={group.name}
                      products={listed}
                      onSaved={load}
                    />
                  ) : (
                    <ProductPeekList
                      products={listed}
                      emptyText={`No products in ${group.name}.`}
                    />
                  )
                : null}
              </section>
            );
          })}
        </div>
      ) : (
        <div style={emptyStyle}>
          {groups.length ? "No product groups match your search." : "No product groups yet."}
        </div>
      )}

      <div style={footerStyle}>
        <Button
          testID="bulk-product-group-action"
          title="New product group"
          icon="add"
          onPress={openCreate}
          fullWidth
        />
      </div>

      <AppModal
        testID="product-group-editor"
        visible={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={editor ? "Edit product group" : "New product group"}
      >
        <Input
          testID="product-group-name-input"
          label="Group name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Plumbing essentials"
          autoCapitalize="words"
        />
        <div style={selectionStyle}>
          {selected.length} selected; choose at least 2 products
        </div>
        <Input
          testID="group-product-search"
          value={productQuery}
          onChangeText={setProductQuery}
          placeholder="Search products"
        />
        <div style={productListStyle}>
          {filteredProducts.map((product) => {
            const checked = selected.includes(product.id);
            return (
              <button
                key={product.id}
                type="button"
                data-testid={`group-product-${product.id}`}
                aria-pressed={checked}
                onClick={() => toggleProduct(product.id)}
                style={productStyle}
              >
                <span style={checkboxStyle(checked)}>
                  {checked ? <Icon name="checkmark" size={15} color="#FFFFFF" /> : null}
                </span>
                <span style={mainStyle}>
                  <span style={productNameStyle}>{product.name}</span>
                  <span style={productCodeStyle}>{product.productCode || "Legacy product"}</span>
                </span>
              </button>
            );
          })}
        </div>
        <Button
          testID="save-product-group"
          title={editor ? "Save changes" : "Create group"}
          onPress={() => void save()}
          loading={saving}
          disabled={selected.length < 2}
          fullWidth
        />
      </AppModal>
      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete ${deleteTarget?.name || "group"}`}
        message="Deletes this product group and all products in it."
        confirmLabel="Delete group and products"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(credentials) => void confirmDeleteGroup(credentials)}
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
  width: 36,
  height: 36,
  padding: 4,
  border: 0,
  borderRadius: radii.sm,
  backgroundColor: "transparent",
  cursor: "pointer",
  flexShrink: 0,
};

const controlsStyle: React.CSSProperties = {
  padding: `${spacing.md}px ${spacing.lg}px 0`,
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: spacing.xl,
};

const listStyle: React.CSSProperties = {
  padding: `${spacing.md}px ${spacing.lg}px 96px`,
};

const groupStyle: React.CSSProperties = {
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

const mainStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const nameStyle: React.CSSProperties = {
  ...font.title,
  color: colors.textPrimary,
  overflowWrap: "anywhere",
};

const emptyStyle: React.CSSProperties = {
  padding: spacing.xl,
  color: colors.textSecondary,
  textAlign: "center",
};

const footerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 16,
  left: "max(24px, calc((100vw - 760px) / 2))",
  right: "max(24px, calc((100vw - 760px) / 2))",
  zIndex: 2,
};

const selectionStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: 12,
  marginBottom: spacing.sm,
};

const productListStyle: React.CSSProperties = {
  maxHeight: "40vh",
  overflowY: "auto",
  marginBottom: spacing.md,
};

const productStyle: React.CSSProperties = {
  display: "flex",
  width: "100%",
  alignItems: "center",
  gap: spacing.sm,
  padding: `${spacing.sm}px 0`,
  border: 0,
  borderBottom: `1px solid ${colors.border}`,
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
};

function checkboxStyle(checked: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    display: "inline-flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    border: `1px solid ${checked ? colors.primary : colors.borderStrong}`,
    backgroundColor: checked ? colors.primary : colors.surface,
  };
}

const productNameStyle: React.CSSProperties = {
  display: "block",
  color: colors.textPrimary,
  fontWeight: 600,
  overflowWrap: "anywhere",
};

const productCodeStyle: React.CSSProperties = {
  display: "block",
  color: colors.textSecondary,
  fontSize: 12,
  marginTop: 4,
};