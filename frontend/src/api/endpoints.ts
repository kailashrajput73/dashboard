// ============================================================================
// Typed API endpoints — thin wrappers around apiRequest().
//
// NOTE (DB): Every function below documents the exact MongoDB collection and
//            fields the teammate's backend interacts with, so the user can
//            verify collections in Compass/mongosh without reading code.
// ============================================================================

import { apiRequest } from "./client";

// ---------- Types (mirror teammate's schema) ----------

export type Category = {
  id: string;
  name: string;
  isDefault?: boolean;
  isActive: boolean;
  productCount: number;
};

export type Brand = { id: string; name: string; isActive: boolean; productCount: number };
export type ProductGroup = { id: string; name: string; productIds: string[]; productCount: number };
export type RackSlot = { code: string; productId: string | null };
export type Rack = { id: string; name: string; rows: number; columns: number; slots: RackSlot[] };
export type PurchaseLine = { productCode: string; quantity: number; listPrice: number; purchaseDiscount?: number; rackId?: string; rackSlot?: string };
export type Purchase = { id: string; lines: (PurchaseLine & { productId: string; productName: string })[]; createdAt: string };
export type RfqLine = { productCode: string; quantity: number; productId?: string; productName?: string; unitPrice?: number };
export type Rfq = { id: string; partnerId: string; lines: RfqLine[]; status: string; specialDiscountPercent: number; rewardPoints: number; deliveryMode: "storePickup" | "homeDelivery"; scheduledAt?: string; createdAt: string; history?: any[] };
export type Dispatch = { id: string; sourceRfqId?: string; customerName?: string; customerPhone?: string; lines: RfqLine[]; createdAt: string };
export type InventoryRow = { productId: string; productCode?: string; name: string; category?: string; brand?: string; stock: number; reorderLevel: number; unitCost: number; valuation: number; rackName?: string; rackSlot?: string };
export type InventoryTransaction = { type: "in" | "out"; referenceId: string; productCode: string; productName: string; quantity: number; at: string };
export type Partner = { id: string; name: string; phone: string; address?: string; businessName?: string; pincode?: string; city?: string; area?: string; salesManager?: string; documents: string[]; kycStatus: "pending" | "approved" | "rejected"; locationVerified: boolean; appActive?: boolean; rewardBalance?: number; rfqCount?: number; salesPerformance?: { approvedCount: number; approvedValue: number } };
export type RewardWallet = { balance: number; entries: { id: string; requesterId: string; quotationId: string; points: number; type: string; createdAt: string }[] };
export type TeamUser = { id: string; name: string; contactNumber: string; role: "admin" | "store_manager" | "staff"; permissions: string[]; isActive: boolean; createdAt?: string };

export type Subcategory = {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  productCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  standardRate: number;
  brandId?: string;
  brand?: string;
  productCode?: string;
  qrCode?: string;
  aliases?: string[];
  multilingualNames?: Record<string, string>;
  displaySequence?: number;
  reorderLevel?: number;
  regularDiscount?: number;
  subcategoryId?: string;
  productGroupIds?: string[];
  stock?: number;
  rackId?: string;
  rackName?: string;
  rackSlot?: string;
  imageUrl?: string;
  imageName?: string;
  productName?: string;
  type?: string;
  productGroup?: string;
  sizeMm?: number;
  sizeInch?: string;
  length?: string;
  mrp?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  discount?: number;
  isActive?: boolean;
  priceUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminSession = {
  token: string;
  adminId: string;
  companyName: string;
  contactNumber: string;
  gstin: string;
};

export type MoneyConfig = {
  id?: string;
  adminId: string;
  discountPercent: number;
  gstPercent: number;
  specialDiscountPercent: number;
  showDiscount: boolean;
  showGst: boolean;
  showSpecialDiscount: boolean;
};

export type ImportRow = {
  name: string;
  category?: string;
  unit: string;
  standardRate: number;
  type?: string;
  productGroup?: string;
  brand?: string;
  productName?: string;
  sizeMm?: number;
  sizeInch?: string;
  productCode?: string;
  length?: string;
  mrp?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  discount?: number;
  imageUrl?: string;
  isActive?: boolean;
};

export type ImportResult = {
  inserted: number;
  updated?: number;
  skipped: number;
  categoryMode: string;
};

// ---------- Auth ----------

// NOTE (DB): writes to `users` collection with role="admin" + passcodeHash.
export function registerAdmin(body: {
  companyName: string;
  gstin: string;
  contactNumber: string;
  passcode: string;
}) {
  return apiRequest<AdminSession>("/auth/admin/register", {
    method: "POST",
    body,
    auth: false,
  });
}

// NOTE (DB): reads from `users` collection, verifies bcrypt(passcode) against passcodeHash.
export function loginAdmin(body: { contactNumber: string; passcode: string }) {
  return apiRequest<AdminSession>("/auth/admin/login", {
    method: "POST",
    body,
    auth: false,
  });
}

// ---------- Categories ----------

// NOTE (DB): reads `categories` collection. Default set seeded on first use.
export function listCategories() {
  return apiRequest<Category[]>("/categories");
}

// NOTE (DB): inserts into `categories` with { id, name, isDefault:false }.
export function createCategory(name: string) {
  return apiRequest<Category>("/categories", {
    method: "POST",
    body: { name },
  });
}

export function updateCategory(id: string, body: { name: string; isActive: boolean }) {
  return apiRequest<Category>(`/categories/${id}`, {
    method: "PUT",
    body,
  });
}

export function listBrands() { return apiRequest<Brand[]>("/brands"); }
export function createBrand(name: string) { return apiRequest<Brand>("/brands", { method: "POST", body: { name } }); }
export function updateBrand(id: string, body: { name: string; isActive: boolean }) { return apiRequest<Brand>(`/brands/${id}`, { method: "PUT", body }); }

export function listProductGroups() { return apiRequest<ProductGroup[]>("/product-groups"); }
export function createProductGroup(body: { name: string; productIds: string[] }) { return apiRequest<ProductGroup>("/product-groups", { method: "POST", body }); }
export function updateProductGroup(id: string, body: { name: string; productIds: string[] }) { return apiRequest<ProductGroup>(`/product-groups/${id}`, { method: "PUT", body }); }
export function deleteProductGroup(id: string) { return apiRequest<{ deleted: boolean; id: string }>(`/product-groups/${id}`, { method: "DELETE" }); }
export function listRacks() { return apiRequest<Rack[]>("/racks"); }
export function createRack(body: { name: string; rows: number; columns: number }) { return apiRequest<Rack>("/racks", { method: "POST", body }); }
export function deleteRack(id: string) { return apiRequest<{ deleted: boolean; id: string }>(`/racks/${id}`, { method: "DELETE" }); }
export function assignRackSlot(rackId: string, body: { productId: string; slotCode: string }) { return apiRequest<{ rackId: string; slotCode: string }>(`/racks/${rackId}/assign`, { method: "PUT", body }); }
export function listRackProducts(id: string) { return apiRequest<CatalogItem[]>(`/racks/${id}/products`); }
export function listPurchases() { return apiRequest<Purchase[]>("/purchases"); }
export function createPurchase(lines: PurchaseLine[]) { return apiRequest<Purchase>("/purchases", { method: "POST", body: { lines } }); }
export function listRfqs(params?: { status?: string; search?: string }) { return apiRequest<Rfq[]>("/rfqs", { query: params }); }
export function createRfq(body: { partnerId: string; lines: RfqLine[]; deliveryMode: "storePickup" | "homeDelivery"; scheduledAt?: string }) { return apiRequest<Rfq>("/rfqs", { method: "POST", body }); }
export function updateRfq(id: string, body: { partnerId: string; lines: RfqLine[]; deliveryMode: "storePickup" | "homeDelivery"; scheduledAt?: string }) { return apiRequest<Rfq>(`/rfqs/${id}`, { method: "PUT", body }); }
export function approveRfq(id: string, body: { approved: boolean; specialDiscountPercent: number; rewardPoints: number; deliveryMode?: "storePickup" | "homeDelivery"; scheduledAt?: string }) { return apiRequest<Rfq>(`/rfqs/${id}/approve`, { method: "POST", body }); }
export function rfqHistory(id: string) { return apiRequest<any[]>(`/rfqs/${id}/history`); }
export function listDispatches() { return apiRequest<Dispatch[]>("/dispatches"); }
export function createDispatch(body: { lines: RfqLine[]; sourceRfqId?: string; customerName?: string; customerPhone?: string }) { return apiRequest<Dispatch>("/dispatches", { method: "POST", body }); }
export function listInventory() { return apiRequest<InventoryRow[]>("/inventory"); }
export function listLowStock() { return apiRequest<InventoryRow[]>("/inventory/low-stock"); }
export function listInventoryTransactions() { return apiRequest<InventoryTransaction[]>("/inventory/transactions"); }
export function registerPartner(body: Omit<Partner, "id" | "kycStatus" | "locationVerified" | "rewardBalance" | "rfqCount">) { return apiRequest<Partner>("/partners/register", { method: "POST", body }); }
export function listPartners(params?: { search?: string; kyc_status?: string; sales_manager?: string }) { return apiRequest<Partner[]>("/partners", { query: params }); }
export function reviewPartnerKyc(id: string, body: { approved: boolean; locationVerified: boolean; rejectionReason?: string }) { return apiRequest<Partner>(`/partners/${id}/kyc`, { method: "PUT", body }); }
export function getPartnerRewards(id: string) { return apiRequest<RewardWallet>(`/partners/${id}/rewards`); }
export function listTeamUsers() { return apiRequest<TeamUser[]>("/team/users"); }
export function createTeamUser(body: { name: string; contactNumber: string; role: TeamUser["role"]; passcode: string; permissions?: string[] }) { return apiRequest<TeamUser>("/team/users", { method: "POST", body }); }
export function updateTeamUser(id: string, body: { name: string; contactNumber: string; role: TeamUser["role"]; isActive: boolean; permissions?: string[] }) { return apiRequest<TeamUser>(`/team/users/${id}`, { method: "PUT", body }); }

export function listSubcategories(categoryId?: string) {
  return apiRequest<Subcategory[]>("/subcategories", { query: categoryId ? { category_id: categoryId } : undefined });
}

export function createSubcategory(body: { name: string; categoryId: string }) {
  return apiRequest<Subcategory>("/subcategories", { method: "POST", body });
}

export function updateSubcategory(id: string, body: { name: string; categoryId: string }) {
  return apiRequest<Subcategory>(`/subcategories/${id}`, { method: "PUT", body });
}

export function deleteSubcategory(id: string) {
  return apiRequest<{ deleted: boolean; id: string }>(`/subcategories/${id}`, { method: "DELETE" });
}

export function importSubcategories(items: { name: string; categoryId?: string; category?: string }[]) {
  return apiRequest<{ inserted: number; skipped: number }>("/subcategories/import", { method: "POST", body: { items } });
}

// ---------- Catalog ----------

// NOTE (DB): reads `catalog`; optional `category` filters by exact match.
export function listCatalog(category?: string, search?: string, groupId?: string, filters?: {
  type?: string;
  brand?: string;
  productGroup?: string;
  sizeMm?: number;
}) {
  return apiRequest<CatalogItem[]>("/catalog", {
    query: {
      category: category && category !== "All" ? category : undefined,
      search,
      group_id: groupId,
      type: filters?.type,
      brand: filters?.brand,
      product_group: filters?.productGroup,
      size_mm: filters?.sizeMm,
    },
  });
}

// NOTE (DB): inserts into `catalog` with { id, name, category, unit, standardRate, createdAt, updatedAt }.
export function createCatalogItem(body: {
  name: string;
  category: string;
  unit: string;
  standardRate: number;
  brandId: string;
  subcategoryId?: string;
  aliases?: string[];
  multilingualNames?: Record<string, string>;
  displaySequence?: number;
  reorderLevel?: number;
  regularDiscount?: number;
  productGroupIds?: string[];
  imageUrl?: string;
  imageName?: string;
  productCode?: string;
  productName?: string;
  type?: string;
  productGroup?: string;
  sizeMm?: number;
  sizeInch?: string;
  length?: string;
  brand?: string;
  mrp?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  discount?: number;
  isActive?: boolean;
}) {
  return apiRequest<CatalogItem>("/catalog", { method: "POST", body });
}

// NOTE (DB): updates `catalog` by id.
export function updateCatalogItem(id: string, body: {
  name: string;
  category: string;
  unit: string;
  standardRate: number;
  brandId: string;
  subcategoryId?: string;
  aliases?: string[];
  multilingualNames?: Record<string, string>;
  displaySequence?: number;
  reorderLevel?: number;
  regularDiscount?: number;
  productGroupIds?: string[];
  imageUrl?: string;
  imageName?: string;
  productCode?: string;
  productName?: string;
  type?: string;
  productGroup?: string;
  sizeMm?: number;
  sizeInch?: string;
  length?: string;
  brand?: string;
  mrp?: number;
  sellingPrice?: number;
  purchasePrice?: number;
  discount?: number;
  isActive?: boolean;
}) {
  return apiRequest<CatalogItem>(`/catalog/${id}`, { method: "PUT", body });
}

// NOTE (DB): deletes `catalog` document by id.
export function deleteCatalogItem(id: string) {
  return apiRequest<{ deleted: boolean; id: string }>(`/catalog/${id}`, {
    method: "DELETE",
  });
}

// NOTE (DB): bulk-inserts to `catalog`. Category routing per `categoryMode`.
export function importCatalog(body: {
  items: ImportRow[];
  categoryMode: "fromCsv" | "overrideExisting" | "overrideNew";
  overrideCategory: string;
}) {
  return apiRequest<ImportResult>("/catalog/import", { method: "POST", body });
}

// ---------- Money Config ----------

// NOTE (DB): reads `money_config` by adminId. Auto-creates defaults if missing.
export function getMoneyConfig(adminId: string) {
  return apiRequest<MoneyConfig>(`/money-config/${adminId}`);
}

// NOTE (DB): upserts `money_config` by adminId with the full config payload.
export function updateMoneyConfig(adminId: string, body: Omit<MoneyConfig, "id" | "adminId">) {
  return apiRequest<MoneyConfig>(`/money-config/${adminId}`, {
    method: "PUT",
    body,
  });
}
