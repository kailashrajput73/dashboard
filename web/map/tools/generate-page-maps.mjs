#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const PAGES_DIR = path.join(ROOT, "src/pages");
const FEATURES_DIR = path.join(ROOT, "src/features");
const OUT_PAGES = path.join(ROOT, "map/pages");
const OUT_FEATURES = path.join(ROOT, "map/features");

const ROUTES = {
  LoginPage: { route: "/login", sow: "Auth", admin: "login.md" },
  RegisterPage: { route: "/register", sow: "Auth", admin: "register.md" },
  DashboardPage: { route: "/dashboard", sow: "Dashboard snapshot (not full §9 reports)", admin: "dashboard.md" },
  CatalogPage: { route: "/catalog", sow: "Product §4", admin: "catalog.md" },
  CategoriesPage: { route: "/categories", sow: "Category §1", admin: "categories.md" },
  SubcategoriesPage: { route: "/subcategories", sow: "Subcategory §2", admin: "subcategories.md" },
  ProductTypesPage: { route: "/product-types", sow: "Taxonomy (partner browse)", admin: "product-types.md" },
  ProductClassesPage: { route: "/product-classes", sow: "Taxonomy (partner browse)", admin: "product-classes.md", delegate: "features/catalog-facet-page.md" },
  BrandsPage: { route: "/brands", sow: "Brand §3", admin: "brands.md" },
  ProductGroupsPage: { route: "/product-groups", sow: "Product group §5", admin: "product-groups.md" },
  SpreadsheetImportsPage: { route: "/csv-import", sow: "Bulk import hub", admin: "spreadsheet-imports.md" },
  CatalogImportPage: { route: "/import-products, /import-products-batch, /import-prices, /import-stock", sow: "Product import", admin: "spreadsheet-imports.md" },
  RacksPage: { route: "/racks", sow: "Rack §6", admin: "racks.md" },
  PurchasesPage: { route: "/purchases", sow: "Purchase §7", admin: "purchases.md" },
  InventoryPage: { route: "/inventory", sow: "Stock §8", admin: "inventory.md" },
  PartnersPage: { route: "/partners", sow: "Partner §8–9", admin: "partners.md" },
  RfqsPage: { route: "/rfqs", sow: "RFQ §10", admin: "rfqs.md" },
  DispatchesPage: { route: "/dispatches", sow: "Dispatch", admin: "dispatches.md" },
  ServiceRequestsPage: { route: "/service-requests", sow: "Plumber/electrician §11", admin: "service-requests.md" },
  SettingsPage: { route: "/settings", sow: "Admin utility", admin: "settings.md" },
  TeamPage: { route: "/team", sow: "Team", admin: "team.md" },
};

const API_TO_HTTP = {
  listCatalog: "GET /catalog",
  createCatalogItem: "POST /catalog",
  updateCatalogItem: "PUT /catalog/{id}",
  updateCatalogPricing: "PATCH /catalog/{id}/pricing",
  applyCatalogPricingBulk: "POST /catalog/pricing-bulk",
  deleteCatalogItemSecured: "POST /catalog/{id}/delete-secured",
  listCategories: "GET /categories",
  createCategory: "POST /categories",
  updateCategory: "PUT /categories/{id}",
  deleteCategoryCascade: "POST /categories/{id}/delete-cascade",
  listBrands: "GET /brands",
  createBrand: "POST /brands",
  updateBrand: "PUT /brands/{id}",
  deleteBrandCascade: "POST /brands/{id}/delete-cascade",
  listSubcategories: "GET /subcategories",
  createSubcategory: "POST /subcategories",
  updateSubcategory: "PUT /subcategories/{id}",
  deleteSubcategoryCascade: "POST /subcategories/{id}/delete-cascade",
  importSubcategories: "POST /subcategories/import",
  listProductGroups: "GET /product-groups",
  createProductGroup: "POST /product-groups",
  updateProductGroup: "PUT /product-groups/{id}",
  deleteProductGroupCascade: "POST /product-groups/{id}/delete-cascade",
  listRacks: "GET /racks",
  createRack: "POST /racks",
  deleteRack: "DELETE /racks/{id}",
  assignRackSlot: "PUT /racks/{id}/assign",
  listPurchases: "GET /purchases",
  createPurchase: "POST /purchases",
  listInventory: "GET /inventory",
  listLowStock: "GET /inventory/low-stock",
  listInventoryTransactions: "GET /inventory/transactions",
  listPartners: "GET /partners",
  getPartner: "GET /partners/{id}",
  createPartnerAdmin: "POST /partners",
  reviewPartnerKyc: "PUT /partners/{id}/kyc",
  getPartnerRewards: "GET /partners/{id}/rewards",
  listRfqs: "GET /rfqs",
  createRfq: "POST /rfqs",
  updateRfq: "PUT /rfqs/{id}",
  approveRfq: "POST /rfqs/{id}/approve",
  rfqHistory: "GET /rfqs/{id}/history",
  createDispatch: "POST /dispatches",
  listDispatches: "GET /dispatches",
  listServiceRequests: "GET /service-requests",
  updateServiceRequest: "PATCH /service-requests/{id}",
  listTeamUsers: "GET /team/users",
  createTeamUser: "POST /team/users",
  updateTeamUser: "PUT /team/users/{id}",
  getDashboardSnapshot: "GET /dashboard/snapshot",
  wipeCatalogAll: "POST /catalog/wipe-all",
  purgeCatalogByField: "POST /catalog/purge-by-field",
  loginAdmin: "POST /auth/admin/login",
  registerAdmin: "POST /auth/admin/register",
  importCatalogMaster: "POST /catalog/import/master",
  importCatalogPricing: "POST /catalog/import/pricing",
  importCatalogStock: "POST /catalog/import/stock",
};

const API_RE =
  /\b(list[A-Z]\w+|create[A-Z]\w+|update[A-Z]\w+|delete[A-Z]\w+|import[A-Z]\w*|get[A-Z]\w+|approve[A-Z]\w*|wipe[A-Z]\w*|purge[A-Z]\w*|register[A-Z]\w*|login[A-Z]\w*|rfqHistory|assignRackSlot|applyCatalogPricingBulk|deleteCatalogItemSecured)\s*\(/g;

function slug(name) {
  return name.replace(/Page$/, "").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function scanFile(filePath, relPrefix) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split("\n");
  const funcs = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(/^\s*export default function (\w+)/);
    if (m) funcs.push({ name: m[1], line: i + 1 });
    m = line.match(/^\s*(async )?function (\w+)/);
    if (m && m[2] !== "if") funcs.push({ name: m[2], line: i + 1 });
    m = line.match(/^\s*const (\w+) = useCallback\(async/);
    if (m) funcs.push({ name: `${m[1]} (useCallback)`, line: i + 1 });
    m = line.match(/^\s*const (\w+) = async/);
    if (m) funcs.push({ name: m[1], line: i + 1 });
  }
  const seen = new Set();
  const funcsUnique = funcs.filter((f) => {
    const k = `${f.line}:${f.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const apiCalls = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    API_RE.lastIndex = 0;
    let m;
    while ((m = API_RE.exec(line)) !== null) {
      apiCalls.push({
        fn: m[1],
        http: API_TO_HTTP[m[1]] || "(see endpoints.ts)",
        line: i + 1,
        snippet: line.trim().slice(0, 100),
      });
    }
  }

  const testIds = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/data-testid="([^"]+)"/);
    if (m) {
      const window = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 5)).join("\n");
      const onClick =
        window.match(/onClick=\{([^}]+)\}/)?.[1] ||
        window.match(/onPress=\{([^}]+)\}/)?.[1] ||
        window.match(/onPress=\{\(\) => void (\w+)/)?.[1] ||
        "—";
      testIds.push({ id: m[1], line: i + 1, handler: onClick.trim().replace(/\s+/g, " ").slice(0, 100) });
    }
  }

  const useEffects = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("useEffect(")) useEffects.push({ line: i + 1 });
  }

  const headers = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/<Header[^>]*title=\{?"([^"}\{]+)/);
    if (m) headers.push({ title: m[1], line: i + 1 });
  }

  return {
    rel: `${relPrefix}/${path.basename(filePath)}`,
    lines: lines.length,
    funcs: funcsUnique,
    apiCalls,
    testIds,
    useEffects,
    headers,
  };
}

function buildMd(component, meta, data, extra = "") {
  const mapId = slug(component);
  let md = `# ${mapId}\n\n`;
  md += `| | |\n|---|---|\n`;
  md += `| **Map ID** | \`${mapId}\` |\n`;
  md += `| **Route** | \`${meta.route}\` |\n`;
  md += `| **Source file** | \`${data.rel}\` (${data.lines} lines) |\n`;
  md += `| **SOW** | ${meta.sow} |\n`;
  if (meta.admin) md += `| **Operator guide** | \`migration/admin/${meta.admin}\` |\n`;
  if (meta.delegate) md += `| **Shared UI map** | \`web/map/${meta.delegate}\` |\n`;
  md += `\n`;

  if (extra) md += extra + "\n";

  if (data.headers.length) {
    md += `## Screen blocks (Header titles)\n\n`;
    for (const h of data.headers) {
      md += `- **L${h.line}** — \`${h.title}\`\n`;
    }
    md += `\n`;
  }

  md += `## Load / refresh\n\n`;
  if (data.useEffects.length) {
    for (const u of data.useEffects) {
      md += `- **L${u.line}** \`useEffect\` — initial load or subscribe; read lines below for \`list*\` / \`get*\` calls.\n`;
    }
  } else md += `- No \`useEffect\` in this file (may delegate to a feature component).\n`;
  md += `\n## API calls in this file\n\n`;
  md += `| Line | Function | HTTP | Code line (trimmed) |\n|------|----------|------|---------------------|\n`;
  if (!data.apiCalls.length) md += `| — | — | — | none |\n`;
  for (const c of data.apiCalls) {
    md += `| L${c.line} | \`${c.fn}\` | ${c.http} | \`${c.snippet.replace(/`/g, "'")}\` |\n`;
  }

  md += `\n## Functions in this file (jump by line)\n\n`;
  md += `| Line | Function | What to do here |\n|------|----------|-----------------|\n`;
  for (const f of data.funcs) {
    md += `| L${f.line} | \`${f.name}\` | Open \`${data.rel}\` at this line |\n`;
  }

  md += `\n## Controls: testID → handler line\n\n`;
  md += `| Line | testID | Handler |\n|------|--------|--------|\n`;
  for (const t of data.testIds) {
    md += `| L${t.line} | \`${t.id}\` | \`${t.handler.replace(/`/g, "'")}\` |\n`;
  }

  md += `\n## Your tags (you fill in)\n\n`;
  md += `| testID / block | KEEP / REVIEW / REMOVE / REDESIGN | Notes |\n|----------------|-----------------------------------|-------|\n| | | |\n\n`;
  md += `_Regenerate: \`node web/map/tools/generate-page-maps.mjs\`. Line numbers drift when code changes._\n`;
  return md;
}

function scanAll(dir, relPrefix, outDir, routeKeyFromFile) {
  fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
    const component = file.replace(".tsx", "");
    const data = scanFile(path.join(dir, file), relPrefix);
    const meta = routeKeyFromFile(component) || { route: "?", sow: "?" };
    const md = buildMd(component, meta, data);
    fs.writeFileSync(path.join(outDir, slug(component) + ".md"), md);
    console.log("wrote", path.join(outDir, slug(component) + ".md"));
  }
}

scanAll(PAGES_DIR, "web/src/pages", OUT_PAGES, (c) => ROUTES[c]);

// Feature: CatalogFacetPage
const facetPath = path.join(FEATURES_DIR, "catalog-taxonomy/CatalogFacetPage.tsx");
if (fs.existsSync(facetPath)) {
  const data = scanFile(facetPath, "web/src/features/catalog-taxonomy");
  const enrich = `## Why this exists

Groups **all catalog products** by a field (\`type\` or \`productClass\`) for admin taxonomy cleanup. Used by \`/product-classes\` (and similar pattern elsewhere). **Pain at 1000+ SKUs:** expanding a facet loads an **ungrouped product peek list** (\`LinkedProducts\`) — fine for demo, heavy for production editing.

## Control registry (file + line + function + result)

| Map ref | Block | File:line | Function | Purpose | API / result |
|---------|-------|-----------|----------|---------|--------------|
| \`facet.load\` | Initial load | \`CatalogFacetPage.tsx:47-68\` | \`useEffect\` → \`listCatalog()\` | Fill \`products\` state | GET /catalog — **full catalog in memory** |
| \`facet.search\` | Search input | \`CatalogFacetPage.tsx:127-133\` | \`Input\` onChange → \`setQuery\` | Filter facet **names** client-side | No API |
| \`facet.expand\` | Count chip | \`CatalogFacetPage.tsx:158-163\` | \`ProductCountButton\` → \`setOpenId\` | Toggle \`ProductPeekList\` for one facet | No API |
| \`facet.peek\` | Expanded list | \`CatalogFacetPage.tsx:177-181\` | \`ProductPeekList\` | Show matching products (read-only list) | No API |
| \`facet.purge-open\` | Trash icon | \`CatalogFacetPage.tsx:166-174\` | \`onClick\` → \`setDeleteTarget\` | Open passcode modal | No API |
| \`facet.purge-confirm\` | Passcode modal | \`CatalogFacetPage.tsx:191-198\` | \`confirmPurge\` L93-117 | Delete all products with that type/class | POST /catalog/purge-by-field → reload \`load()\` |

`;
  fs.mkdirSync(OUT_FEATURES, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_FEATURES, "catalog-facet-page.md"),
    buildMd("CatalogFacetPage", { route: "(shared)", sow: "Taxonomy", admin: "product-classes.md" }, data, enrich),
  );
  console.log("wrote catalog-facet-page.md");
}
