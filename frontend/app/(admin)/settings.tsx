import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Header } from "@/src/components/UI";
import { colors, font, pointer, radii, spacing } from "@/src/theme";
import { getTaxonomyTabs, setTaxonomyTabs, type TaxonomyTabs } from "@/src/features/catalog-taxonomy/settings";

export default function AdminSettings() {
  const router = useRouter();
  const [tabs, setTabs] = useState<TaxonomyTabs>({ showProductType: true, showProductClass: true });

  const load = useCallback(async () => {
    setTabs(await getTaxonomyTabs());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(key: keyof TaxonomyTabs) {
    const next = { ...tabs, [key]: !tabs[key] };
    setTabs(next);
    await setTaxonomyTabs(next);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header title="Settings" subtitle="Show or hide extra catalog tabs" onBack={() => router.back()} />
      <View style={styles.body}>
        <Text style={styles.hint}>
          These tabs group products from the Excel Type and Class columns. The sheet names stay Type and Class. Turn a tab off when you do not need it in the admin menu.
        </Text>
        <ToggleRow
          testID="toggle-product-type-tab"
          title="Product type"
          subtitle="Tab next to Categories. Shows CPVC, PVC, UPVC and their products."
          value={tabs.showProductType}
          onPress={() => toggle("showProductType")}
        />
        <ToggleRow
          testID="toggle-product-class-tab"
          title="Product class"
          subtitle="Tab next to Subcategories. Shows SDR11, Sch 40 and their products."
          value={tabs.showProductClass}
          onPress={() => toggle("showProductClass")}
        />
      </View>
    </SafeAreaView>
  );
}

function ToggleRow(props: {
  title: string;
  subtitle: string;
  value: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: props.value }}
      onPress={props.onPress}
      style={({ hovered, pressed }) => [
        styles.row,
        pointer,
        hovered && { borderColor: colors.primary },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{props.title}</Text>
        <Text style={styles.sub}>{props.subtitle}</Text>
      </View>
      <View style={[styles.switch, props.value && styles.switchOn]}>
        <Ionicons name={props.value ? "checkmark" : "close"} size={16} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg },
  hint: { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  title: { ...font.title, color: colors.textPrimary },
  sub: { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  switch: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  switchOn: { backgroundColor: colors.success },
});
