import { useEffect, useState } from "react";
import { getAdmin } from "../state/session";
import { colors, spacing } from "../theme";
import { AppModal, Button, Input } from "./UI";

export function PasscodeConfirmModal(props: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (credentials: { contactNumber: string; passcode: string }) => void;
}) {
  if (!props.visible) return null;
  return <PasscodeConfirmContent {...props} />;
}

function PasscodeConfirmContent(props: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (credentials: { contactNumber: string; passcode: string }) => void;
}) {
  const [contactNumber, setContactNumber] = useState("");
  const [passcode, setPasscode] = useState("");

  useEffect(() => {
    void getAdmin().then((admin) => {
      if (admin?.contactNumber) setContactNumber(admin.contactNumber);
    });
  }, []);

  return (
    <AppModal
      visible={props.visible}
      onClose={props.onClose}
      title={props.title}
    >
      <p style={{ color: colors.textSecondary, lineHeight: "21px", marginBottom: spacing.md }}>
        {props.message}
      </p>
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
        onPress={() =>
          props.onConfirm({ contactNumber: contactNumber.trim(), passcode })
        }
        loading={props.loading}
        disabled={!contactNumber.trim() || passcode.length < 4}
        fullWidth
      />
    </AppModal>
  );
}
