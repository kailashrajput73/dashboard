import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSnapshot, type DashboardSnapshot } from "../api/endpoints";
import { ApiError } from "../api/client";
import { getAdmin } from "../state/session";
import { getTaxonomyTabs } from "../features/catalog-taxonomy/settings";
import { Header } from "../components/UI";
import { Icon, type IconName } from "../components/Icon";
import { colors, font, radii, spacing } from "../theme";
import { API_BASE_URL, isMixedContentRisk } from "../config/env";
import { formatMoney } from "../utils/money";

type DashboardStat = {
  id: string;
  label: string;
  value: string;
  icon: IconName;
  tint: string;
  subtitle?: string;
  path: string;
};

function formatQty(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProductType, setShowProductType] = useState(true);
  const [showProductClass, setShowProductClass] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const admin = await getAdmin();
      if (!active) return;
      setCompany(admin?.companyName || "");
      setError(null);
      try {
        const nextSnapshot = await getDashboardSnapshot();
        if (!active) return;
        setSnapshot(nextSnapshot);
        try {
          const tabs = await getTaxonomyTabs();
          if (active) {
            setShowProductType(tabs.showProductType);
            setShowProductClass(tabs.showProductClass);
          }
        } catch {
          // Taxonomy settings are local-only; keep their defaults if unavailable.
        }
      } catch (cause) {
        if (!active) return;
        setSnapshot(null);
        if (cause instanceof ApiError) setError(cause.message);
        else if (isMixedContentRisk()) {
          setError("Browser blocked HTTP API from this HTTPS page. Use https:// on the VPS or open admin from http://localhost.");
        } else {
          setError("Could not load overview from the API.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const stats: DashboardStat[] = snapshot ? [
    { id: "catalog", label: "SKUs", value: String(snapshot.catalogCount), icon: "cube-outline", tint: colors.primary, path: "/catalog" },
    { id: "stock-units", label: "Units in stock", value: formatQty(snapshot.totalStockUnits), icon: "layers-outline", tint: colors.secondary, path: "/inventory" },
    { id: "low-stock", label: "Low stock (ROL)", value: String(snapshot.lowStockCount), icon: "warning-outline", tint: colors.warning, path: "/inventory" },
    { id: "rfq-pending", label: "RFQ pending", value: String(snapshot.rfqCounts.pending || 0), icon: "time-outline", tint: colors.warning, path: "/rfqs" },
    { id: "rfq-approved", label: "RFQ approved", value: String(snapshot.rfqCounts.approved || 0), icon: "checkmark-circle-outline", tint: colors.success, path: "/rfqs" },
    { id: "rfq-dispatched", label: "RFQ dispatched", value: String(snapshot.rfqCounts.dispatched || 0), icon: "send-outline", tint: colors.primary, path: "/rfqs" },
    { id: "partners", label: "Partners (KYC OK)", value: `${snapshot.partnersKycApproved}/${snapshot.partnersTotal}`, icon: "people-outline", tint: colors.secondary, path: "/partners" },
    { id: "sales-7d", label: "Dispatch value (7d)", value: snapshot.dispatchCount7d ? formatMoney(snapshot.dispatchValue7d) : "—", icon: "cash-outline", tint: colors.success, subtitle: snapshot.dispatchCount7d ? `${snapshot.dispatchCount7d} bill${snapshot.dispatchCount7d === 1 ? "" : "s"}` : "No dispatches yet", path: "/dispatches" },
  ] : [];

  return (
    <main style={pageStyle}>
      <Header title="Overview" subtitle={company || "Live ops snapshot"} />
      <div style={contentStyle}>
        <h2 style={sectionTitleStyle}>Operations snapshot</h2>
        <p style={sectionHintStyle}>Stock, RFQs, partners, and dispatch sales from live data — not full monthly analytics.</p>
        {loading ? <div style={loadingStyle}><span className="web-button-spinner" role="status" aria-label="Loading dashboard" /></div> : snapshot ? <>
          <div style={statsGridStyle}>
            {stats.map((stat) => <button type="button" key={stat.id} data-testid={`stat-${stat.id}`} onClick={() => navigate(stat.path)} style={statCardStyle}>
              <span style={{ ...statIconStyle, background: `${stat.tint}22` }}><Icon name={stat.icon} size={20} color={stat.tint} /></span>
              <strong style={statValueStyle}>{stat.value}</strong>
              <span style={statLabelStyle}>{stat.label}</span>
              {stat.subtitle ? <span style={statSubtitleStyle}>{stat.subtitle}</span> : null}
            </button>)}
          </div>

          {snapshot.pendingRfqs?.length ? <section style={panelStyle} data-testid="panel-pending-rfqs">
            <h3 style={panelTitleStyle}>Needs review</h3>
            {snapshot.pendingRfqs.map((item) => <button type="button" key={item.id} data-testid={`pending-rfq-${item.id}`} onClick={() => navigate("/rfqs")} style={listButtonStyle}>
              <strong style={rowTitleStyle}>Partner {item.partnerId}</strong>
              <span style={rowMetaStyle}>{item.lineCount} line{item.lineCount === 1 ? "" : "s"} · Pending</span>
            </button>)}
          </section> : null}

          <div style={twoColumnStyle}>
            <section style={panelStyle} data-testid="panel-top-moving">
              <h3 style={panelTitleStyle}>Moving fast ({snapshot.salesWindowDays}d)</h3>
              {snapshot.topMovingProducts?.length ? snapshot.topMovingProducts.map((item) => <div key={item.productCode} style={listRowStyle}>
                <strong style={rowTitleStyle}>{item.name}</strong>
                <span style={rowMetaStyle}>{item.productCode} · Qty out {formatQty(item.dispatchQty)}</span>
              </div>) : <p style={emptyHintStyle}>No dispatch movement in window yet.</p>}
            </section>
            <section style={panelStyle} data-testid="panel-slow-moving">
              <h3 style={panelTitleStyle}>In stock, not moving ({snapshot.salesWindowDays}d)</h3>
              {snapshot.slowMovingProducts?.length ? snapshot.slowMovingProducts.map((item) => <div key={item.productCode} style={listRowStyle}>
                <strong style={rowTitleStyle}>{item.name}</strong>
                <span style={rowMetaStyle}>{item.productCode} · Stock {formatQty(item.stock)}</span>
              </div>) : <p style={emptyHintStyle}>All stocked SKUs had some dispatch activity — or no stock data.</p>}
            </section>
          </div>
        </> : <section style={panelStyle} data-testid="snapshot-error">
          <p style={emptyHintStyle}>{error || "Could not load snapshot. Check API URL and redeploy backend."}</p>
          <p style={apiHintStyle}>API: {API_BASE_URL}/api</p>
          {isMixedContentRisk() ? <p style={apiHintStyle}>Mixed content: enable HTTPS on the VPS for production admin.</p> : null}
        </section>}

        <h2 style={{ ...sectionTitleStyle, marginTop: spacing.lg }}>Modules</h2>
        <div style={modulesGridStyle}>
          <ModuleLink testID="nav-catalog-manage" title="Manage Catalog" subtitle="Add, edit, and remove items" icon="list-outline" onClick={() => navigate("/catalog")} />
          <ModuleLink testID="nav-category-manage" title="Manage Categories" subtitle="Home photo (file or URL), rename, activate" icon="pricetags-outline" onClick={() => navigate("/categories")} />
          {showProductType ? <ModuleLink testID="nav-product-type-manage" title="Product type" subtitle="Type photos (PVC / CPVC / UPVC) — file or URL" icon="funnel-outline" onClick={() => navigate("/product-types")} /> : null}
          <ModuleLink testID="nav-subcategory-manage" title="Manage Subcategories" subtitle="Organize products under categories" icon="git-branch-outline" onClick={() => navigate("/subcategories")} />
          {showProductClass ? <ModuleLink testID="nav-product-class-manage" title="Product class" subtitle="SDR11, Sch 40 and products in each class" icon="filter-outline" onClick={() => navigate("/product-classes")} /> : null}
          <ModuleLink testID="nav-brand-manage" title="Manage Brands" subtitle="Brand logo (file or URL), create and link products" icon="ribbon-outline" onClick={() => navigate("/brands")} />
          <ModuleLink testID="nav-product-group-manage" title="Manage Product Groups" subtitle="Create groups with multiple products" icon="layers-outline" onClick={() => navigate("/product-groups")} />
          <ModuleLink testID="nav-rack-manage" title="Rack Locations" subtitle="Configure warehouse storage slots" icon="grid-outline" onClick={() => navigate("/racks")} />
          <ModuleLink testID="nav-purchase-manage" title="Purchase Management" subtitle="Receive stock and view purchase history" icon="cart-outline" onClick={() => navigate("/purchases")} />
          <ModuleLink testID="nav-rfq-manage" title="RFQ Management" subtitle="Review quotations, rewards, and delivery" icon="document-text-outline" onClick={() => navigate("/rfqs")} />
          <ModuleLink testID="nav-partner-manage" title="Referral Partners" subtitle="Review KYC, rewards, and partner performance" icon="people-outline" onClick={() => navigate("/partners")} />
          <ModuleLink testID="nav-dispatch-manage" title="Dispatch & Billing" subtitle="Scan products, bill retail, and dispatch RFQs" icon="barcode-outline" onClick={() => navigate("/dispatches")} />
          <ModuleLink testID="nav-inventory-manage" title="Stock & Inventory" subtitle="Live stock, valuation, and low-stock reports" icon="bar-chart-outline" onClick={() => navigate("/inventory")} />
          <ModuleLink testID="nav-team-manage" title="Team Management" subtitle="Manage users, roles, and permissions" icon="people-outline" onClick={() => navigate("/team")} />
          <ModuleLink testID="nav-csv-import" title="Spreadsheet imports" subtitle="Product master, prices, stock — separate files" icon="cloud-upload-outline" onClick={() => navigate("/csv-import")} />
          <ModuleLink testID="nav-settings" title="Settings" subtitle="Show or hide Product type and Product class tabs" icon="settings-outline" onClick={() => navigate("/settings")} />
        </div>
      </div>
    </main>
  );
}

function ModuleLink(props: { title: string; subtitle: string; icon: IconName; onClick: () => void; testID: string }) {
  return <button type="button" data-testid={props.testID} onClick={props.onClick} style={moduleLinkStyle}>
    <span style={moduleIconStyle}><Icon name={props.icon} size={20} color={colors.primary} /></span>
    <span style={moduleTextStyle}><strong style={moduleTitleStyle}>{props.title}</strong><span style={moduleSubtitleStyle}>{props.subtitle}</span></span>
    <Icon name="chevron-forward" size={18} color={colors.textMuted} />
  </button>;
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: colors.bg };
const contentStyle: React.CSSProperties = { maxWidth: 1240, margin: "0 auto", padding: `${spacing.xl}px ${spacing.lg}px ${spacing.xl}px` };
const sectionTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, margin: `0 0 ${spacing.sm}px` };
const sectionHintStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, margin: "-4px 0 12px" };
const loadingStyle: React.CSSProperties = { minHeight: 120, display: "grid", placeItems: "center" };
const statsGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: spacing.md, marginBottom: spacing.lg };
const statCardStyle: React.CSSProperties = { display: "grid", justifyItems: "start", alignContent: "start", minHeight: 144, textAlign: "left", padding: spacing.md, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, color: colors.textPrimary, font: "inherit", cursor: "pointer" };
const statIconStyle: React.CSSProperties = { display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: radii.sm, marginBottom: spacing.sm };
const statValueStyle: React.CSSProperties = { ...font.h2, fontSize: 22, color: colors.textPrimary };
const statLabelStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 11, marginTop: 2 };
const statSubtitleStyle: React.CSSProperties = { color: colors.textMuted, fontSize: 10, marginTop: 2 };
const panelStyle: React.CSSProperties = { minWidth: 0, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md };
const panelTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, margin: `0 0 ${spacing.sm}px` };
const listButtonStyle: React.CSSProperties = { display: "grid", width: "100%", padding: `${spacing.sm}px 0`, border: 0, borderTop: `1px solid ${colors.border}`, background: "transparent", color: colors.textPrimary, font: "inherit", textAlign: "left", cursor: "pointer" };
const listRowStyle: React.CSSProperties = { display: "grid", gap: 2, padding: `${spacing.sm}px 0`, borderTop: `1px solid ${colors.border}` };
const rowTitleStyle: React.CSSProperties = { ...font.title, fontSize: 14, color: colors.textPrimary, overflowWrap: "anywhere" };
const rowMetaStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 11, marginTop: 2, overflowWrap: "anywhere" };
const emptyHintStyle: React.CSSProperties = { color: colors.textMuted, fontSize: 12, fontStyle: "italic", margin: 0 };
const apiHintStyle: React.CSSProperties = { color: colors.textMuted, fontSize: 11, margin: `${spacing.sm}px 0 0`, overflowWrap: "anywhere" };
const twoColumnStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: spacing.md };
const modulesGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: spacing.sm };
const moduleLinkStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.md, width: "100%", minWidth: 0, minHeight: 88, padding: spacing.md, border: `1px solid ${colors.border}`, borderRadius: radii.md, background: colors.surface, color: colors.textPrimary, font: "inherit", textAlign: "left", cursor: "pointer" };
const moduleIconStyle: React.CSSProperties = { display: "grid", placeItems: "center", width: 40, height: 40, flexShrink: 0, borderRadius: radii.sm, background: colors.primaryLight };
const moduleTextStyle: React.CSSProperties = { display: "grid", flex: 1, minWidth: 0, gap: 2 };
const moduleTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, overflowWrap: "anywhere" };
const moduleSubtitleStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, overflowWrap: "anywhere" };