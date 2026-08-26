import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  Header,
  Card,
  Input,
  Button,
  ErrorModal,
} from "@/src/components/UI";
import { colors, spacing, font } from "@/src/theme";
import {
  getMoneyConfig,
  updateMoneyConfig,
  type MoneyConfig,
} from "@/src/api/endpoints";
import { getAdmin } from "@/src/state/session";
import { ApiError } from "@/src/api/client";

export default function MoneyConfigScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminId, setAdminId] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [discountPercent, setDiscountPercent] = useState("0");
  const [gstPercent, setGstPercent] = useState("18");
  const [specialDiscountPercent, setSpecialDiscountPercent] = useState("0");
  const [showDiscount, setShowDiscount] = useState(true);
  const [showGst, setShowGst] = useState(true);
  const [showSpecialDiscount, setShowSpecialDiscount] = useState(false);

  useEffect(() => {
    (async () => {
      const a = await getAdmin();
      if (!a) {
        router.replace("/(admin)/login");
        return;
      }
      setAdminId(a.adminId);
      try {
        const cfg = await getMoneyConfig(a.adminId);
        applyCfg(cfg);
      } catch (e: any) {
        setErr(e instanceof ApiError ? e.message : "Failed to load config");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function applyCfg(cfg: MoneyConfig) {
    setDiscountPercent(String(cfg.discountPercent ?? 0));
    setGstPercent(String(cfg.gstPercent ?? 0));
    setSpecialDiscountPercent(String(cfg.specialDiscountPercent ?? 0));
    setShowDiscount(!!cfg.showDiscount);
    setShowGst(!!cfg.showGst);
    setShowSpecialDiscount(!!cfg.showSpecialDiscount);
  }

  async function save() {
    setSaving(true);
    setOk(null);
    try {
      const cfg = await updateMoneyConfig(adminId, {
        discountPercent: parseFloat(discountPercent) || 0,
        gstPercent: parseFloat(gstPercent) || 0,
        specialDiscountPercent: parseFloat(specialDiscountPercent) || 0,
        showDiscount,
        showGst,
        showSpecialDiscount,
      });
      applyCfg(cfg);
      setOk("Money configuration saved.");
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Header title="Money Configuration" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Money Configuration"
        subtitle="Discounts, GST & visibility"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Card>
          <Text style={styles.title}>Percentages</Text>
          <Text style={styles.hint}>
            All values are percentages applied to the running subtotal.
          </Text>
          <View style={{ height: spacing.md }} />

          <Input
            testID="cfg-discount-input"
            label="Discount %"
            value={discountPercent}
            onChangeText={setDiscountPercent}
            keyboardType="decimal-pad"
          />
          <Input
            testID="cfg-gst-input"
            label="GST %"
            value={gstPercent}
            onChangeText={setGstPercent}
            keyboardType="decimal-pad"
          />
          <Input
            testID="cfg-special-input"
            label="Special Discount %"
            value={specialDiscountPercent}
            onChangeText={setSpecialDiscountPercent}
            keyboardType="decimal-pad"
          />
        </Card>

        <View style={{ height: spacing.lg }} />

        <Card>
          <Text style={styles.title}>Visibility on quotations</Text>
          <Text style={styles.hint}>
            Hide any line you don’t want to appear on the customer’s final quotation.
          </Text>
          <View style={{ height: spacing.md }} />
          <Toggle
            testID="toggle-showDiscount"
            label="Show Discount"
            value={showDiscount}
            onValueChange={setShowDiscount}
          />
          <Toggle
            testID="toggle-showGst"
            label="Show GST"
            value={showGst}
            onValueChange={setShowGst}
          />
          <Toggle
            testID="toggle-showSpecialDiscount"
            label="Show Special Discount"
            value={showSpecialDiscount}
            onValueChange={setShowSpecialDiscount}
          />
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button
          testID="save-config-btn"
          title="Save Configuration"
          icon="checkmark-circle-outline"
          onPress={save}
          loading={saving}
          fullWidth
        />
        {ok ? (
          <Text style={styles.successMsg} testID="save-config-ok">
            {ok}
          </Text>
        ) : null}
      </ScrollView>

      <ErrorModal
        visible={!!err}
        message={err || ""}
        onClose={() => setErr(null)}
      />
    </SafeAreaView>
  );
}

function Toggle(props: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  testID?: string;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{props.label}</Text>
      <Switch
        testID={props.testID}
        value={props.value}
        onValueChange={props.onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { ...font.h3, color: colors.textPrimary },
  hint: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  toggleRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: "500" },
  successMsg: {
    marginTop: spacing.md,
    color: colors.success,
    textAlign: "center",
    fontWeight: "600",
  },
});
