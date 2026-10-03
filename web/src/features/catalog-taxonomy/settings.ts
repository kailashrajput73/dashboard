import { storage } from "../../utils/storage";

const TYPE_KEY = "settings:showProductType";
const CLASS_KEY = "settings:showProductClass";

export type TaxonomyTabs = {
  showProductType: boolean;
  showProductClass: boolean;
};

export const DEFAULT_TAXONOMY_TABS: TaxonomyTabs = {
  showProductType: true,
  showProductClass: true,
};

export async function getTaxonomyTabs(): Promise<TaxonomyTabs> {
  const [showProductType, showProductClass] = await Promise.all([
    storage.getItem(TYPE_KEY, DEFAULT_TAXONOMY_TABS.showProductType),
    storage.getItem(CLASS_KEY, DEFAULT_TAXONOMY_TABS.showProductClass),
  ]);
  return {
    showProductType: showProductType !== false,
    showProductClass: showProductClass !== false,
  };
}

export async function setTaxonomyTabs(next: TaxonomyTabs): Promise<void> {
  await Promise.all([
    storage.setItem(TYPE_KEY, next.showProductType),
    storage.setItem(CLASS_KEY, next.showProductClass),
  ]);
}
