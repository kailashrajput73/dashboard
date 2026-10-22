import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createProductGroup,
  deleteProductGroupCascade,
  listCatalog,
  listProductGroups,
  updateProductGroup,
  type CatalogItem,
  type ProductGroup,
} from "../../../api/endpoints";
import { ApiError } from "../../../api/client";
import { Icon } from "../../../components/Icon";
import {
  CountButton as ProductCountButton,
  List as ProductPeekList,
} from "../../../components/LinkedProducts";
import { PasscodeConfirmModal } from "../../../components/PasscodeConfirmModal";
import { AppModal, Button, Input } from "../../../components/UI";
import {
  SHELF_PRICE_BOARD_ENABLED,
  ShelfPriceBoard,
} from "../../../features/shelf-price-board";
import { colors, font, radii, spacing } from "../../../theme";

type Props = {
  onChanged: () => void;
  onError: (message: string) => void;
};

export function ManageProductGroupsPanel(props: Props) {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editor, setEditor] = useState<ProductGroup | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [nextGroups, nextProducts] = await Promise.all([listProductGroups(), listCatalog()]);
    setGroups(nextGroups || []);
    setProducts(nextProducts || []);
  }, []);

  useEffect(() => {
    let active = true;
    void load()
      .catch((cause) => {
        if (active) props.onError(cause instanceof ApiError ? cause.message : "Failed to load groups");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, props]);

  const filteredGroups = useMemo(
    () => groups.filter((group) => group.name.toLowerCase().includes(query.trim().toLowerCase())),
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
      props.onError("A product group needs a name and at least two products.");
      return;
    }
    setSaving(true);
    try {
      if (editor) {
        await updateProductGroup(editor.id, { name: name.trim(), productIds: selected });
      } else {
        await createProductGroup({ name: name.trim(), productIds: selected });
      }
      setEditor(undefined);
      await load();
      props.onChanged();
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Could not save product group");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(credentials: { contactNumber: string; passcode: string }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteProductGroupCascade(deleteTarget.id, credentials);
      setDeleteTarget(null);
      await load();
      props.onChanged();
      props.onError(`Deleted group and ${result.productsRemoved} product(s).`);
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Could not delete product group");
    } finally {
      setDeleting(false);
    }
  }

  function toggleProduct(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  if (loading) {
    return (
      <div style={centerStyle}>
        <span className="web-button-spinner" role="status" aria-label="Loading product groups" />
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: spacing.sm }}>
        <Button testID="open-add-product-group" title="Add new" size="sm" onPress={openCreate} />
      </div>
      <Input
        testID="product-group-search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search product groups"
        style={{ marginBottom: spacing.sm }}
      />
      <div style={listStyle}>
        {filteredGroups.length ? (
          filteredGroups.map((group) => {
            const open = openId === group.id;
            const listed = productsFor(group);
            return (
              <section key={group.id} style={cardStyle} data-testid={`product-group-row-${group.id}`}>
                <div style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                    onClick={() => openEdit(group)}
                    style={iconBtn}
                  >
                    <Icon name="create-outline" size={19} color={colors.primary} />
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-product-group-${group.id}`}
                    onClick={() => setDeleteTarget(group)}
                    style={iconBtn}
                  >
                    <Icon name="trash-outline" size={19} color={colors.error} />
                  </button>
                </div>
                {open ? (
                  SHELF_PRICE_BOARD_ENABLED ? (
                    <ShelfPriceBoard title={group.name} products={listed} onSaved={() => void load()} />
                  ) : (
                    <ProductPeekList products={listed} emptyText={`No products in ${group.name}.`} />
                  )
                ) : null}
              </section>
            );
          })
        ) : (
          <p style={emptyStyle}>
            {groups.length ? "No product groups match your search." : "No product groups yet."}
          </p>
        )}
      </div>
      <AppModal
        testID="product-group-editor"
        visible={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={editor ? "Edit product group" : "New product group"}
        wide
      >
        <Input testID="product-group-name-input" label="Group name" value={name} onChangeText={setName} />
        <div style={selectionStyle}>{selected.length} selected; choose at least 2 products</div>
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
                style={productRowStyle}
              >
                <span style={checkboxStyle(checked)}>
                  {checked ? <Icon name="checkmark" size={15} color="#FFFFFF" /> : null}
                </span>
                <span>
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
        onConfirm={confirmDelete}
      />
    </>
  );
}

function checkboxStyle(checked: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: `2px solid ${checked ? colors.primary : colors.borderStrong}`,
    background: checked ? colors.primary : colors.bg,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
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
const nameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, fontSize: 15 };
const iconBtn: React.CSSProperties = { border: 0, background: "transparent", cursor: "pointer", padding: 4 };
const emptyStyle: React.CSSProperties = { color: colors.textSecondary, textAlign: "center" };
const selectionStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 13, margin: `${spacing.sm}px 0` };
const productListStyle: React.CSSProperties = {
  maxHeight: 280,
  overflowY: "auto",
  border: `1px solid ${colors.border}`,
  borderRadius: radii.sm,
  marginBottom: spacing.md,
};
const productRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  width: "100%",
  textAlign: "left",
  border: 0,
  borderBottom: `1px solid ${colors.border}`,
  background: colors.surface,
  padding: spacing.sm,
  cursor: "pointer",
};
const productNameStyle: React.CSSProperties = { display: "block", color: colors.textPrimary, fontWeight: 600 };
const productCodeStyle: React.CSSProperties = { display: "block", color: colors.textMuted, fontSize: 12 };
