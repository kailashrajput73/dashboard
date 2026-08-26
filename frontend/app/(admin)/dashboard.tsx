import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Header } from "@/src/components/UI";
import { colors, spacing, radii, shadow, font } from "@/src/theme";
import { fullSignOut, getAdmin } from "@/src/state/session";
import { listCatalog, listCategories } from "@/src/api/endpoints";

export default function AdminDashboard() {
  const router = useRouter();
  const [company, setCompany] = useState<string>("");
  const [catalogCount, setCatalogCount] = useState<number>(0);
  const [categoryCount, setCategoryCount] = useState<number>(0);

  const load = useCallback(async () => {
    const a = await getAdmin();
    setCompany(a?.companyName || "");
    try {
      const [items, cats] = await Promise.all([listCatalog(), listCategories()]);
      setCatalogCount(items?.length || 0);
      setCategoryCount(cats?.length || 0);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function signOut() {
    await fullSignOut();
    router.replace("/(admin)/login");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Admin"
        subtitle={company || "Manage your business"}
        right={
          <TouchableOpacity onPress={signOut} testID="admin-signout" hitSlop={10}>
            <Ionicons name="log-out-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.statsRow}>
          <StatCard
            testID="stat-catalog"
            label="Catalog items"
            value={String(catalogCount)}
            icon="cube-outline"
            tint={colors.primary}
          />
          <StatCard
            testID="stat-categories"
            label="Categories"
            value={String(categoryCount)}
            icon="pricetags-outline"
            tint={colors.secondary}
          />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <ActionRow
          testID="nav-catalog-manage"
          title="Manage Catalog"
          subtitle="Add, edit, and remove items"
          icon="list-outline"
          onPress={() => router.push("/(admin)/catalog")}
        />
        <ActionRow
          testID="nav-category-manage"
          title="Manage Categories"
          subtitle="Create, rename, and deactivate categories"
          icon="pricetags-outline"
          onPress={() => router.push("/(admin)/categories")}
        />
        <ActionRow
          testID="nav-subcategory-manage"
          title="Manage Subcategories"
          subtitle="Organize products under categories"
          icon="git-branch-outline"
          onPress={() => router.push("/(admin)/subcategories")}
        />
        <ActionRow
          testID="nav-brand-manage"
          title="Manage Brands"
          subtitle="Create brands and link them to products"
          icon="ribbon-outline"
          onPress={() => router.push("/(admin)/brands")}
        />
        <ActionRow
          testID="nav-product-group-manage"
          title="Manage Product Groups"
          subtitle="Create groups with multiple products"
          icon="layers-outline"
          onPress={() => router.push("/(admin)/product-groups")}
        />
        <ActionRow
          testID="nav-rack-manage"
          title="Rack Locations"
          subtitle="Configure warehouse storage slots"
          icon="grid-outline"
          onPress={() => router.push("/(admin)/racks")}
        />
        <ActionRow
          testID="nav-purchase-manage"
          title="Purchase Management"
          subtitle="Receive stock and view purchase history"
          icon="cart-outline"
          onPress={() => router.push("/(admin)/purchases")}
        />
        <ActionRow
          testID="nav-rfq-manage"
          title="RFQ Management"
          subtitle="Review quotations, rewards, and delivery"
          icon="document-text-outline"
          onPress={() => router.push("/(admin)/rfqs")}
        />
        <ActionRow
          testID="nav-partner-manage"
          title="Referral Partners"
          subtitle="Review KYC, rewards, and partner performance"
          icon="people-outline"
          onPress={() => router.push("/(admin)/partners")}
        />
        <ActionRow
          testID="nav-dispatch-manage"
          title="Dispatch & Billing"
          subtitle="Scan products, bill retail, and dispatch RFQs"
          icon="barcode-outline"
          onPress={() => router.push("/(admin)/dispatches")}
        />
        <ActionRow
          testID="nav-inventory-manage"
          title="Stock & Inventory"
          subtitle="Live stock, valuation, and low-stock reports"
          icon="bar-chart-outline"
          onPress={() => router.push("/(admin)/inventory")}
        />
        <ActionRow
          testID="nav-team-manage"
          title="Team Management"
          subtitle="Manage users, roles, and permissions"
          icon="people-outline"
          onPress={() => router.push("/(admin)/team")}
        />
        <ActionRow
          testID="nav-csv-import"
          title="Import CSV"
          subtitle="Bulk-add items from a spreadsheet"
          icon="cloud-upload-outline"
          onPress={() => router.push("/(admin)/csv-import")}
        />
        <ActionRow
          testID="nav-money-config"
          title="Money Configuration"
          subtitle="Discounts, GST & visibility"
          icon="cash-outline"
          onPress={() => router.push("/(admin)/money-config")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard(props: {
  label: string;
  value: string;
  icon: keyof typeof import("@expo/vector-icons/Ionicons").glyphMap;
  tint: string;
  testID?: string;
}) {
  return (
    <View style={styles.statCard} testID={props.testID}>
      <View style={[styles.statIcon, { backgroundColor: props.tint + "22" }]}>
        <Ionicons name={props.icon} size={20} color={props.tint} />
      </View>
      <Text style={styles.statValue}>{props.value}</Text>
      <Text style={styles.statLabel}>{props.label}</Text>
    </View>
  );
}

function ActionRow(props: {
  title: string;
  subtitle: string;
  icon: keyof typeof import("@expo/vector-icons/Ionicons").glyphMap;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={props.testID}
      activeOpacity={0.7}
      onPress={props.onPress}
      style={styles.actionRow}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={props.icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{props.title}</Text>
        <Text style={styles.actionSub}>{props.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: 40 },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { ...font.h2, color: colors.textPrimary },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  sectionTitle: {
    ...font.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  actionRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { ...font.title, color: colors.textPrimary },
  actionSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
