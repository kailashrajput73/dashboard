import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Header, Input, Button, Card, ErrorModal } from "@/src/components/UI";
import { colors, spacing, font } from "@/src/theme";
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
      <Header
        title="Admin Login"
        subtitle="Sign in with your contact & passcode"
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Card>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.hint}>
              Manage catalog, imports, and money configuration.
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
            />
            <Input
              testID="admin-passcode-input"
              label="Passcode"
              placeholder="Enter your passcode"
              value={passcode}
              onChangeText={setPasscode}
              secureTextEntry
              error={fieldErr.passcode}
            />

            <Button
              testID="admin-login-submit"
              title="Sign In"
              icon="log-in-outline"
              onPress={submit}
              loading={loading}
              fullWidth
            />

            <TouchableOpacity
              onPress={() => router.push("/(admin)/register")}
              style={{ marginTop: spacing.md, alignSelf: "center" }}
              testID="go-to-admin-register"
            >
              <Text style={styles.linkText}>
                First time here?{" "}
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  Create an admin account
                </Text>
              </Text>
            </TouchableOpacity>
          </Card>
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
  title: { ...font.h3, color: colors.textPrimary },
  hint: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  linkText: { color: colors.textSecondary, fontSize: 13 },
});
