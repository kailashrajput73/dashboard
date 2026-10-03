import type { CatalogItem } from "../api/endpoints";
import { formatMoney } from "../utils/money";
import {
  sizeInchLabel,
  sizeLengthLabel,
  sizeMmLabel,
} from "../utils/size";
import { colors, font, radii, spacing } from "../theme";
import { Icon } from "./Icon";
import { RemoteImage } from "./RemoteImage";

export function CountButton(props: {
  count: number;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const [label, suffix] = [
    `${props.count} product${props.count === 1 ? "" : "s"}`,
    props.selected ? "chevron-up" : "chevron-down",
  ] as const;

  return (
    <button
      type="button"
      data-testid={props.testID}
      onClick={props.onPress}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginTop: spacing.sm,
        padding: "6px 10px",
        border: 0,
        borderRadius: radii.pill,
        backgroundColor: props.selected ? colors.primary : colors.primaryLight,
        color: props.selected ? "#FFFFFF" : colors.primary,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
      <Icon
        name={suffix}
        size={14}
        color={props.selected ? "#FFFFFF" : colors.primary}
      />
    </button>
  );
}

export function List(props: {
  products: CatalogItem[];
  emptyText?: string;
}) {
  if (!props.products.length) {
    return (
      <div
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          marginTop: spacing.sm,
          padding: "0 4px",
        }}
      >
        {props.emptyText || "No products in this list."}
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: spacing.sm,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        overflow: "hidden",
        backgroundColor: colors.bg,
      }}
    >
      {props.products.map((item, index) => (
        <div
          key={item.id}
          data-testid={`peek-product-${item.id}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            padding: spacing.sm,
            borderBottom:
              index < props.products.length - 1
                ? `1px solid ${colors.border}`
                : undefined,
          }}
        >
          <RemoteImage
            uri={item.imageUrl}
            style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}
            placeholderSize={16}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...font.title, color: colors.textPrimary, fontSize: 14 }}>
              {item.name}
            </div>
            <div style={metadataStyle}>
              {item.productCode || "No code"} · {item.brand || "No brand"}
            </div>
            <div style={metadataStyle}>
              size {sizeMmLabel(item) || "—"} · inch {sizeInchLabel(item) || "—"} ·
              length {sizeLengthLabel(item) || "—"}
            </div>
          </div>
          <div
            style={{
              ...font.title,
              color: colors.textPrimary,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            ₹{formatMoney(item.sellingPrice ?? item.standardRate)}
          </div>
        </div>
      ))}
    </div>
  );
}

const metadataStyle: React.CSSProperties = {
  overflow: "hidden",
  color: colors.textSecondary,
  fontSize: 11,
  marginTop: 2,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
