import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { IconName } from "./Icon";
import { Icon } from "./Icon";
import { getAdmin, fullSignOut } from "../state/session";
import { getTaxonomyTabs, type TaxonomyTabs } from "../features/catalog-taxonomy/settings";
import { colors, font } from "../theme";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  testID: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function catalogNav(tabs: TaxonomyTabs): NavItem[] {
  const items: NavItem[] = [
    { href: "/catalog", label: "Products", icon: "cube-outline", testID: "sidebar-catalog" },
    { href: "/categories", label: "Categories", icon: "pricetags-outline", testID: "sidebar-categories" },
  ];
  if (tabs.showProductType) {
    items.push({ href: "/product-types", label: "Product type", icon: "funnel-outline", testID: "sidebar-product-types" });
  }
  items.push({ href: "/subcategories", label: "Subcategories", icon: "git-branch-outline", testID: "sidebar-subcategories" });
  if (tabs.showProductClass) {
    items.push({ href: "/product-classes", label: "Product class", icon: "filter-outline", testID: "sidebar-product-classes" });
  }
  items.push(
    { href: "/brands", label: "Brands", icon: "ribbon-outline", testID: "sidebar-brands" },
    { href: "/product-groups", label: "Product groups", icon: "layers-outline", testID: "sidebar-product-groups" },
    { href: "/csv-import", label: "Spreadsheet imports", icon: "cloud-upload-outline", testID: "sidebar-csv-import" },
  );
  return items;
}

function buildNav(tabs: TaxonomyTabs): NavSection[] {
  return [
    {
      title: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "grid-outline", testID: "sidebar-dashboard" },
      ],
    },
    { title: "Catalog", items: catalogNav(tabs) },
    {
      title: "Warehouse",
      items: [
        { href: "/racks", label: "Racks", icon: "grid-outline", testID: "sidebar-racks" },
        { href: "/purchases", label: "Purchases", icon: "cart-outline", testID: "sidebar-purchases" },
        { href: "/inventory", label: "Inventory", icon: "bar-chart-outline", testID: "sidebar-inventory" },
      ],
    },
    {
      title: "Sales",
      items: [
        { href: "/rfqs", label: "RFQs", icon: "document-text-outline", testID: "sidebar-rfqs" },
        { href: "/partners", label: "Partners", icon: "people-outline", testID: "sidebar-partners" },
        { href: "/dispatches", label: "Dispatch", icon: "barcode-outline", testID: "sidebar-dispatches" },
        { href: "/money-config", label: "Money config", icon: "cash-outline", testID: "sidebar-money-config" },
      ],
    },
    {
      title: "Admin",
      items: [
        { href: "/settings", label: "Settings", icon: "settings-outline", testID: "sidebar-settings" },
        { href: "/team", label: "Team", icon: "shield-outline", testID: "sidebar-team" },
      ],
    },
  ];
}

export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [tabs, setTabs] = useState<TaxonomyTabs>({
    showProductType: true,
    showProductClass: true,
  });
  const nav = useMemo(() => buildNav(tabs), [tabs]);

  useEffect(() => {
    getAdmin().then((admin) => setCompany(admin?.companyName || ""));
    getTaxonomyTabs().then(setTabs);
  }, [location.pathname]);

  async function signOut() {
    await fullSignOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div style={{ ...font.h3, color: colors.textPrimary }}>
            Shivani Admin
          </div>
          <div className="admin-brand-sub">{company || "Dashboard"}</div>
        </div>
        <nav className="admin-nav" aria-label="Admin menu">
          {nav.map((section) => (
            <section className="admin-nav-section" key={section.title}>
              <div className="admin-nav-section-title">{section.title}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  data-testid={item.testID}
                  className={({ isActive }) =>
                    `admin-nav-item${isActive ? " admin-nav-item-active" : ""}`
                  }
                  end
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        name={item.icon}
                        size={18}
                        color={isActive ? colors.primary : colors.textSecondary}
                      />
                      <span
                        className={`admin-nav-label${isActive ? " admin-nav-label-active" : ""}`}
                      >
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </section>
          ))}
        </nav>
        <button
          type="button"
          data-testid="sidebar-signout"
          className="admin-signout"
          onClick={() => void signOut()}
        >
          <Icon name="log-out-outline" size={18} color={colors.textSecondary} />
          <span className="admin-nav-label">Sign out</span>
        </button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
