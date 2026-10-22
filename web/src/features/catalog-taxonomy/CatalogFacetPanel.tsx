import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listCatalog,
  purgeCatalogByField,
  type CatalogItem,
} from "../../api/endpoints";
import { ApiError } from "../../api/client";
import {
  CountButton as ProductCountButton,
  List as ProductPeekList,
} from "../../components/LinkedProducts";
import { Icon } from "../../components/Icon";
import { PasscodeConfirmModal } from "../../components/PasscodeConfirmModal";
import { Input } from "../../components/UI";
import { colors, font, radii, spacing } from "../../theme";
import { inferProductClass } from "../../utils/infer-product-class";
import { groupCatalogFacet, type CatalogFacet } from "./group-catalog-facet";

type Props = {
  searchPlaceholder: string;
  emptyText: string;
  valueOf: (item: CatalogItem) => string | undefined;
  purgeField: "type" | "productClass";
  testID: string;
  onCatalogChanged?: () => void;
  onError: (message: string) => void;
};

export function CatalogFacetPanel(props: Props) {
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CatalogFacet | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setProducts((await listCatalog()) || []);
    } catch (cause) {
      props.onError(cause instanceof ApiError ? cause.message : "Failed to load products");
    }
  }, [props]);

  useEffect(() => {
    let active = true;
    void listCatalog()
      .then((next) => {
        if (active) setProducts(next || []);
      })
      .catch((cause: unknown) => {
        if (active) {
          props.onError(cause instanceof ApiError ? cause.message : "Failed to load products");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [props]);

  const facets = useMemo(() => groupCatalogFacet(products, props.valueOf), [products, props.valueOf]);
  const filtered = useMemo(
    () => facets.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())),
    [facets, query],
  );

  function productsFor(facet: CatalogFacet) {
    return products.filter((item) => {
      const value = (props.valueOf(item) || inferProductClass(item) || "").toLowerCase();
      return value === facet.id;
    });
  }

  async function confirmPurge(credentials: { contactNumber: string; passcode: string }) {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await purgeCatalogByField({
        ...credentials,
        field: props.purgeField,
        value: deleteTarget.name,
      });
      setDeleteTarget(null);
      await load();
      props.onCatalogChanged?.();
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
        <span className="web-button-spinner" role="status" aria-label="Loading" />
      </div>
    );
  }

  return (
    <>
      <Input
        testID={`${props.testID}-search`}
        value={query}
        onChangeText={setQuery}
        placeholder={props.searchPlaceholder}
        style={{ marginBottom: spacing.sm }}
      />
      <div style={listStyle}>
        {filtered.length ? (
          filtered.map((item) => {
            const open = openId === item.id;
            const listed = productsFor(item);
            return (
              <div key={item.id} data-testid={`${props.testID}-row-${item.id}`} style={cardStyle}>
                <div style={rowStyle}>
                  <div style={rowMainStyle}>
                    <div style={nameStyle}>{item.name}</div>
                    <ProductCountButton
                      count={listed.length}
                      selected={open}
                      onPress={() => setOpenId(open ? null : item.id)}
                      testID={`${props.testID}-products-${item.id}`}
                    />
                  </div>
                  <button
                    type="button"
                    data-testid={`${props.testID}-delete-${item.id}`}
                    aria-label={`Delete products for ${item.name}`}
                    onClick={() => setDeleteTarget(item)}
                    style={iconActionStyle}
                  >
                    <Icon name="trash-outline" size={19} color={colors.error} />
                  </button>
                </div>
                {open ? (
                  <ProductPeekList products={listed} emptyText={`No products in ${item.name}.`} />
                ) : null}
              </div>
            );
          })
        ) : (
          <div style={emptyStyle}>{props.emptyText}</div>
        )}
      </div>
      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete all ${deleteTarget?.name || ""} products`}
        message="Removes every product with this value. Requires admin passcode."
        confirmLabel="Delete products"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(credentials) => void confirmPurge(credentials)}
      />
    </>
  );
}

const centerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: spacing.lg,
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: spacing.sm,
  maxHeight: 420,
  overflowY: "auto",
};

const cardStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: spacing.sm,
  background: colors.surface,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
};

const rowMainStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
const nameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, fontSize: 15 };

const iconActionStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  cursor: "pointer",
  padding: 4,
};

const emptyStyle: React.CSSProperties = {
  color: colors.textSecondary,
  padding: spacing.md,
  textAlign: "center",
};
