// Bootstrap route — sends admins to the dashboard or login screen.

import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { getAdmin } from "@/src/state/session";
import { colors } from "@/src/theme";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const a = await getAdmin();
      router.replace(a ? "/(admin)/dashboard" : "/(admin)/login");
    })();
  }, [router]);

  return (
    <View style={styles.container} testID="bootstrap-screen">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.hint}>Loading Quotation Generator…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  hint: { color: colors.textSecondary, marginTop: 12 },
});
