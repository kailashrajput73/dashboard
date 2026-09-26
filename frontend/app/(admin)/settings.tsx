import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useRouter } from "expo-router";

import { Header, Card, Button, ErrorModal } from "@/src/components/UI";
import { PasscodeConfirmModal } from "@/src/components/PasscodeConfirmModal";
import { colors, font, pointer, radii, spacing } from "@/src/theme";
import { getTaxonomyTabs, setTaxonomyTabs, type TaxonomyTabs } from "@/src/features/catalog-taxonomy/settings";
import { wipeCatalogAll } from "@/src/api/endpoints";
import { ApiError } from "@/src/api/client";

export default function AdminSettings() {
  const router = useRouter();
  const [tabs, setTabs] = useState<TaxonomyTabs>({ showProductType: true, showProductClass: true });
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setTabs(await getTaxonomyTabs());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(key: keyof TaxonomyTabs) {
    const next = { ...tabs, [key]: !tabs[key] };
    setTabs(next);
    await setTaxonomyTabs(next);
  }

  async function runWipe(credentials: { contactNumber: string; passcode: string }) {
    setWiping(true);
    try {
      const res = await wipeCatalogAll(credentials);
      setWipeOpen(false);
      setMessage(
        `Removed ${res.catalog} products, ${res.categories} categories, ${res.subcategories} subcategories, ${res.brands} brands, ${res.productGroups} groups.`,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not wipe catalog");
    } finally {
      setWiping(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header title="Settings" subtitle="Catalog tabs and temporary maintenance" onBack={() => router.back()} />
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

        <Text style={styles.section}>Temporary — remove before production</Text>
        <Card style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Wipe entire catalog</Text>
          <Text style={styles.dangerHint}>
            Deletes all products, categories, subcategories, brands, product groups, and pricing history. Requires admin contact and passcode. Use before a clean master import.
          </Text>
          <View style={{ height: spacing.md }} />
          <Button
            testID="open-wipe-catalog"
            title="Delete all catalog data…"
            variant="danger"
            icon="trash-outline"
            onPress={() => setWipeOpen(true)}
            fullWidth
          />
        </Card>
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </View>

      <PasscodeConfirmModal
        visible={wipeOpen}
        title="Wipe all catalog data"
        message="This cannot be undone. Enter your admin login contact and passcode."
        confirmLabel="Delete everything"
        loading={wiping}
        onClose={() => setWipeOpen(false)}
        onConfirm={runWipe}
      />
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
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
  section: { ...font.title, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  dangerCard: { borderColor: colors.error, backgroundColor: colors.errorBg },
  dangerTitle: { ...font.title, color: colors.error },
  dangerHint: { color: colors.textSecondary, lineHeight: 20, marginTop: spacing.sm },
  success: { color: colors.success, marginTop: spacing.md, lineHeight: 20 },
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
