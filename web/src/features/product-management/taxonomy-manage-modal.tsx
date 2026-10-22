import { useCallback, useEffect, useState } from "react";
import {
  listBrands,
  listCategories,
  listCatalog,
  listSubcategories,
  type Brand,
  type CatalogItem,
  type Category,
  type Subcategory,
} from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { CatalogFacetPanel } from "../catalog-taxonomy/CatalogFacetPanel";
import { inferProductClass } from "../../utils/infer-product-class";
import { AppModal, ErrorModal } from "../../components/UI";
import { ManageProductGroupsPanel } from "./panels/manage-product-groups-panel";
import { ManageProductTypesPanel } from "./panels/manage-product-types-panel";
import { ManageSubcategoriesPanel } from "./panels/manage-subcategories-panel";
import { ManageTaxonomyListPanel } from "./panels/manage-taxonomy-list-panel";

export type TaxonomyDimension =
  | "category"
  | "subcategory"
  | "productType"
  | "productClass"
  | "brand"
  | "productGroup";

const titles: Record<TaxonomyDimension, string> = {
  category: "Categories",
  subcategory: "Subcategories",
  productType: "Product types",
  productClass: "Product classes",
  brand: "Brands",
  productGroup: "Product groups",
};

type Props = {
  dimension: TaxonomyDimension | null;
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
  onOpenBatchImport?: () => void;
};

export function TaxonomyManageModal(props: Props) {
  const dimension = props.dimension;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);

  const reload = useCallback(async () => {
    if (!dimension) return;
    setLoading(true);
    try {
      const catalog = (await listCatalog()) || [];
      setProducts(catalog);
      if (
        dimension === "category" ||
        dimension === "brand" ||
        dimension === "subcategory"
      ) {
        setCategories((await listCategories()) || []);
      }
      if (dimension === "subcategory") {
        setSubcategories((await listSubcategories()) || []);
      }
      if (dimension === "brand") {
        setBrands((await listBrands()) || []);
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load data");
    } finally {
      setLoading(false);
    }
  }, [dimension]);

  useEffect(() => {
    if (props.visible && dimension) {
      setError(null);
      if (dimension === "productType" || dimension === "productGroup" || dimension === "productClass") {
        setLoading(false);
      } else {
        void reload();
      }
    }
  }, [props.visible, dimension, reload]);

  function handleChanged() {
    void reload();
    props.onChanged();
  }

  if (!dimension) return null;

  return (
    <>
      <AppModal
        testID={`pm-manage-modal-${dimension}`}
        visible={props.visible}
        onClose={props.onClose}
        title={titles[dimension]}
        wide
      >
        {loading && dimension !== "productType" && dimension !== "productGroup" && dimension !== "productClass" ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <span className="web-button-spinner" role="status" aria-label="Loading" />
          </div>
        ) : null}
        {!loading && dimension === "category" ? (
          <ManageTaxonomyListPanel
            kind="category"
            categories={categories}
            brands={brands}
            products={products}
            onChanged={handleChanged}
            onError={setError}
          />
        ) : null}
        {!loading && dimension === "brand" ? (
          <ManageTaxonomyListPanel
            kind="brand"
            categories={categories}
            brands={brands}
            products={products}
            onChanged={handleChanged}
            onError={setError}
          />
        ) : null}
        {!loading && dimension === "subcategory" ? (
          <ManageSubcategoriesPanel
            categories={categories}
            subcategories={subcategories}
            products={products}
            onChanged={handleChanged}
            onError={setError}
            onOpenBatchImport={
              props.onOpenBatchImport
                ? () => {
                    props.onClose();
                    props.onOpenBatchImport?.();
                  }
                : undefined
            }
          />
        ) : null}
        {dimension === "productType" ? (
          <ManageProductTypesPanel onChanged={handleChanged} onError={setError} />
        ) : null}
        {dimension === "productClass" ? (
          <CatalogFacetPanel
            testID="product-class"
            searchPlaceholder="Search product classes"
            emptyText="No product classes match your search."
            valueOf={(item) => inferProductClass(item)}
            purgeField="productClass"
            onCatalogChanged={handleChanged}
            onError={setError}
          />
        ) : null}
        {dimension === "productGroup" ? (
          <ManageProductGroupsPanel onChanged={handleChanged} onError={setError} />
        ) : null}
      </AppModal>
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </>
  );
}
