import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Header } from "@/src/components/UI";
import { colors, spacing, radii, shadow, font, isWeb, pointer } from "@/src/theme";
import { fullSignOut, getAdmin } from "@/src/state/session";
import { getDashboardSnapshot, type DashboardSnapshot } from "@/src/api/endpoints";
import { ApiError } from "@/src/api/client";
import { API_BASE_URL, isMixedContentRisk } from "@/src/config/env";
import { getTaxonomyTabs } from "@/src/features/catalog-taxonomy/settings";
import { formatMoney } from "@/src/utils/money";

type IonName = React.ComponentProps<typeof Ionicons>["name"];

export default function AdminDashboard() {
  const router = useRouter();
  const [company, setCompany] = useState<string>("");
  const [snap, setSnap] = useState<DashboardSnapshot | null>(null);
  const [loadingSnap, setLoadingSnap] = useState(true);
  const [snapError, setSnapError] = useState<string | null>(null);
  const [showProductType, setShowProductType] = useState(true);
  const [showProductClass, setShowProductClass] = useState(true);

  const load = useCallback(async () => {
    const a = await getAdmin();
    setCompany(a?.companyName || "");
    setLoadingSnap(true);
    setSnapError(null);
    try {
      const snapshot = await getDashboardSnapshot();
      setSnap(snapshot);
      try {
        const tabs = await getTaxonomyTabs();
        setShowProductType(tabs.showProductType);
        setShowProductClass(tabs.showProductClass);
      } catch {
        /* local settings only */
      }
    } catch (e) {
      setSnap(null);
      if (e instanceof ApiError) {
        setSnapError(e.message);
      } else if (isMixedContentRisk()) {
        setSnapError(
          "Browser blocked HTTP API from this HTTPS page. Use https:// on the VPS or open admin from http://localhost Expo.",
        );
      } else {
        setSnapError("Could not load overview from the API.");
      }
    } finally {
      setLoadingSnap(false);
    }
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

  const rfq = snap?.rfqCounts || {};

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Overview"
        subtitle={company || "Live ops snapshot"}
        right={
          isWeb ? null : (
            <Pressable
              onPress={signOut}
              testID="admin-signout"
              hitSlop={10}
              accessibilityRole="button"
              style={pointer}
            >
              <Ionicons name="log-out-outline" size={22} color={colors.textPrimary} />
            </Pressable>
          )
        }
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Operations snapshot</Text>
        <Text style={styles.sectionHint}>
          Stock, RFQs, partners, and dispatch sales from live data — not full monthly analytics.
        </Text>
        {loadingSnap ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : snap ? (
          <>
            <View style={styles.statsRow}>
              <StatCard
                testID="stat-catalog"
                label="SKUs"
                value={String(snap.catalogCount)}
                icon="cube-outline"
                tint={colors.primary}
                onPress={() => router.push("/(admin)/catalog")}
              />
              <StatCard
                testID="stat-stock-units"
                label="Units in stock"
                value={formatQty(snap.totalStockUnits)}
                icon="layers-outline"
                tint={colors.secondary}
                onPress={() => router.push("/(admin)/inventory")}
              />
              <StatCard
                testID="stat-low-stock"
                label="Low stock (ROL)"
                value={String(snap.lowStockCount)}
                icon="warning-outline"
                tint={colors.warning}
                onPress={() => router.push("/(admin)/inventory")}
              />
              <StatCard
                testID="stat-rfq-pending"
                label="RFQ pending"
                value={String(rfq.pending || 0)}
                icon="time-outline"
                tint={colors.warning}
                onPress={() => router.push("/(admin)/rfqs")}
              />
              <StatCard
                testID="stat-rfq-approved"
                label="RFQ approved"
                value={String(rfq.approved || 0)}
                icon="checkmark-circle-outline"
                tint={colors.success}
                onPress={() => router.push("/(admin)/rfqs")}
              />
              <StatCard
                testID="stat-rfq-dispatched"
                label="RFQ dispatched"
                value={String(rfq.dispatched || 0)}
                icon="send-outline"
                tint={colors.primary}
                onPress={() => router.push("/(admin)/rfqs")}
              />
              <StatCard
                testID="stat-partners"
                label="Partners (KYC OK)"
                value={`${snap.partnersKycApproved}/${snap.partnersTotal}`}
                icon="people-outline"
                tint={colors.secondary}
                onPress={() => router.push("/(admin)/partners")}
              />
              <StatCard
                testID="stat-sales-7d"
                label="Dispatch value (7d)"
                value={snap.dispatchCount7d ? formatMoney(snap.dispatchValue7d) : "—"}
                icon="cash-outline"
                tint={colors.success}
                subtitle={snap.dispatchCount7d ? `${snap.dispatchCount7d} bill${snap.dispatchCount7d === 1 ? "" : "s"}` : "No dispatches yet"}
                onPress={() => router.push("/(admin)/dispatches")}
              />
            </View>

            {snap.pendingRfqs?.length ? (
              <View style={styles.panel} testID="panel-pending-rfqs">
                <Text style={styles.panelTitle}>Needs review</Text>
                {snap.pendingRfqs.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.listRow, pointer, pressed && { opacity: 0.85 }]}
                    onPress={() => router.push("/(admin)/rfqs")}
                    testID={`pending-rfq-${item.id}`}
                  >
                    <Text style={styles.rowTitle}>Partner {item.partnerId}</Text>
                    <Text style={styles.rowMeta}>{item.lineCount} line{item.lineCount === 1 ? "" : "s"} · Pending</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.twoCol}>
              <View style={[styles.panel, styles.halfPanel]} testID="panel-top-moving">
                <Text style={styles.panelTitle}>Moving fast ({snap.salesWindowDays}d)</Text>
                {snap.topMovingProducts?.length ? (
                  snap.topMovingProducts.map((item) => (
                    <View key={item.productCode} style={styles.listRow}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.rowMeta}>{item.productCode} · Qty out {formatQty(item.dispatchQty)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyHint}>No dispatch movement in window yet.</Text>
                )}
              </View>
              <View style={[styles.panel, styles.halfPanel]} testID="panel-slow-moving">
                <Text style={styles.panelTitle}>In stock, not moving ({snap.salesWindowDays}d)</Text>
                {snap.slowMovingProducts?.length ? (
                  snap.slowMovingProducts.map((item) => (
                    <View key={item.productCode} style={styles.listRow}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.rowMeta}>{item.productCode} · Stock {formatQty(item.stock)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyHint}>All stocked SKUs had some dispatch activity — or no stock data.</Text>
                )}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.panel} testID="snapshot-error">
            <Text style={styles.emptyHint}>
              {snapError || "Could not load snapshot. Check API URL and redeploy backend."}
            </Text>
            <Text style={styles.apiHint}>API: {API_BASE_URL}/api</Text>
            {isMixedContentRisk() ? (
              <Text style={styles.apiHint}>
                Mixed content: enable HTTPS on the VPS for production admin (Vercel).
              </Text>
            ) : null}
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Modules</Text>
        <View style={styles.actionGrid}>
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
            subtitle="Home photo (file or URL), rename, activate"
            icon="pricetags-outline"
            onPress={() => router.push("/(admin)/categories")}
          />
          {showProductType ? (
            <ActionRow
              testID="nav-product-type-manage"
              title="Product type"
              subtitle="CPVC, PVC, UPVC and products in each type"
              icon="funnel-outline"
              onPress={() => router.push("/(admin)/product-types")}
            />
          ) : null}
          <ActionRow
            testID="nav-subcategory-manage"
            title="Manage Subcategories"
            subtitle="Organize products under categories"
            icon="git-branch-outline"
            onPress={() => router.push("/(admin)/subcategories")}
          />
          {showProductClass ? (
            <ActionRow
              testID="nav-product-class-manage"
              title="Product class"
              subtitle="SDR11, Sch 40 and products in each class"
              icon="filter-outline"
              onPress={() => router.push("/(admin)/product-classes")}
            />
          ) : null}
          <ActionRow
            testID="nav-brand-manage"
            title="Manage Brands"
            subtitle="Brand logo (file or URL), create and link products"
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
            title="Spreadsheet imports"
            subtitle="Product master, prices, stock — separate files"
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
          <ActionRow
            testID="nav-settings"
            title="Settings"
            subtitle="Show or hide Product type and Product class tabs"
            icon="settings-outline"
            onPress={() => router.push("/(admin)/settings")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatQty(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

function StatCard(props: {
  label: string;
  value: string;
  icon: IonName;
  tint: string;
  testID?: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <View style={[styles.statIcon, { backgroundColor: props.tint + "22" }]}>
        <Ionicons name={props.icon} size={20} color={props.tint} />
      </View>
      <Text style={styles.statValue}>{props.value}</Text>
      <Text style={styles.statLabel}>{props.label}</Text>
      {props.subtitle ? <Text style={styles.statSub}>{props.subtitle}</Text> : null}
    </>
  );
  if (props.onPress) {
    return (
      <Pressable
        testID={props.testID}
        onPress={props.onPress}
        style={({ hovered, pressed }) => [
          styles.statCard,
          pointer,
          hovered && { borderColor: props.tint },
          pressed && { opacity: 0.92 },
        ]}
      >
        {inner}
      </Pressable>
    );
  }
  return (
    <View style={styles.statCard} testID={props.testID}>
      {inner}
    </View>
  );
}

function ActionRow(props: {
  title: string;
  subtitle: string;
  icon: IonName;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ hovered, pressed }) => [
        styles.actionRow,
        pointer,
        hovered && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={props.icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{props.title}</Text>
        <Text style={styles.actionSub}>{props.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: isWeb ? spacing.xl : spacing.lg, paddingBottom: 40 },
  sectionHint: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.md, marginTop: -4 },
  apiHint: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm, lineHeight: 16 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flexGrow: 1,
    flexBasis: isWeb ? 200 : "47%",
    flex: isWeb ? undefined : undefined,
    minWidth: isWeb ? 180 : undefined,
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
  statValue: { ...font.h2, color: colors.textPrimary, fontSize: isWeb ? 22 : 20 },
  statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  statSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  sectionTitle: {
    ...font.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  panelTitle: { ...font.title, color: colors.textPrimary, marginBottom: spacing.sm },
  listRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { ...font.title, fontSize: 14, color: colors.textPrimary },
  rowMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  emptyHint: { color: colors.textMuted, fontSize: 12, fontStyle: "italic" },
  twoCol: { flexDirection: isWeb ? "row" : "column", gap: spacing.md },
  halfPanel: { flex: isWeb ? 1 : undefined },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
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
    marginBottom: isWeb ? 0 : spacing.sm,
    flexGrow: 1,
    flexBasis: isWeb ? 280 : "100%",
    minWidth: isWeb ? 260 : undefined,
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
