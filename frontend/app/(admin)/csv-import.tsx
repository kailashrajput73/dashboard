import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Header, Card } from "@/src/components/UI";
import { colors, spacing, radii, font, pointer, isWeb } from "@/src/theme";
import { Pressable } from "react-native";

type IonName = React.ComponentProps<typeof Ionicons>["name"];

const IMPORTS: { href: string; title: string; sub: string; icon: IonName; testID: string }[] = [
  {
    href: "/(admin)/import-products",
    title: "1 — Product master (full)",
    sub: "Categories, brand, code, size, image — no prices or stock",
    icon: "cube-outline",
    testID: "nav-import-products",
  },
  {
    href: "/(admin)/import-products-batch",
    title: "2 — Product master (batch)",
    sub: "Same format for one sub-category or brand",
    icon: "layers-outline",
    testID: "nav-import-products-batch",
  },
  {
    href: "/(admin)/import-prices",
    title: "3 — Prices & discount",
    sub: "product_code, MRP, discount % — merge only",
    icon: "pricetag-outline",
    testID: "nav-import-prices",
  },
  {
    href: "/(admin)/import-stock",
    title: "4 — Stock quantities",
    sub: "product_code + qty — or use Purchases for goods in",
    icon: "bar-chart-outline",
    testID: "nav-import-stock",
  },
];

export default function CsvImportHub() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Spreadsheet imports"
        subtitle="Four separate uploads — merge by product_code, never wipe the catalog"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.note}>
          <Text style={styles.noteText}>
            Use Purchases → Bulk CSV when stock arrives from a supplier. Use import 4 for opening counts or stocktake.
            Every product_code gets a QR in the database for scanning at the counter.
          </Text>
        </Card>
        {IMPORTS.map((row) => (
          <Pressable
            key={row.href}
            testID={row.testID}
            accessibilityRole="button"
            onPress={() => router.push(row.href as never)}
            style={({ hovered, pressed }) => [
              styles.row,
              pointer,
              isWeb && hovered && styles.rowHover,
              pressed && { opacity: 0.92 },
            ]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={row.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowSub}>{row.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  note: { backgroundColor: colors.primaryLight, marginBottom: spacing.sm },
  noteText: { color: colors.textPrimary, lineHeight: 21, fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  rowHover: { borderColor: colors.primary },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { ...font.title, color: colors.textPrimary, fontSize: 15 },
  rowSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 17 },
});
