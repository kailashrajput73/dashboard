export type ModuleId =
  | "dashboard"
  | "product-management"
  | "racks"
  | "purchases"
  | "inventory"
  | "rfqs"
  | "partners"
  | "service-requests"
  | "dispatches"
  | "settings"
  | "team";

export type AccessLevel = "hidden" | "read" | "write";

export type ModuleAccessMap = Record<ModuleId, AccessLevel>;

export const ALL_MODULES: ModuleId[] = [
  "dashboard",
  "product-management",
  "racks",
  "purchases",
  "inventory",
  "rfqs",
  "partners",
  "service-requests",
  "dispatches",
  "settings",
  "team",
];

export const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: "Dashboard",
  "product-management": "Product management",
  racks: "Racks",
  purchases: "Purchases",
  inventory: "Inventory",
  rfqs: "RFQs",
  partners: "Partners",
  "service-requests": "Service requests",
  dispatches: "Dispatch",
  settings: "Settings",
  team: "Team",
};

const LEGACY_CATALOG_PREFIXES = [
  "/catalog",
  "/categories",
  "/product-types",
  "/subcategories",
  "/product-classes",
  "/brands",
  "/product-groups",
  "/csv-import",
  "/import-products",
  "/import-pipes-fittings",
];

export function pathToModule(pathname: string): ModuleId | null {
  if (pathname === "/dashboard" || pathname === "/") return "dashboard";
  if (pathname.startsWith("/product-management") || LEGACY_CATALOG_PREFIXES.some((p) => pathname.startsWith(p))) {
    return "product-management";
  }
  if (pathname.startsWith("/racks")) return "racks";
  if (pathname.startsWith("/purchases")) return "purchases";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/rfqs")) return "rfqs";
  if (pathname.startsWith("/partners")) return "partners";
  if (pathname.startsWith("/service-requests")) return "service-requests";
  if (pathname.startsWith("/dispatches")) return "dispatches";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/team")) return "team";
  return null;
}

export function navHrefToModule(href: string): ModuleId {
  return pathToModule(href) ?? "dashboard";
}

export const ACCESS_LEVEL_OPTIONS: { value: AccessLevel; label: string }[] = [
  { value: "hidden", label: "Hidden" },
  { value: "read", label: "View only" },
  { value: "write", label: "Full" },
];

export const DEFAULT_MODULE_ACCESS_BY_ROLE: Record<
  "store_manager" | "staff",
  Partial<ModuleAccessMap>
> = {
  store_manager: {
    dashboard: "read",
    "product-management": "read",
    racks: "read",
    purchases: "write",
    inventory: "read",
    rfqs: "write",
    partners: "read",
    "service-requests": "read",
    dispatches: "write",
    settings: "hidden",
    team: "hidden",
  },
  staff: {
    dashboard: "read",
    "product-management": "read",
    inventory: "read",
  },
};

export function defaultModuleAccessForRole(role: "admin" | "store_manager" | "staff"): ModuleAccessMap {
  if (role === "admin") {
    return Object.fromEntries(ALL_MODULES.map((m) => [m, "write"])) as ModuleAccessMap;
  }
  const base = DEFAULT_MODULE_ACCESS_BY_ROLE[role] ?? {};
  return Object.fromEntries(
    ALL_MODULES.map((module) => [module, base[module] ?? "hidden"]),
  ) as ModuleAccessMap;
}

export function mergeModuleAccess(
  role: "admin" | "store_manager" | "staff",
  overrides: Partial<ModuleAccessMap> | null | undefined,
): ModuleAccessMap {
  const defaults = defaultModuleAccessForRole(role);
  if (!overrides) return defaults;
  const merged = { ...defaults };
  for (const module of ALL_MODULES) {
    const level = overrides[module];
    if (level === "hidden" || level === "read" || level === "write") {
      merged[module] = level;
    }
  }
  return merged;
}
