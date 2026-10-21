import { CatalogSpreadsheetImport, type CatalogImportKind } from "../features/catalog-import/CatalogSpreadsheetImport";
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
      columnHelp: `${PIPES_FITTINGS_TEMPLATE_HEADERS.join(", ")}. Product Name is optional (display names are generated). Images: use the separate family image import.`,
    };
  }

  if (kind === "pipes-fittings-images") {
    return {
      title: "Import pipes & fittings images",
      subtitle: "One row per product family (not per size)",
      columnHelp: `${PIPES_FITTINGS_IMAGE_HEADERS.join(", ")}. Match brand + product_family from the master sheet.`,
    };
  }

  return {
    title: "Import stock quantities",
    subtitle: "Sets on-hand qty — use Purchases when goods arrive from supplier",
    columnHelp: `${STOCK_TEMPLATE_HEADERS.join(", ")} (stock_qty also accepted). Sets absolute on-hand count. For stock IN from supplier invoices, use Purchases → bulk CSV.`,
  };
}

export default function CatalogImportPage({ kind, batch = false }: Props) {
  const config = getPageConfig(kind, batch);

  return (
    <CatalogSpreadsheetImport
      kind={kind}
      title={config.title}
      subtitle={config.subtitle}
      columnHelp={config.columnHelp}
      showCategoryMode={kind === "master" && !batch}
    />
  );
}
