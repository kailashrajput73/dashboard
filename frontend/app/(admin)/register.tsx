import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Header, Input, Button, Card, ErrorModal } from "@/src/components/UI";
import { colors, spacing, font } from "@/src/theme";
import { registerAdmin, loginAdmin } from "@/src/api/endpoints";
import { saveAdmin } from "@/src/state/session";
import { ApiError } from "@/src/api/client";

export default function AdminRegister() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [gstin, setGstin] = useState("");
  const [contact, setContact] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string | null>>({});

  function validate() {
    const e: Record<string, string | null> = {};
    if (!company.trim()) e.company = "Company name required";
    if (!gstin.trim()) e.gstin = "GSTIN required";
    if (!contact.trim() || contact.length < 6) e.contact = "Enter a valid number";
    if (!passcode.trim() || passcode.length < 4)
      e.passcode = "Passcode must be at least 4 characters";
    setFieldErr(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await registerAdmin({
        companyName: company.trim(),
        gstin: gstin.trim(),
        contactNumber: contact.trim(),
        passcode: passcode.trim(),
      });
      // Auto-login for a smoother demo.
      const a = await loginAdmin({
        contactNumber: contact.trim(),
        passcode: passcode.trim(),
      });
      await saveAdmin(a);
      router.replace("/(admin)/dashboard");
    } catch (e: any) {
      setErr(e instanceof ApiError ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Create Admin Account"
        subtitle="Company details for your quotations"
        onBack={() => router.back()}
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
            <Text style={styles.title}>Register as Admin</Text>
            <Text style={styles.hint}>
              Set a passcode you’ll remember — you’ll use it every time to sign in.
            </Text>
            <View style={{ height: spacing.md }} />

            <Input
              testID="admin-company-input"
              label="Company Name"
              placeholder="e.g. Acme Traders"
              value={company}
              onChangeText={setCompany}
              autoCapitalize="words"
              error={fieldErr.company}
            />
            <Input
              testID="admin-gstin-input"
              label="GSTIN"
              placeholder="e.g. 27ABCDE1234F1Z5"
              value={gstin}
              onChangeText={(v) => setGstin(v.toUpperCase())}
              autoCapitalize="characters"
              error={fieldErr.gstin}
            />
            <Input
              testID="admin-reg-contact-input"
              label="Contact Number"
              placeholder="Phone / WhatsApp"
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
              error={fieldErr.contact}
            />
            <Input
              testID="admin-reg-passcode-input"
              label="Passcode"
              placeholder="Min 4 characters"
              value={passcode}
              onChangeText={setPasscode}
              secureTextEntry
              error={fieldErr.passcode}
            />

            <Button
              testID="admin-register-submit"
              title="Create Account"
              icon="checkmark-circle-outline"
              onPress={submit}
              loading={loading}
              fullWidth
            />
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
});
