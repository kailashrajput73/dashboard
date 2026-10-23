import { inferProductClass } from "../../utils/infer-product-class";
import type { CatalogItem } from "../../api/endpoints";
import { Icon } from "../../components/Icon";
import { RemoteImage } from "../../components/RemoteImage";
import { colors, radii } from "../../theme";
import { sizeLengthLabel, sizeMmLabel } from "../../utils/size";

export function CatalogProductListRow(props: {
  item: CatalogItem;
  selected?: boolean;
  selectionEnabled?: boolean;
  onToggleSelect?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive?: () => void;
  togglingActive?: boolean;
}) {
  const { item } = props;
  const active = item.isActive !== false;
  const className = inferProductClass(item);
  const subcategory = (item.subcategory || "").trim();
  const typeName = (item.type || "").trim();
  const sizeLine = [sizeMmLabel(item), sizeLengthLabel(item)].filter(Boolean).join(" · ") || "—";
  const mrp = item.mrp == null ? "—" : String(item.mrp);
  const discount = item.discount == null ? "—" : `${item.discount}%`;
  const selling = String(item.sellingPrice ?? item.standardRate ?? "—");
  const stock = item.stock == null ? "0" : String(item.stock);

  return (
    <div
      style={{
        ...rowStyle,
        opacity: active ? 1 : 0.72,
        backgroundColor: active ? colors.surface : colors.bg,
      }}
      data-testid={`admin-item-${item.id}`}
    >
      {props.selectionEnabled ? (
        <label style={selectCellStyle}>
          <input
            type="checkbox"
            checked={Boolean(props.selected)}
            onChange={() => props.onToggleSelect?.()}
            data-testid={`select-item-${item.id}`}
            aria-label={`Select ${item.name}`}
          />
        </label>
      ) : null}
      <div style={productCellStyle}>
        <RemoteImage uri={item.imageUrl} style={thumbnailStyle} placeholderSize={20} />
        <div style={textBlockStyle}>
          <div style={nameStyle} title={item.name}>
            {item.name}
          </div>
          <div style={metaStyle}>
            {item.productCode || "No code"} · {item.brand || "No brand"}
          </div>
          <div style={chipRowStyle}>
            {subcategory ? <span style={chipStyle}>{subcategory}</span> : null}
            {className ? <span style={chipStyle}>{className}</span> : null}
            {typeName ? <span style={chipStyleMuted}>{typeName}</span> : null}
          </div>
        </div>
      </div>
      <span style={sizeCellStyle} title={sizeLine}>
        {sizeLine}
      </span>
      <span style={metricCellStyle}>{mrp}</span>
      <span style={metricCellStyle}>{discount}</span>
      <span style={metricCellStyle}>{selling}</span>
      <span style={metricCellStyle}>{stock}</span>
      <div style={actionsCellStyle}>
        <button
          type="button"
          onClick={props.onToggleActive}
          disabled={props.togglingActive || !props.onToggleActive}
          data-testid={`toggle-active-${item.id}`}
          title={active ? "Set inactive" : "Set active"}
          aria-label={active ? "Set product inactive" : "Set product active"}
          style={{
            ...statusBtnStyle,
            borderColor: active ? colors.success : colors.borderStrong,
            color: active ? colors.success : colors.textMuted,
            backgroundColor: active ? colors.successBg : colors.surface,
          }}
        >
          {props.togglingActive ? "…" : active ? "Active" : "Inactive"}
        </button>
        <button
          type="button"
          onClick={props.onEdit}
          aria-label={`Edit ${item.name}`}
          data-testid={`edit-item-${item.id}`}
          style={iconButtonStyle}
        >
          <Icon name="create-outline" size={18} color={colors.primary} />
        </button>
        <button
          type="button"
          onClick={props.onDelete}
          aria-label={`Delete ${item.name}`}
          title="Delete product"
          data-testid={`delete-item-${item.id}`}
          style={iconButtonStyle}
        >
          <Icon name="trash-outline" size={18} color={colors.error} />
        </button>
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "var(--pm-row-cols, minmax(200px, 2fr) 120px 72px 72px 72px 56px 140px)",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderBottom: `1px solid ${colors.border}`,
  fontSize: 13,
  color: colors.textPrimary,
  backgroundColor: colors.surface,
};

const selectCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  flexShrink: 0,
};

const productCellStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
};

const thumbnailStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: radii.sm,
  flexShrink: 0,
  objectFit: "cover",
};

const textBlockStyle: React.CSSProperties = { minWidth: 0, flex: 1 };

const nameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const metaStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: 11,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const chipRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  marginTop: 4,
};

const chipStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.3,
  padding: "2px 6px",
  borderRadius: 999,
  backgroundColor: colors.primaryLight,
  color: colors.primary,
};

const chipStyleMuted: React.CSSProperties = {
  ...chipStyle,
  backgroundColor: colors.bg,
  color: colors.textSecondary,
  fontWeight: 600,
};

const sizeCellStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: colors.textSecondary,
  fontSize: 12,
};

const metricCellStyle: React.CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  fontSize: 12,
};

const actionsCellStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 4,
  position: "sticky",
  right: 0,
  backgroundColor: "inherit",
  paddingLeft: 8,
  boxShadow: "-8px 0 12px -8px rgba(15, 23, 42, 0.12)",
};

const statusBtnStyle: React.CSSProperties = {
  height: 28,
  padding: "0 8px",
  borderRadius: 999,
  border: "1px solid",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  cursor: "pointer",
  flexShrink: 0,
};

const iconButtonStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  cursor: "pointer",
  padding: 4,
};
