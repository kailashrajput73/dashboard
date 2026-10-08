import { useState } from "react";
import {
  updateCatalogPricing,
  type CatalogItem,
} from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { Icon } from "../../components/Icon";
import { ProductQr } from "../../components/ProductQr";
import { Button } from "../../components/UI";
import { RemoteImage } from "../../components/RemoteImage";
import { colors, radii } from "../../theme";
import { sizeInchLabel, sizeLengthLabel, sizeMmLabel } from "../../utils/size";
import { discountFromMrpSelling, sellingFromMrpDiscount } from "../../utils/pricing";

export function CatalogPricingRow(props: {
  item: CatalogItem;
  onEdit: () => void;
  onDelete: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const { item } = props;
  const [mrp, setMrp] = useState(item.mrp == null ? "" : String(item.mrp));
  const [discount, setDiscount] = useState(
    item.discount == null ? "" : String(item.discount),
  );
  const [selling, setSelling] = useState(
    String(item.sellingPrice ?? item.standardRate ?? ""),
  );
  const [stock, setStock] = useState(item.stock == null ? "0" : String(item.stock));
  const [saving, setSaving] = useState(false);

  const dirty =
    Number(mrp || 0) !== Number(item.mrp || 0) ||
    Number(discount || 0) !== Number(item.discount || 0) ||
    Number(selling || 0) !== Number(item.sellingPrice ?? item.standardRate ?? 0) ||
    Number(stock || 0) !== Number(item.stock || 0);

  function syncSellingFromMrpDiscount(mrpRaw: string, discountRaw: string) {
    const nextMrp = parseFloat(mrpRaw);
    if (Number.isNaN(nextMrp) || nextMrp < 0) return;
    const parsedDiscount = parseFloat(discountRaw);
    const nextDiscount = Number.isNaN(parsedDiscount) ? 0 : parsedDiscount;
    setSelling(String(sellingFromMrpDiscount(nextMrp, nextDiscount)));
  }

  function changeSelling(value: string) {
    setSelling(value);
    const nextMrp = parseFloat(mrp);
    const nextSelling = parseFloat(value);
    if (!Number.isNaN(nextMrp) && nextMrp > 0 && !Number.isNaN(nextSelling)) {
      setDiscount(String(discountFromMrpSelling(nextMrp, nextSelling)));
    }
  }

  async function save() {
    const nextMrp = parseFloat(mrp);
    const nextDiscount = parseFloat(discount || "0");
    const nextSelling = parseFloat(selling);
    const nextStock = parseFloat(stock || "0");
    if ([nextMrp, nextDiscount, nextSelling, nextStock].some(Number.isNaN)) {
      props.onError("Enter valid MRP, discount, selling price, and stock.");
      return;
    }
    setSaving(true);
    try {
      await updateCatalogPricing(item, {
        mrp: nextMrp,
        discount: nextDiscount,
        sellingPrice: nextSelling,
        stock: nextStock,
      });
      await props.onSaved();
    } catch (cause) {
      props.onError(
        cause instanceof ApiError ? cause.message : "Could not save price",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ ...rowStyle, backgroundColor: dirty ? "#FFFBEB" : colors.surface }} data-testid={`admin-item-${item.id}`}>
      <div style={productColumnStyle}>
        <RemoteImage uri={item.imageUrl} style={thumbnailStyle} placeholderSize={16} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={productNameStyle}>{item.name}</div>
          <div style={productMetaStyle}>
            {item.productCode || "No code"} · {item.brand || "No brand"} · {item.category}
          </div>
        </div>
        <ProductQr value={item.qrCode || item.productCode || ""} inline />
      </div>
      <span style={sizeStyle}>{sizeMmLabel(item) || "—"}</span>
      <span style={sizeStyle}>{sizeInchLabel(item) || "—"}</span>
      <span style={sizeStyle}>{sizeLengthLabel(item) || "—"}</span>
      <input value={mrp} onChange={(event) => { setMrp(event.currentTarget.value); syncSellingFromMrpDiscount(event.currentTarget.value, discount); }} inputMode="decimal" style={numberInputStyle} data-testid={`mrp-${item.id}`} />
      <input value={discount} onChange={(event) => { setDiscount(event.currentTarget.value); syncSellingFromMrpDiscount(mrp, event.currentTarget.value); }} inputMode="decimal" style={numberInputStyle} data-testid={`discount-${item.id}`} />
      <label style={metricStyle}>
        <span style={metricLabelStyle}>Sell</span>
        <input value={selling} onChange={(event) => changeSelling(event.currentTarget.value)} inputMode="decimal" style={metricInputStyle} data-testid={`selling-${item.id}`} />
      </label>
      <label style={{ ...metricStyle, backgroundColor: "#F0FDFA", borderColor: "#99F6E4" }}>
        <span style={{ ...metricLabelStyle, color: "#0F766E" }}>Qty</span>
        <input value={stock} onChange={(event) => setStock(event.currentTarget.value)} inputMode="decimal" style={{ ...metricInputStyle, color: "#0F766E" }} data-testid={`stock-${item.id}`} />
      </label>
      <div style={actionsStyle}>
        <Button title={saving ? "Saving" : dirty ? "Save" : "Saved"} size="sm" onPress={() => void save()} loading={saving} disabled={!dirty} testID={`save-price-${item.id}`} />
        <button type="button" onClick={props.onEdit} aria-label={`Edit ${item.name}`} data-testid={`edit-item-${item.id}`} style={editButtonStyle}>
          <Icon name="create-outline" size={18} color={colors.primary} />
        </button>
        <button type="button" onClick={props.onDelete} aria-label={`Delete ${item.name}`} title="Delete product" data-testid={`delete-item-${item.id}`} style={editButtonStyle}>
          <Icon name="trash-outline" size={18} color={colors.error} />
        </button>
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 8px", borderBottom: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: 13 };
const productColumnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, flex: "2.4 0 220px", minWidth: 220 };
const thumbnailStyle: React.CSSProperties = { width: 40, height: 40, borderRadius: 8, flexShrink: 0 };
const productNameStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const productMetaStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const sizeStyle: React.CSSProperties = { flex: "0 0 88px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const numberInputStyle: React.CSSProperties = { boxSizing: "border-box", flex: "0 0 110px", width: 110, height: 40, border: `1px solid ${colors.borderStrong}`, borderRadius: radii.sm, padding: "0 10px", color: colors.textPrimary, backgroundColor: colors.surface, font: "inherit", textAlign: "right" };
const metricStyle: React.CSSProperties = { boxSizing: "border-box", flex: "0 0 118px", width: 118, backgroundColor: "#F0FDF4", borderRadius: radii.sm, border: "1px solid #BBF7D0", padding: "4px 6px" };
const metricLabelStyle: React.CSSProperties = { display: "block", color: "#15803D", fontSize: 10, fontWeight: 800, textTransform: "uppercase" };
const metricInputStyle: React.CSSProperties = { boxSizing: "border-box", width: "100%", height: 36, border: 0, padding: "0 4px", color: colors.textPrimary, backgroundColor: "transparent", fontSize: 15, fontWeight: 700 };
const actionsStyle: React.CSSProperties = { display: "flex", flex: "0 0 140px", alignItems: "center", justifyContent: "flex-end", gap: 8 };
const editButtonStyle: React.CSSProperties = { border: 0, background: "transparent", color: colors.primary, cursor: "pointer", padding: 4 };