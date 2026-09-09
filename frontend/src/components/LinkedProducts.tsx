import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { RemoteImage } from "@/src/components/RemoteImage";
import type { CatalogItem } from "@/src/api/endpoints";
import { colors, font, pointer, radii, spacing } from "@/src/theme";
import { formatMoney } from "@/src/utils/money";
import { sizeInchLabel, sizeLengthLabel, sizeMmLabel } from "@/src/utils/size";

export function ProductPeekList(props: {
  products: CatalogItem[];
  emptyText?: string;
}) {
  if (!props.products.length) {
    return <Text style={styles.empty}>{props.emptyText || "No products in this list."}</Text>;
  }
  return (
    <View style={styles.wrap}>
      {props.products.map((item) => (
        <View key={item.id} style={styles.row} testID={`peek-product-${item.id}`}>
          <RemoteImage uri={item.imageUrl} style={styles.thumb} placeholderSize={16} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.productCode || "No code"} · {item.brand || "No brand"}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              size {sizeMmLabel(item) || "—"} · inch {sizeInchLabel(item) || "—"} · length {sizeLengthLabel(item) || "—"}
            </Text>
          </View>
          <Text style={styles.price}>₹{formatMoney(item.sellingPrice ?? item.standardRate)}</Text>
        </View>
      ))}
    </View>
  );
}

export function ProductCountButton(props: {
  count: number;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const label = `${props.count} product${props.count === 1 ? "" : "s"}`;
  return (
    <Pressable
      testID={props.testID}
      onPress={props.onPress}
      accessibilityRole="button"
      style={({ hovered, pressed }) => [
        styles.countBtn,
        pointer,
        props.selected && styles.countBtnOpen,
        (hovered || pressed) && { opacity: 0.88 },
      ]}
    >
      <Text style={[styles.countBtnText, props.selected && styles.countBtnTextOpen]}>{label}</Text>
      <Ionicons
        name={props.selected ? "chevron-up" : "chevron-down"}
        size={14}
        color={props.selected ? "#FFFFFF" : colors.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.bg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  name: { ...font.title, color: colors.textPrimary, fontSize: 14 },
  meta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  price: { ...font.title, color: colors.textPrimary, fontSize: 13 },
  empty: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.sm, paddingHorizontal: 4 },
  countBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
  },
  countBtnOpen: { backgroundColor: colors.primary },
  countBtnText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  countBtnTextOpen: { color: "#FFFFFF" },
});
