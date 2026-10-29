import mockData from '../../mocks/mockData.json';
import type { ProductVariant } from './catalogModels';
import type { FittingCategory, FittingGroup, FittingProduct } from './fittingsModels';

/**
 * Flutter `_FittingCardGroup` (fittings_category_screen.dart) — a
 * product family card, tagged with its category so the configurator can offer
 * sibling families of the same category.
 */
export interface FittingCardGroup {
  category: FittingCategory;
  group: FittingGroup;
}

/** Flutter getter `unit` — the sheet's unit in lower case ("pcs"). */
export const cardUnit = (card: FittingCardGroup): string =>
  card.group.products[0].unit.toLowerCase();

export const cardMinPrice = (card: FittingCardGroup): number =>
  Math.min(...card.group.products.map((p) => p.price));

export const cardCatalogueNumbers = (card: FittingCardGroup): string =>
  card.group.products.map((p) => p.catalogueNo).join(', ');

/**
 * Flutter `_variantFor` — maps a mock product into a cart `ProductVariant`.
 * The catalogue number takes the brand slot so cart lines read
 * "FTU1C015 CPVC Union ...".
 */
export function fittingVariantFor(
  product: FittingProduct,
  card: FittingCardGroup,
): ProductVariant {
  const id = product.catalogueNo.replace(/ /g, '').toLowerCase();
  const specifications: Record<string, string> = {
    'Catalogue No.': product.catalogueNo,
    ...product.specs,
  };
  if (product.hsnCode != null) specifications['HSN Code'] = product.hsnCode;
  if (product.packingQty != null) {
    specifications['Packing'] = `${product.packingQty} ${product.unit}`;
  }

  return {
    id: `fitt-${id}`,
    productId: `fitt-product-${id}`,
    productName: `${product.productName} (${product.variant})`,
    sku: product.catalogueNo,
    brandId: id,
    brandName: product.catalogueNo,
    categoryId: mockData.catalog.fittingsCategoryId,
    categoryName: mockData.catalog.fittingsCategoryName,
    subCategoryId: card.category.id,
    subCategoryName: card.category.name,
    description: card.group.name,
    price: product.price,
    unit: cardUnit(card),
    icon: card.category.icon,
    rating: 0,
    reviewCount: 0,
    stockStatus: 'inStock',
    specifications,
    imageAsset: card.category.imageAsset,
    mrp: product.price,
    minimumOrderQuantity: 1,
  };
}
