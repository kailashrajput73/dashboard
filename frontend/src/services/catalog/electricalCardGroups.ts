import mockData from '../../mocks/mockData.json';
import type { ProductVariant } from './catalogModels';
import type { ElectricalCategory, ElectricalGroup, ElectricalProduct } from './electricalsModels';

/**
 * Flutter `_ElectricalCardGroup` (electricals_category_screen.dart) — a
 * product family card, tagged with its category so the configurator can offer
 * sibling families of the same category.
 */
export interface ElectricalCardGroup {
  category: ElectricalCategory;
  group: ElectricalGroup;
}

/** Flutter getter `unit` — the sheet's unit in lower case ("pcs"). */
export const cardUnit = (card: ElectricalCardGroup): string =>
  card.group.products[0].unit.toLowerCase();

export const cardMinPrice = (card: ElectricalCardGroup): number =>
  Math.min(...card.group.products.map((p) => p.price));

export const cardCatalogueNumbers = (card: ElectricalCardGroup): string =>
  card.group.products.map((p) => p.catalogueNo).join(', ');

/**
 * Flutter `_variantFor` — maps a mock product into a cart `ProductVariant`.
 * The catalogue number takes the brand slot so cart lines read
 * "RF 1603 L.T. Control ...".
 */
export function electricalVariantFor(
  product: ElectricalProduct,
  card: ElectricalCardGroup,
): ProductVariant {
  const id = product.catalogueNo.replace(/ /g, '').toLowerCase();
  const specifications: Record<string, string> = {
    'Catalogue No.': product.catalogueNo,
    ...product.specs,
  };
  if (product.hsnCode != null) specifications['HSN Code'] = product.hsnCode;
  specifications['Packing'] = `${product.packingQty} ${product.unit}`;

  return {
    id: `elec-${id}`,
    productId: `elec-product-${id}`,
    productName: `${product.productName} (${product.variant})`,
    sku: product.catalogueNo,
    brandId: id,
    brandName: product.catalogueNo,
    categoryId: mockData.catalog.electricalsLightsCategoryId,
    categoryName: mockData.catalog.electricalsLightsCategoryName,
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
