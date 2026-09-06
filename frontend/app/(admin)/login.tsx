import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Input, Button, Card, ErrorModal } from "@/src/components/UI";
import { colors, spacing, font, isWeb, pointer } from "@/src/theme";
import { loginAdmin } from "@/src/api/endpoints";
import { saveAdmin } from "@/src/state/session";
import { ApiError } from "@/src/api/client";

export default function AdminLogin() {
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string | null>>({});

  function validate() {
    const e: Record<string, string | null> = {};
    if (!contact.trim()) e.contact = "Contact number required";
    if (!passcode.trim()) e.passcode = "Passcode required";
    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const a = await loginAdmin({
        contactNumber: contact.trim(),
        passcode: passcode.trim(),
      });
      await saveAdmin(a);
      router.replace("/(admin)/dashboard");
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.frame}>
            <Text style={styles.brand}>Admin dashboard</Text>
            <Text style={styles.lede}>Sign in with your contact and passcode</Text>
            <Card>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.hint}>
                Manage catalog, inventory, RFQs, and billing.
              </Text>
              <View style={{ height: spacing.md }} />

              <Input
                testID="admin-contact-input"
                label="Contact Number"
                placeholder="e.g. 98xxxxxxxx"
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
                error={fieldErr.contact}
                onSubmitEditing={submit}
              />
              <Input
                testID="admin-passcode-input"
                label="Passcode"
                placeholder="Enter your passcode"
                value={passcode}
                onChangeText={setPasscode}
                secureTextEntry
                error={fieldErr.passcode}
                onSubmitEditing={submit}
              />

              <Button
                testID="admin-login-submit"
                title="Sign In"
                icon="log-in-outline"
                onPress={submit}
                loading={loading}
                fullWidth
              />

              <Pressable
                onPress={() => router.push("/(admin)/register")}
                accessibilityRole="link"
                style={({ hovered }) => [
                  styles.linkWrap,
                  pointer,
                  hovered && { opacity: 0.8 },
                ]}
                testID="go-to-admin-register"
              >
                <Text style={styles.linkText}>
                  First time here?{" "}
                  <Text style={styles.linkAccent}>Create an admin account</Text>
                </Text>
              </Pressable>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ErrorModal
        visible={!!err}
        message={err || ""}
        onClose={() => setErr(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: 40,
    justifyContent: isWeb ? "center" : "flex-start",
    alignItems: isWeb ? "center" : "stretch",
  },
  frame: {
    width: "100%",
    maxWidth: isWeb ? 440 : undefined,
  },
  brand: { ...font.h2, color: colors.textPrimary, marginBottom: 4 },
  lede: { color: colors.textSecondary, marginBottom: spacing.lg, fontSize: 14 },
  title: { ...font.h3, color: colors.textPrimary },
  hint: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  linkWrap: { marginTop: spacing.md, alignSelf: "center" },
  linkText: { color: colors.textSecondary, fontSize: 13 },
  linkAccent: { color: colors.primary, fontWeight: "700" },
});
