/**
 * FEATURE NAME (note in your book): SHELF_PRICE_BOARD
 *
 * What it is: price + discount editing on Subcategories and Product Groups,
 * using the same catalog pricing APIs as Manage Catalog — different layout.
 *
 * To turn off without deleting files:
 *   set SHELF_PRICE_BOARD_ENABLED = false
 *
 * To remove later:
 *   1) delete frontend/src/features/shelf-price-board/
 *   2) remove the SHELF_PRICE_BOARD imports from
 *      app/(admin)/subcategories.tsx and app/(admin)/product-groups.tsx
 *   Manage Catalog pricing stays; only this extra board goes away.
 */
// FEATURE: shelf-price-board
export const SHELF_PRICE_BOARD_ENABLED = true;
