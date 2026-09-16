import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { ErrorModal, Header, Input } from "@/src/components/UI";
import { ProductCountButton, ProductPeekList } from "@/src/components/LinkedProducts";
import { inferProductClass } from "@/src/utils/csv";
import { listCatalog, type CatalogItem } from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";

export type CatalogFacet = { id: string; name: string; count: number };

export function groupCatalogFacet(
  products: CatalogItem[],
  valueOf: (item: CatalogItem) => string | undefined,
): CatalogFacet[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const item of products) {
    const raw = (valueOf(item) || inferProductClass(item) || "").trim();
    if (!raw) continue;
    const id = raw.toLowerCase();
    const current = map.get(id);
    if (current) current.count += 1;
    else map.set(id, { name: raw, count: 1 });
  }
  return [...map.entries()]
    .map(([id, row]) => ({ id, name: row.name, count: row.count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function CatalogFacetPage(props: {
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  valueOf: (item: CatalogItem) => string | undefined;
  testID: string;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProducts((await listCatalog()) || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load products");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const facets = useMemo(() => groupCatalogFacet(products, props.valueOf), [products, props.valueOf]);
  const filtered = useMemo(
    () => facets.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())),
    [facets, query],
  );

  function productsFor(facet: CatalogFacet) {
    return products.filter((item) => {
      const value = (props.valueOf(item) || inferProductClass(item) || "").toLowerCase();
      return value === facet.id;
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title={props.title}
        subtitle={`${filtered.length} of ${facets.length}`}
        onBack={() => router.back()}
      />
      <View style={styles.controls}>
        <Input
          testID={`${props.testID}-search`}
          value={query}
          onChangeText={setQuery}
          placeholder={props.searchPlaceholder}
          style={styles.search}
        />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{props.emptyText}</Text>}
          renderItem={({ item }) => {
            const open = openId === item.id;
            const listed = productsFor(item);
            return (
              <View style={styles.card} testID={`${props.testID}-row-${item.id}`}>
                <View style={styles.row}>
                  <View style={styles.rowMain}>
                    <Text style={styles.name}>{item.name}</Text>
                    <ProductCountButton
                      count={listed.length}
                      selected={open}
                      onPress={() => setOpenId(open ? null : item.id)}
                      testID={`${props.testID}-products-${item.id}`}
                    />
                  </View>
                </View>
                {open ? <ProductPeekList products={listed} emptyText={`No products in ${item.name}.`} /> : null}
              </View>
            );
          }}
        />
      )}
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: { marginBottom: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowMain: { flex: 1, gap: 8 },
  name: { ...font.title, color: colors.textPrimary },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
});
