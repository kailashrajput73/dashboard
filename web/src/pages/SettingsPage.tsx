import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { wipeCatalogAll } from "../api/endpoints";
import { ApiError } from "../api/client";
import { PasscodeConfirmModal } from "../components/PasscodeConfirmModal";
import { Button, Card, ErrorModal, Header } from "../components/UI";
import { Icon } from "../components/Icon";
import { getTaxonomyTabs, setTaxonomyTabs, type TaxonomyTabs } from "../features/catalog-taxonomy/settings";
import { colors, font, radii, spacing } from "../theme";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<TaxonomyTabs>({ showProductType: true, showProductClass: true });
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getTaxonomyTabs().then((nextTabs) => {
      if (active) setTabs(nextTabs);
    });
    return () => { active = false; };
  }, []);

  async function toggle(key: keyof TaxonomyTabs) {
    const next = { ...tabs, [key]: !tabs[key] };
    setTabs(next);
    await setTaxonomyTabs(next);
  }

  async function runWipe(credentials: { contactNumber: string; passcode: string }) {
    setWiping(true);
    setError(null);
    try {
      const result = await wipeCatalogAll(credentials);
      setWipeOpen(false);
      setMessage(`Removed ${result.catalog} products, ${result.categories} categories, ${result.subcategories} subcategories, ${result.productTypes ?? 0} types, ${result.brands} brands, ${result.productGroups} groups.`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not wipe catalog");
    } finally {
      setWiping(false);
    }
  }

  return (
    <main style={pageStyle}>
      <Header title="Settings" subtitle="Catalog tabs and temporary maintenance" onBack={() => navigate(-1)} />
      <div style={bodyStyle}>
        <p style={hintStyle}>These tabs group products from the Excel Type and Class columns. The sheet names stay Type and Class. Turn a tab off when you do not need it in the admin menu.</p>
        <ToggleRow
          testID="toggle-product-type-tab"
          title="Product type"
          subtitle="Tab next to Categories. Shows CPVC, PVC, UPVC and their products."
          value={tabs.showProductType}
          onChange={() => void toggle("showProductType")}
        />
        <ToggleRow
          testID="toggle-product-class-tab"
          title="Product class"
          subtitle="Tab next to Subcategories. Shows SDR11, Sch 40 and their products."
          value={tabs.showProductClass}
          onChange={() => void toggle("showProductClass")}
        />

        <h2 style={sectionStyle}>Temporary — remove before production</h2>
        <Card style={dangerCardStyle}>
          <h3 style={dangerTitleStyle}>Wipe entire catalog</h3>
          <p style={dangerHintStyle}>Deletes all products, categories, subcategories, brands, product groups, and pricing history. Requires admin contact and passcode. Use before a clean master import.</p>
          <Button
            testID="open-wipe-catalog"
            title="Delete all catalog data…"
            variant="danger"
            icon="trash-outline"
            onPress={() => setWipeOpen(true)}
            fullWidth
          />
        </Card>
        {message ? <p role="status" style={successStyle}>{message}</p> : null}
      </div>
      <PasscodeConfirmModal
        visible={wipeOpen}
        title="Wipe all catalog data"
        message="This cannot be undone. Enter your admin login contact and passcode."
        confirmLabel="Delete everything"
        loading={wiping}
        onClose={() => setWipeOpen(false)}
        onConfirm={runWipe}
      />
      <ErrorModal visible={!!error} title="Settings" message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}

function ToggleRow(props: { title: string; subtitle: string; value: boolean; onChange: () => void; testID: string }) {
  return (
    <label style={toggleRowStyle} data-testid={props.testID}>
      <span style={toggleCopyStyle}>
        <strong style={toggleTitleStyle}>{props.title}</strong>
        <span style={toggleSubtitleStyle}>{props.subtitle}</span>
      </span>
      <input type="checkbox" role="switch" aria-label={props.title} checked={props.value} onChange={props.onChange} style={switchInputStyle} />
      <span style={{ ...switchIndicatorStyle, background: props.value ? colors.success : colors.textMuted }} aria-hidden="true">
        <Icon name={props.value ? "checkmark" : "close"} size={16} color="#FFFFFF" />
      </span>
    </label>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: colors.bg };
const bodyStyle: React.CSSProperties = { maxWidth: 1000, padding: spacing.lg };
const hintStyle: React.CSSProperties = { color: colors.textSecondary, lineHeight: "20px", margin: `0 0 ${spacing.lg}px` };
const sectionStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, margin: `${spacing.lg}px 0 ${spacing.sm}px` };
const dangerCardStyle: React.CSSProperties = { borderColor: colors.error, background: colors.errorBg };
const dangerTitleStyle: React.CSSProperties = { ...font.title, color: colors.error, margin: 0 };
const dangerHintStyle: React.CSSProperties = { color: colors.textSecondary, lineHeight: "20px", margin: `${spacing.sm}px 0 ${spacing.md}px` };
const successStyle: React.CSSProperties = { color: colors.success, margin: `${spacing.md}px 0 0`, lineHeight: "20px" };
const toggleRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.md, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, cursor: "pointer" };
const toggleCopyStyle: React.CSSProperties = { display: "grid", gap: 4, flex: 1, minWidth: 0 };
const toggleTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary };
const toggleSubtitleStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 13, lineHeight: "18px" };
const switchInputStyle: React.CSSProperties = { position: "absolute", opacity: 0, width: 1, height: 1 };
const switchIndicatorStyle: React.CSSProperties = { display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: radii.pill, flexShrink: 0 };