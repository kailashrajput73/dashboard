import { useMemo, useState } from "react";
import {
  applyCatalogPricingBulk,
  updateCatalogPricing,
  type CatalogItem,
} from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { Button, Input } from "../../components/UI";
import { colors, font, radii, spacing } from "../../theme";
import { formatMoney } from "../../utils/money";
import { sellingFromMrpDiscount } from "../../utils/pricing";
import {
  sizeInchLabel,
  sizeLengthLabel,
  sizeMmLabel,
} from "../../utils/size";

type RowDraft = { mrp: string; discount: string; selling: string };

function draftFrom(item: CatalogItem): RowDraft {
  const mrp = Number(item.mrp ?? item.standardRate ?? 0);
  const discount = Number(item.discount ?? 0);
  const selling = Number(
    item.sellingPrice ?? item.standardRate ?? sellingFromMrpDiscount(mrp, discount),
  );
  return {
    mrp: String(mrp || ""),
    discount: String(discount || ""),
    selling: String(selling || ""),
  };
}

export function ShelfPriceBoard(props: {
  title: string;
  products: CatalogItem[];
  onSaved?: () => Promise<void> | void;
}) {
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [boardDiscount, setBoardDiscount] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const products = props.products;

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of products) {
      const key = sizeLengthLabel(item) || "No length";
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [products]);

  function row(item: CatalogItem): RowDraft {
    return drafts[item.id] || draftFrom(item);
  }

  function patch(
    item: CatalogItem,
    next: Partial<RowDraft>,
    recalc?: "fromMrpDisc" | "fromSelling",
  ) {
    setDrafts((current) => {
      const base = current[item.id] || draftFrom(item);
      const merged = { ...base, ...next };
      const mrp = Number(merged.mrp);
      const discount = Number(merged.discount);
      const selling = Number(merged.selling);
      if (recalc === "fromMrpDisc" && Number.isFinite(mrp)) {
        merged.selling = String(
          sellingFromMrpDiscount(
            mrp,
            Number.isFinite(discount) ? discount : 0,
          ),
        );
      }
      if (
        recalc === "fromSelling" &&
        Number.isFinite(mrp) &&
        mrp > 0 &&
        Number.isFinite(selling)
      ) {
        merged.discount = String(
          Math.round((1 - selling / mrp) * 10000) / 100,
        );
      }
      return { ...current, [item.id]: merged };
    });
  }

  async function saveRow(item: CatalogItem) {
    const draft = row(item);
    const mrp = Number(draft.mrp);
    const discount = Number(draft.discount || 0);
    const selling = Number(draft.selling);
    if (!Number.isFinite(mrp) || mrp < 0) {
      setError("MRP must be a number.");
      return;
    }
    setBusyId(item.id);
    setError(null);
    try {
      await updateCatalogPricing(item, {
        mrp,
        discount: Number.isFinite(discount) ? discount : 0,
        sellingPrice: Number.isFinite(selling)
          ? selling
          : sellingFromMrpDiscount(mrp, discount),
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      await props.onSaved?.();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Could not save this size.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function applyDiscountToBoard() {
    const discount = Number(boardDiscount);
    if (!Number.isFinite(discount) || discount < 0) {
      setError("Enter a discount percent for every size on this board.");
      return;
    }
    setBusyId("board");
    setError(null);
    try {
      await applyCatalogPricingBulk(products, { discount });
      setDrafts({});
      await props.onSaved?.();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not apply board discount.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!products.length) {
    return <div style={emptyStyle}>No SKUs on this board yet.</div>;
  }

  return (
    <section style={boardStyle} data-testid="shelf-price-board">
      <div style={kickerStyle}>SHELF PRICE BOARD</div>
      <div style={titleStyle}>{props.title}</div>
      <div style={hintStyle}>
        Same prices as Manage Catalog — this board is for a pipe family (sizes
        in one table). Set one discount for every size, or edit a single row.
      </div>
      <div style={bulkStyle}>
        <Input
          testID="shelf-board-discount"
          label="Discount % for all sizes"
          value={boardDiscount}
          onChangeText={setBoardDiscount}
          keyboardType="decimal-pad"
          placeholder="e.g. 25"
          style={{ flex: 1, marginBottom: 0 }}
        />
        <Button
          testID="shelf-board-apply-discount"
          title="Apply to all sizes"
          size="sm"
          onPress={() => void applyDiscountToBoard()}
          loading={busyId === "board"}
          disabled={!products.length}
        />
      </div>
      {error ? <div style={errorStyle}>{error}</div> : null}
      {grouped.map(([length, rows]) => (
        <div key={length} style={lengthBlockStyle}>
          <div style={lengthStyle}>{length}</div>
          {rows.map((item) => {
            const draft = row(item);
            const saving = busyId === item.id;
            return (
              <div
                key={item.id}
                style={skuStyle}
                data-testid={`shelf-sku-${item.id}`}
              >
                <div style={skuHeadStyle}>
                  <div style={codeStyle}>{item.productCode || "No code"}</div>
                  <div style={sizeStyle}>
                    {sizeMmLabel(item) || "—"} · {sizeInchLabel(item) || "—"}
                  </div>
                </div>
                <div style={fieldsStyle}>
                  <Input
                    label="MRP"
                    value={draft.mrp}
                    onChangeText={(value) =>
                      patch(item, { mrp: value }, "fromMrpDisc")
                    }
                    keyboardType="decimal-pad"
                    style={fieldStyle}
                  />
                  <Input
                    label="Disc %"
                    value={draft.discount}
                    onChangeText={(value) =>
                      patch(item, { discount: value }, "fromMrpDisc")
                    }
                    keyboardType="decimal-pad"
                    style={fieldStyle}
                  />
                  <Input
                    label="Sell"
                    value={draft.selling}
                    onChangeText={(value) =>
                      patch(item, { selling: value }, "fromSelling")
                    }
                    keyboardType="decimal-pad"
                    style={fieldStyle}
                  />
                </div>
                <div style={skuFootStyle}>
                  <div style={liveStyle}>₹{formatMoney(Number(draft.selling) || 0)}</div>
                  {saving ? (
                    <span
                      className="web-button-spinner"
                      role="status"
                      aria-label="Saving size"
                    />
                  ) : (
                    <Button
                      title="Save size"
                      size="sm"
                      variant="secondary"
                      onPress={() => void saveRow(item)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

const boardStyle: React.CSSProperties = {
  marginTop: spacing.sm,
  backgroundColor: "#FFF7ED",
  border: "1px solid #FDBA74",
  borderRadius: radii.md,
  padding: spacing.md,
};

const kickerStyle: React.CSSProperties = {
  color: "#9A3412",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0.8,
};

const titleStyle: React.CSSProperties = {
  ...font.title,
  color: "#7C2D12",
  marginTop: 2,
};

const hintStyle: React.CSSProperties = {
  color: "#9A3412",
  fontSize: 12,
  lineHeight: "18px",
  marginTop: 6,
  marginBottom: spacing.sm,
};

const bulkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: spacing.sm,
  marginBottom: spacing.sm,
};

const errorStyle: React.CSSProperties = {
  color: colors.error,
  fontSize: 12,
  marginBottom: spacing.sm,
};

const lengthBlockStyle: React.CSSProperties = { marginTop: spacing.sm };

const lengthStyle: React.CSSProperties = {
  color: "#9A3412",
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 6,
};

const skuStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: radii.sm,
  border: "1px solid #FED7AA",
  padding: spacing.sm,
  marginBottom: spacing.sm,
};

const skuHeadStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: spacing.sm,
  marginBottom: 4,
};

const codeStyle: React.CSSProperties = {
  color: colors.textPrimary,
  fontWeight: 700,
  fontSize: 13,
  flex: 1,
  minWidth: 0,
};

const sizeStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const fieldsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: spacing.sm,
};

const fieldStyle: React.CSSProperties = { minWidth: 0, marginBottom: 0 };

const skuFootStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
  marginTop: spacing.sm,
};

const liveStyle: React.CSSProperties = {
  ...font.title,
  color: "#9A3412",
  fontSize: 16,
};

const emptyStyle: React.CSSProperties = {
  color: colors.textSecondary,
  fontSize: 13,
  marginTop: spacing.sm,
};