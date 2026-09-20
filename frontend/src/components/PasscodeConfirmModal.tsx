import React, { useEffect, useState } from "react";
import { Text, StyleSheet } from "react-native";

import { AppModal, Button, Input } from "@/src/components/UI";
import { colors, spacing } from "@/src/theme";
import { getAdmin } from "@/src/state/session";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (credentials: { contactNumber: string; passcode: string }) => void;
};

export function PasscodeConfirmModal(props: Props) {
  const [contactNumber, setContactNumber] = useState("");
  const [passcode, setPasscode] = useState("");

  useEffect(() => {
    if (!props.visible) return;
    getAdmin().then((admin) => {
      if (admin?.contactNumber) setContactNumber(admin.contactNumber);
    });
    setPasscode("");
  }, [props.visible]);

  return (
    <AppModal visible={props.visible} onClose={props.onClose} title={props.title}>
      <Text style={styles.message}>{props.message}</Text>
      <Input
        testID="destructive-contact"
        label="Admin contact number"
        value={contactNumber}
        onChangeText={setContactNumber}
        keyboardType="phone-pad"
      />
      <Input
        testID="destructive-passcode"
        label="Admin passcode"
        value={passcode}
        onChangeText={setPasscode}
        secureTextEntry
        keyboardType="numeric"
      />
      <Button
        testID="destructive-confirm"
        title={props.confirmLabel || "Confirm"}
        variant="danger"
        onPress={() => props.onConfirm({ contactNumber: contactNumber.trim(), passcode })}
        loading={props.loading}
        disabled={!contactNumber.trim() || passcode.length < 4}
        fullWidth
      />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  message: { color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.md },
});
