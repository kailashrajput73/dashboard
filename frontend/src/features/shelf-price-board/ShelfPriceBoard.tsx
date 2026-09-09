// FEATURE: shelf-price-board
import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Button, Input } from "@/src/components/UI";
import { applyCatalogPricingBulk, updateCatalogPricing, type CatalogItem } from "@/src/api/endpoints";
import { ApiError } from "@/src/api/client";
import { colors, font, radii, spacing } from "@/src/theme";
import { formatMoney } from "@/src/utils/money";
import { sellingFromMrpDiscount } from "@/src/utils/pricing";
import { sizeInchLabel, sizeLengthLabel, sizeMmLabel } from "@/src/utils/size";

type RowDraft = { mrp: string; discount: string; selling: string };

function draftFrom(item: CatalogItem): RowDraft {
  const mrp = Number(item.mrp ?? item.standardRate ?? 0);
  const discount = Number(item.discount ?? 0);
  const selling = Number(item.sellingPrice ?? item.standardRate ?? sellingFromMrpDiscount(mrp, discount));
  return { mrp: String(mrp || ""), discount: String(discount || ""), selling: String(selling || "") };
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

  function patch(item: CatalogItem, next: Partial<RowDraft>, recalc?: "fromMrpDisc" | "fromSelling") {
    setDrafts((current) => {
      const base = current[item.id] || draftFrom(item);
      const merged = { ...base, ...next };
      const mrp = Number(merged.mrp);
      const disc = Number(merged.discount);
      const sell = Number(merged.selling);
      if (recalc === "fromMrpDisc" && Number.isFinite(mrp)) {
        merged.selling = String(sellingFromMrpDiscount(mrp, Number.isFinite(disc) ? disc : 0));
      }
      if (recalc === "fromSelling" && Number.isFinite(mrp) && mrp > 0 && Number.isFinite(sell)) {
        merged.discount = String(Math.round((1 - sell / mrp) * 10000) / 100);
      }
      return { ...current, [item.id]: merged };
    });
  }

  async function saveRow(item: CatalogItem) {
    const d = row(item);
    const mrp = Number(d.mrp);
    const discount = Number(d.discount || 0);
    const selling = Number(d.selling);
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
        sellingPrice: Number.isFinite(selling) ? selling : sellingFromMrpDiscount(mrp, discount),
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      await props.onSaved?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save this size.");
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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not apply board discount.");
    } finally {
      setBusyId(null);
    }
  }

  if (!products.length) {
    return <Text style={styles.empty}>No SKUs on this board yet.</Text>;
  }

  return (
    <View style={styles.board} testID="shelf-price-board">
      <Text style={styles.kicker}>SHELF PRICE BOARD</Text>
      <Text style={styles.title}>{props.title}</Text>
      <Text style={styles.hint}>
        Same prices as Manage Catalog — this board is for a pipe family (sizes in one table). Set one discount for every size, or edit a single row.
      </Text>
      <View style={styles.bulk}>
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
          onPress={applyDiscountToBoard}
          loading={busyId === "board"}
          disabled={!products.length}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {grouped.map(([length, rows]) => (
        <View key={length} style={styles.lengthBlock}>
          <Text style={styles.length}>{length}</Text>
          {rows.map((item) => {
            const d = row(item);
            const saving = busyId === item.id;
            return (
              <View key={item.id} style={styles.sku} testID={`shelf-sku-${item.id}`}>
                <View style={styles.skuHead}>
                  <Text style={styles.code}>{item.productCode || "No code"}</Text>
                  <Text style={styles.size}>
                    {sizeMmLabel(item) || "—"} · {sizeInchLabel(item) || "—"}
                  </Text>
                </View>
                <View style={styles.fields}>
                  <Input
                    label="MRP"
                    value={d.mrp}
                    onChangeText={(v) => patch(item, { mrp: v }, "fromMrpDisc")}
                    keyboardType="decimal-pad"
                    style={styles.field}
                  />
                  <Input
                    label="Disc %"
                    value={d.discount}
                    onChangeText={(v) => patch(item, { discount: v }, "fromMrpDisc")}
                    keyboardType="decimal-pad"
                    style={styles.field}
                  />
                  <Input
                    label="Sell"
                    value={d.selling}
                    onChangeText={(v) => patch(item, { selling: v }, "fromSelling")}
                    keyboardType="decimal-pad"
                    style={styles.field}
                  />
                </View>
                <View style={styles.skuFoot}>
                  <Text style={styles.live}>₹{formatMoney(Number(d.selling) || 0)}</Text>
                  {saving ? <ActivityIndicator color={colors.primary} /> : (
                    <Button title="Save size" size="sm" variant="secondary" onPress={() => saveRow(item)} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    marginTop: spacing.sm,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: radii.md,
    padding: spacing.md,
  },
  kicker: { color: "#9A3412", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  title: { ...font.title, color: "#7C2D12", marginTop: 2 },
  hint: { color: "#9A3412", fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: spacing.sm },
  bulk: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, marginBottom: spacing.sm },
  error: { color: colors.error, fontSize: 12, marginBottom: spacing.sm },
  lengthBlock: { marginTop: spacing.sm },
  length: { color: "#9A3412", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  sku: {
    backgroundColor: "#FFFFFF",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  skuHead: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, marginBottom: 4 },
  code: { color: colors.textPrimary, fontWeight: "700", fontSize: 13, flex: 1 },
  size: { color: colors.textSecondary, fontSize: 12 },
  fields: { flexDirection: "row", gap: spacing.sm },
  field: { flex: 1, marginBottom: 0 },
  skuFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  live: { ...font.title, color: "#9A3412", fontSize: 16 },
  empty: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.sm },
});
