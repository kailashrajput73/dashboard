import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ErrorModal, Header, Input } from "../../components/UI";
import { colors, font, radii, spacing } from "../../theme";
import { inferProductClass } from "../../utils/infer-product-class";
import { groupCatalogFacet, type CatalogFacet } from "./group-catalog-facet";

export function CatalogFacetPage(props: {
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  valueOf: (item: CatalogItem) => string | undefined;
  purgeField?: "type" | "productClass";
  testID: string;
}) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogFacet | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setProducts((await listCatalog()) || []);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Failed to load products",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listCatalog()
      .then((nextProducts) => {
        if (active) setProducts(nextProducts || []);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Failed to load products",
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

  const facets = useMemo(
    () => groupCatalogFacet(products, props.valueOf),
    [products, props.valueOf],
  );
  const filtered = useMemo(
    () =>
      facets.filter((item) =>
        item.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [facets, query],
  );

  function productsFor(facet: CatalogFacet) {
    return products.filter((item) => {
      const value = (
        props.valueOf(item) ||
        inferProductClass(item) ||
        ""
      ).toLowerCase();
      return value === facet.id;
    });
  }

  async function confirmPurge(credentials: {
    contactNumber: string;
    passcode: string;
  }) {
    if (!deleteTarget || !props.purgeField) return;
    setDeleting(true);
    try {
      const result = await purgeCatalogByField({
        ...credentials,
        field: props.purgeField,
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
        title={props.title}
        subtitle={`${filtered.length} of ${facets.length}`}
        onBack={() => navigate(-1)}
      />
      <div style={controlsStyle}>
        <Input
          testID={`${props.testID}-search`}
          value={query}
          onChangeText={setQuery}
          placeholder={props.searchPlaceholder}
          style={{ marginBottom: spacing.sm }}
        />
      </div>
      {loading ? (
        <div style={centerStyle}>
          <span
            className="web-button-spinner"
            role="status"
            aria-label="Loading"
          />
        </div>
      ) : (
        <div style={listStyle}>
          {filtered.length ? (
            filtered.map((item) => {
              const open = openId === item.id;
              const listed = productsFor(item);
              return (
                <div
                  key={item.id}
                  data-testid={`${props.testID}-row-${item.id}`}
                  style={cardStyle}
                >
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
                    {props.purgeField ? (
                      <button
                        type="button"
                        data-testid={`${props.testID}-delete-${item.id}`}
                        aria-label={`Delete products for ${item.name}`}
                        onClick={() => setDeleteTarget(item)}
                        style={iconActionStyle}
                      >
                        <Icon name="trash-outline" size={19} color={colors.error} />
                      </button>
                    ) : null}
                  </div>
                  {open ? (
                    <ProductPeekList
                      products={listed}
                      emptyText={`No products in ${item.name}.`}
                    />
                  ) : null}
                </div>
              );
            })
          ) : (
            <div style={emptyStyle}>{props.emptyText}</div>
          )}
        </div>
      )}
      <PasscodeConfirmModal
        visible={!!deleteTarget}
        title={`Delete all ${deleteTarget?.name || ""} products`}
        message="Removes every product with this value. Requires admin passcode."
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

const rowMainStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const nameStyle: React.CSSProperties = {
  ...font.title,
  color: colors.textPrimary,
};

const iconActionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  border: 0,
  backgroundColor: "transparent",
  color: colors.error,
  cursor: "pointer",
  flexShrink: 0,
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  color: colors.textSecondary,
  padding: spacing.xl,
};