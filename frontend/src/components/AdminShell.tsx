import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, font, isWeb, pointer, spacing } from "@/src/theme";
import { fullSignOut, getAdmin } from "@/src/state/session";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  testID: string;
};

type NavSection = { title: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "grid-outline", testID: "sidebar-dashboard" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/catalog", label: "Products", icon: "cube-outline", testID: "sidebar-catalog" },
      { href: "/categories", label: "Categories", icon: "pricetags-outline", testID: "sidebar-categories" },
      { href: "/subcategories", label: "Subcategories", icon: "git-branch-outline", testID: "sidebar-subcategories" },
      { href: "/brands", label: "Brands", icon: "ribbon-outline", testID: "sidebar-brands" },
      { href: "/product-groups", label: "Product groups", icon: "layers-outline", testID: "sidebar-product-groups" },
      { href: "/csv-import", label: "CSV import", icon: "cloud-upload-outline", testID: "sidebar-csv-import" },
    ],
  },
  {
    title: "Warehouse",
    items: [
      { href: "/racks", label: "Racks", icon: "grid-outline", testID: "sidebar-racks" },
      { href: "/purchases", label: "Purchases", icon: "cart-outline", testID: "sidebar-purchases" },
      { href: "/inventory", label: "Inventory", icon: "bar-chart-outline", testID: "sidebar-inventory" },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/rfqs", label: "RFQs", icon: "document-text-outline", testID: "sidebar-rfqs" },
      { href: "/partners", label: "Partners", icon: "people-outline", testID: "sidebar-partners" },
      { href: "/dispatches", label: "Dispatch", icon: "barcode-outline", testID: "sidebar-dispatches" },
      { href: "/money-config", label: "Money config", icon: "cash-outline", testID: "sidebar-money-config" },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/team", label: "Team", icon: "shield-outline", testID: "sidebar-team" },
    ],
  },
];

const AUTH_PATHS = ["/login", "/register"];

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.endsWith(p));
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.endsWith(href);
}

export function AdminShell({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [company, setCompany] = useState("");

  useEffect(() => {
    getAdmin().then((a) => setCompany(a?.companyName || ""));
  }, [pathname]);

  const signOut = useCallback(async () => {
    await fullSignOut();
    router.replace("/(admin)/login");
  }, [router]);

  if (!isWeb || isAuthPath(pathname)) {
    return <>{children ?? <Slot />}</>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.sidebar}>
        <View style={styles.brand}>
          <Text style={styles.brandName}>Admin</Text>
          <Text style={styles.brandSub} numberOfLines={1}>
            {company || "Dashboard"}
          </Text>
        </View>
        <ScrollView style={styles.navScroll} contentContainerStyle={styles.navContent}>
          {NAV.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Pressable
                    key={item.href}
                    testID={item.testID}
                    accessibilityRole="link"
                    onPress={() => router.push(item.href as any)}
                    style={({ hovered, pressed }) => [
                      styles.navItem,
                      pointer,
                      active && styles.navItemActive,
                      hovered && !active && styles.navItemHover,
                      pressed && styles.navItemPressed,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
        <Pressable
          testID="sidebar-signout"
          accessibilityRole="button"
          onPress={signOut}
          style={({ hovered, pressed }) => [
            styles.signOut,
            pointer,
            hovered && styles.navItemHover,
            pressed && styles.navItemPressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.navLabel}>Sign out</Text>
        </Pressable>
      </View>
      <View style={styles.main}>{children ?? <Slot />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: colors.bg, minHeight: 0 },
  sidebar: {
    width: 240,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  brand: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  brandName: { ...font.h3, color: colors.textPrimary },
  brandSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  navScroll: { flex: 1 },
  navContent: { paddingHorizontal: spacing.sm, paddingBottom: spacing.lg },
  section: { marginTop: spacing.md },
  sectionTitle: {
    ...font.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    paddingHorizontal: spacing.sm,
    marginBottom: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: { backgroundColor: colors.primaryLight },
  navItemHover: { backgroundColor: "#F1F5F9" },
  navItemPressed: { opacity: 0.85 },
  navLabel: { fontSize: 13, fontWeight: "500", color: colors.textSecondary, flex: 1 },
  navLabelActive: { color: colors.primary, fontWeight: "700" },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
});
