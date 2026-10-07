import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Card, Header } from "../components/UI";
import { colors, font, spacing } from "../theme";

const imports = [
  {
    path: "/import-products",
    title: "1 — Product master (full)",
    description: "Categories, brand, code, size, image — no prices or stock",
    icon: "cube-outline" as const,
    testID: "nav-import-products",
  },
  {
    path: "/import-prices",
    title: "2 — Prices & discount",
    description: "product_code, MRP, discount % — merge only",
    icon: "pricetag-outline" as const,
    testID: "nav-import-prices",
  },
  {
    path: "/import-stock",
    title: "3 — Stock quantities",
    description: "product_code + qty — or use Purchases for goods in",
    icon: "bar-chart-outline" as const,
    testID: "nav-import-stock",
  },
];

export default function SpreadsheetImportsPage() {
  const navigate = useNavigate();

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Spreadsheet imports"
        subtitle="Three separate uploads — merge by product_code"
        onBack={() => navigate(-1)}
      />
      <div style={{ maxWidth: 820, margin: "0 auto", padding: spacing.lg }}>
        <Card style={{ backgroundColor: colors.primaryLight, marginBottom: spacing.md }}>
          <p style={{ color: colors.textPrimary, lineHeight: 1.5, margin: 0 }}>
            Batch master import lives under Subcategories → Import products (batch sheet). Use Purchases → Bulk CSV when stock arrives from a supplier.
          </p>
        </Card>
        <nav aria-label="Spreadsheet import types" style={{ display: "grid", gap: spacing.sm }}>
          {imports.map((item) => (
            <button
              key={item.path}
              type="button"
              data-testid={item.testID}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing.md,
                padding: spacing.md,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                background: colors.surface,
                color: colors.textPrimary,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <Icon name={item.icon} size={22} color={colors.primary} />
              <span style={{ flex: 1 }}>
                <span style={{ ...font.title, display: "block" }}>{item.title}</span>
                <span style={{ color: colors.textSecondary, fontSize: 13 }}>{item.description}</span>
              </span>
              <Icon name="chevron-forward" size={18} color={colors.textMuted} />
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}