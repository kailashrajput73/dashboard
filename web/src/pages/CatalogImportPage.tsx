import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CatalogSpreadsheetImport,
  type CatalogImportKind,
} from "../features/catalog-import/CatalogSpreadsheetImport";
import { Header } from "../components/UI";
import { colors, spacing } from "../theme";
import {
  MASTER_TEMPLATE_HEADERS,
  PIPES_FITTINGS_IMAGE_HEADERS,
  PIPES_FITTINGS_TEMPLATE_HEADERS,
  PRICING_TEMPLATE_HEADERS,
  STOCK_TEMPLATE_HEADERS,
} from "../utils/import-templates";

type Props = {
  kind: CatalogImportKind;
  batch?: boolean;
};

type PageConfig = {
  title: string;
  subtitle: string;
  columnHelp: string;
};

function getPageConfig(kind: CatalogImportKind, batch: boolean): PageConfig {
  if (kind === "master") {
    const columns = MASTER_TEMPLATE_HEADERS.join(", ");
    return batch
      ? {
          title: "Import products (batch)",
          subtitle: "Same client master format — one sub-category or brand at a time",
          columnHelp: `${columns}. Same rules as full catalog import.`,
        }
      : {
          title: "Import products (full catalog)",
          subtitle: "Client master sheet — merge by Product Code",
          columnHelp: `${columns}. Type = material (UPVC/CPVC/PVC). class = Sch 40 / SDR11. Sub-Category = subcategory line. ROL → reorder level (low stock). image_url optional. Re-import updates details; existing stock/prices unchanged — use Prices/Stock imports.`,
        };
  }

  if (kind === "pricing") {
    return {
      title: "Import prices & discount",
      subtitle: "Fortnightly rate updates — Product Code required",
      columnHelp: `${PRICING_TEMPLATE_HEADERS.join(", ")}. You can also upload the full client master sheet — only price columns are used. Discount may be decimal (0.49 = 49%). Empty Selling Price is calculated from MRP + discount.`,
    };
  }

  if (kind === "pipes-fittings") {
    return {
      title: "Import pipes & fittings (catalog)",
      subtitle: "Category: Pipes & fitting — product families + SKU codes",
      columnHelp: `${PIPES_FITTINGS_TEMPLATE_HEADERS.join(", ")}. Product Name is optional. status: blank = inactive, active/yes = live. Then use step 2 for family images.`,
    };
  }

  if (kind === "pipes-fittings-images") {
    return {
      title: "Import pipes & fittings images",
      subtitle: "One row per product family (not per size)",
      columnHelp: `${PIPES_FITTINGS_IMAGE_HEADERS.join(", ")}. Download the sheet from catalog (brand + product_family pre-filled), add image_url, upload — validation runs automatically like the master import.`,
    };
  }

  return {
    title: "Import stock quantities",
    subtitle: "Sets on-hand qty — use Purchases when goods arrive from supplier",
    columnHelp: `${STOCK_TEMPLATE_HEADERS.join(", ")} (stock_qty also accepted). Sets absolute on-hand count. For stock IN from supplier invoices, use Purchases → bulk CSV.`,
  };
}

function PipesFittingsCombinedImportPage() {
  const navigate = useNavigate();
  const master = getPageConfig("pipes-fittings", false);
  const images = getPageConfig("pipes-fittings-images", false);

  useEffect(() => {
    if (window.location.hash === "#family-images") {
      document.getElementById("family-images")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Pipes & fittings (v1)"
        subtitle="Step 1: master sheet · Step 2: family images"
        onBack={() => navigate(-1)}
      />
      <div
        className="admin-page-container"
        style={{ maxWidth: "none", margin: "0 auto", padding: spacing.lg }}
      >
        <CatalogSpreadsheetImport
          embedded
          sectionTitle="1 — Master sheet (SKUs)"
          kind="pipes-fittings"
          title=""
          subtitle=""
          columnHelp={master.columnHelp}
        />
        <CatalogSpreadsheetImport
          embedded
          sectionId="family-images"
          sectionTitle="2 — Family images"
          kind="pipes-fittings-images"
          title=""
          subtitle=""
          columnHelp={images.columnHelp}
        />
      </div>
    </main>
  );
}

export default function CatalogImportPage({ kind, batch = false }: Props) {
  if (kind === "pipes-fittings") {
    return <PipesFittingsCombinedImportPage />;
  }

  const config = getPageConfig(kind, batch);

  return (
    <CatalogSpreadsheetImport
      kind={kind}
      title={config.title}
      subtitle={config.subtitle}
      columnHelp={config.columnHelp}
      showCategoryMode={kind === "master" && !batch}
      showPipesFittingsEntry={kind === "master" && !batch}
    />
  );
}
