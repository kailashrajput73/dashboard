import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { AppModal } from "../../components/UI";
import { colors, font, spacing } from "../../theme";
import {
  CatalogSpreadsheetImport,
  type CatalogImportKind,
} from "../catalog-import/CatalogSpreadsheetImport";
import {
  MASTER_TEMPLATE_HEADERS,
  PIPES_FITTINGS_IMAGE_HEADERS,
  PIPES_FITTINGS_TEMPLATE_HEADERS,
  PRICING_TEMPLATE_HEADERS,
  STOCK_TEMPLATE_HEADERS,
} from "../../utils/import-templates";

export type ImportStep =
  | "pick"
  /** Hub list: product master opens pipes v1 (not legacy client master columns). */
  | "product-master"
  /** Deep links (/import-pipes-fittings) — same inner flow as product-master. */
  | "pipes-fittings-combined"
  | { kind: CatalogImportKind; batch?: boolean };

/** Catalog uploads under Product master (full) — add more rows as new formats ship. */
const productMasterUploads: {
  step: "pipes-fittings-combined";
  title: string;
  description: string;
  icon: "git-branch-outline";
  testID: string;
}[] = [
  {
    step: "pipes-fittings-combined",
    title: "Pipes & fittings (v1)",
    description: "Master sheet (families + SKUs), then family image URLs",
    icon: "git-branch-outline",
    testID: "nav-import-pipes-fittings",
  },
];

/** Spreadsheet import types shown on step 1 (more slots reserved for future uploads). */
const pickerItems: {
  step: ImportStep;
  title: string;
  description: string;
  icon: "cube-outline" | "pricetag-outline" | "bar-chart-outline";
  testID: string;
}[] = [
  {
    step: "product-master",
    title: "1 — Product master (full)",
    description: "Catalog product uploads — one format per button inside",
    icon: "cube-outline",
    testID: "nav-import-products",
  },
  {
    step: { kind: "pricing" },
    title: "2 — Prices & discount",
    description: "product_code, MRP, discount % — merge only",
    icon: "pricetag-outline",
    testID: "nav-import-prices",
  },
  {
    step: { kind: "stock" },
    title: "3 — Stock quantities",
    description: "product_code + qty — or use Purchases for goods in",
    icon: "bar-chart-outline",
    testID: "nav-import-stock",
  },
];

function stepConfig(step: ImportStep) {
  if (step === "pick") {
    return { title: "Import spreadsheet", subtitle: "", columnHelp: "", showCategoryMode: false };
  }
  if (step === "product-master") {
    return {
      title: "Product master (full)",
      subtitle: "Choose a catalog upload format. Each opens its own sheet and steps.",
      columnHelp: "",
      showCategoryMode: false,
    };
  }
  if (step === "pipes-fittings-combined") {
    return {
      title: "Pipes & fitting upload",
      subtitle: "Step 1: Pipes & fittings master sheet · Step 2: Family images",
      columnHelp: "",
      showCategoryMode: false,
    };
  }
  if (typeof step === "object" && step.kind === "master" && step.batch) {
    const columns = MASTER_TEMPLATE_HEADERS.join(", ");
    return {
      title: "Import products (batch)",
      subtitle: "Same client master format — one sub-category or brand at a time",
      columnHelp: `${columns}. Same rules as full catalog import.`,
      showCategoryMode: false,
    };
  }
  if (typeof step === "object" && step.kind === "pricing") {
    return {
      title: "Import prices & discount",
      subtitle: "Fortnightly rate updates — Product Code required",
      columnHelp: `${PRICING_TEMPLATE_HEADERS.join(", ")}. You can also upload the full client master sheet — only price columns are used. Discount may be decimal (0.49 = 49%). Empty Selling Price is calculated from MRP + discount.`,
      showCategoryMode: false,
    };
  }
  if (typeof step === "object" && step.kind === "pipes-fittings") {
    return {
      title: "Import pipes & fittings (catalog)",
      subtitle: "Category: Pipes & fitting — product families + SKU codes",
      columnHelp: `${PIPES_FITTINGS_TEMPLATE_HEADERS.join(", ")}. Product Name is optional (display names are generated). status: leave blank for inactive; use active (or yes) to go live. Then use step 2 on this page for family images.`,
      showCategoryMode: false,
    };
  }
  if (typeof step === "object" && step.kind === "pipes-fittings-images") {
    return {
      title: "Import pipes & fittings images",
      subtitle: "One row per product family (not per size)",
      columnHelp: `${PIPES_FITTINGS_IMAGE_HEADERS.join(", ")}. Download the sheet from catalog (brand + product_family pre-filled), add image_url, upload — validation runs automatically like the master import.`,
      showCategoryMode: false,
    };
  }
  return {
    title: "Import stock quantities",
    subtitle: "Sets on-hand qty — use Purchases when goods arrive from supplier",
    columnHelp: `${STOCK_TEMPLATE_HEADERS.join(", ")} (stock_qty also accepted). Sets absolute on-hand count. For stock IN from supplier invoices, use Purchases → bulk CSV.`,
    showCategoryMode: false,
  };
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
  initialStep?: ImportStep;
  /** After opening pipes flow, scroll to step 2 (legacy /import-pipes-fittings-images). */
  scrollFamilyImages?: boolean;
};

export function CatalogImportHubModal(props: Props) {
  const [step, setStep] = useState<ImportStep>("pick");

  useEffect(() => {
    if (props.visible) {
      setStep(props.initialStep && props.initialStep !== "pick" ? props.initialStep : "pick");
    }
  }, [props.visible, props.initialStep]);

  useEffect(() => {
    if (!props.visible || step !== "pipes-fittings-combined") return;
    if (!props.scrollFamilyImages && window.location.hash !== "#family-images") return;
    const timer = window.setTimeout(() => {
      document.getElementById("family-images")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [props.visible, props.scrollFamilyImages, step]);

  function closeAll() {
    setStep("pick");
    props.onClose();
  }

  const config = stepConfig(step);
  const pipesMaster = stepConfig({ kind: "pipes-fittings" as CatalogImportKind });
  const pipesImages = stepConfig({ kind: "pipes-fittings-images" as CatalogImportKind });

  return (
    <AppModal
      testID="product-mgmt-import-hub"
      visible={props.visible}
      onClose={closeAll}
      title={step === "pick" ? "Import spreadsheet" : config.title}
      wide={step !== "pick" && step !== "product-master"}
    >
      {step === "pick" ? (
        <>
          <p style={noteStyle}>
            Pick an import type — each upload has its own sheet and rules. Merge by product_code where noted. Use
            Purchases → Bulk CSV when stock arrives from a supplier.
          </p>
          <p style={batchNoteStyle}>
            Batch master sheet: open <strong>Subcategories</strong> in the filter bar → manage (+) → Import products
            (batch sheet).
          </p>
          <nav aria-label="Spreadsheet import types" style={{ display: "grid", gap: spacing.sm }}>
            {pickerItems.map((item) => (
              <button
                key={item.testID}
                type="button"
                data-testid={item.testID}
                onClick={() => setStep(item.step)}
                style={pickerRowStyle}
              >
                <span style={iconWrapStyle}>
                  <Icon name={item.icon} size={22} color={colors.primary} />
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ ...font.title, display: "block" }}>{item.title}</span>
                  <span style={{ color: colors.textSecondary, fontSize: 13 }}>{item.description}</span>
                </span>
                <Icon name="chevron-forward" size={18} color={colors.textMuted} />
              </button>
            ))}
          </nav>
        </>
      ) : step === "product-master" ? (
        <>
          <button type="button" onClick={() => setStep("pick")} style={backLinkStyle}>
            ← All import types
          </button>
          <p style={{ color: colors.textSecondary, fontSize: 13, margin: `0 0 ${spacing.md}px` }}>
            {config.subtitle}
          </p>
          <nav aria-label="Product master upload formats" style={{ display: "grid", gap: spacing.sm }}>
            {productMasterUploads.map((item) => (
              <button
                key={item.testID}
                type="button"
                data-testid={item.testID}
                onClick={() => setStep(item.step)}
                style={pickerRowStyle}
              >
                <span style={iconWrapStyle}>
                  <Icon name={item.icon} size={22} color={colors.primary} />
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ ...font.title, display: "block" }}>{item.title}</span>
                  <span style={{ color: colors.textSecondary, fontSize: 13 }}>{item.description}</span>
                </span>
                <Icon name="chevron-forward" size={18} color={colors.textMuted} />
              </button>
            ))}
          </nav>
        </>
      ) : step === "pipes-fittings-combined" ? (
        <>
          <button type="button" onClick={() => setStep("product-master")} style={backLinkStyle}>
            ← Product master (full)
          </button>
          <p style={{ color: colors.textSecondary, fontSize: 13, margin: `0 0 ${spacing.md}px` }}>
            {config.subtitle}
          </p>
          <CatalogSpreadsheetImport
            embedded
            sectionTitle="Step 1 — Pipes & fittings master sheet (SKUs)"
            kind="pipes-fittings"
            title=""
            subtitle=""
            columnHelp={pipesMaster.columnHelp}
            columnHelpDisplay="info"
            layout="embedded"
            onImported={props.onImported}
          />
          <CatalogSpreadsheetImport
            embedded
            sectionId="family-images"
            sectionTitle="Step 2 — Family images"
            kind="pipes-fittings-images"
            title=""
            subtitle=""
            columnHelp={pipesImages.columnHelp}
            columnHelpDisplay="info"
            layout="embedded"
            onImported={props.onImported}
          />
        </>
      ) : typeof step === "object" && "kind" in step ? (
        <>
          <button type="button" onClick={() => setStep("pick")} style={backLinkStyle}>
            ← All import types
          </button>
          <p style={{ color: colors.textSecondary, fontSize: 13, margin: `0 0 ${spacing.md}px` }}>
            {config.subtitle}
          </p>
          <CatalogSpreadsheetImport
            kind={step.kind}
            title={config.title}
            subtitle={config.subtitle}
            columnHelp={config.columnHelp}
            showCategoryMode={config.showCategoryMode}
            layout="embedded"
            onClose={closeAll}
            onImported={props.onImported}
          />
        </>
      ) : null}
    </AppModal>
  );
}

const noteStyle: React.CSSProperties = {
  color: colors.textSecondary,
  lineHeight: 1.5,
  margin: `0 0 ${spacing.sm}px`,
  fontSize: 13,
};

const batchNoteStyle: React.CSSProperties = {
  ...noteStyle,
  margin: `0 0 ${spacing.md}px`,
  padding: spacing.sm,
  borderRadius: 8,
  background: colors.primaryLight,
  color: colors.textPrimary,
};

const pickerRowStyle: React.CSSProperties = {
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
  width: "100%",
};

const iconWrapStyle: React.CSSProperties = {
  display: "flex",
  width: 44,
  height: 44,
  flexShrink: 0,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  backgroundColor: colors.primaryLight,
};

const backLinkStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: colors.primary,
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
  marginBottom: spacing.sm,
  fontSize: 14,
};
