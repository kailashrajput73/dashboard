import { useState } from "react";
import {
  AppModal,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorModal,
  Header,
  Input,
} from "./components/UI";
import { Icon, type IconName } from "./components/Icon";
import { colors, spacing } from "./theme";

const iconNames: IconName[] = [
  "add",
  "add-circle",
  "bar-chart-outline",
  "barcode-outline",
  "cart-outline",
  "cash-outline",
  "checkmark",
  "checkmark-circle",
  "checkmark-circle-outline",
  "chevron-back",
  "chevron-down",
  "chevron-forward",
  "chevron-up",
  "close",
  "close-circle",
  "cloud-upload-outline",
  "create-outline",
  "cube",
  "cube-outline",
  "document-outline",
  "document-text-outline",
  "download-outline",
  "ellipsis-vertical",
  "filter-outline",
  "funnel-outline",
  "git-branch-outline",
  "grid-outline",
  "image-outline",
  "layers-outline",
  "list-outline",
  "log-in-outline",
  "log-out-outline",
  "options-outline",
  "pause-circle-outline",
  "people-outline",
  "play-circle-outline",
  "pricetag-outline",
  "pricetags-outline",
  "receipt-outline",
  "ribbon-outline",
  "send-outline",
  "settings-outline",
  "shield-outline",
  "swap-horizontal-outline",
  "time-outline",
  "trash-outline",
  "warning-outline",
];

export default function DevPreview() {
  const [text, setText] = useState("");
  const [numeric, setNumeric] = useState("");
  const [chip, setChip] = useState("All");
  const [backCount, setBackCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Header
        title="Row 1c component preview"
        subtitle={`Header callback test count: ${backCount}`}
        onBack={() => setBackCount((count) => count + 1)}
        right={
          <Button
            title="Action"
            icon="add"
            size="sm"
            onPress={() => setModalOpen(true)}
          />
        }
      />
      <div
        style={{
          display: "grid",
          gap: spacing.lg,
          maxWidth: 1000,
          margin: "0 auto",
          padding: spacing.xl,
        }}
      >
        <Card testID="preview-card">
          <h2 style={{ marginTop: 0 }}>Buttons</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
            <Button title="Primary" onPress={() => setModalOpen(true)} />
            <Button title="Secondary" variant="secondary" onPress={() => {}} />
            <Button title="Ghost" variant="ghost" onPress={() => {}} />
            <Button title="Danger" variant="danger" onPress={() => {}} />
            <Button title="Small" size="sm" onPress={() => {}} />
            <Button title="Large" size="lg" onPress={() => {}} />
            <Button title="Loading" loading onPress={() => {}} />
            <Button title="Disabled" disabled onPress={() => {}} />
          </div>
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>Inputs</h2>
          <Input
            testID="preview-text-input"
            label="Text"
            value={text}
            onChangeText={setText}
            placeholder="Type a value"
            error={text ? null : "Example validation message"}
          />
          <Input
            testID="preview-number-input"
            label="Numeric keyboard hint"
            keyboardType="numeric"
            value={numeric}
            onChangeText={setNumeric}
            placeholder="Numbers"
          />
          <Input
            label="Phone"
            keyboardType="phone-pad"
            value=""
            onChangeText={() => {}}
            placeholder="Phone number"
          />
          <Input
            label="Decimal"
            keyboardType="decimal-pad"
            value=""
            onChangeText={() => {}}
            placeholder="Decimal value"
          />
          <Input
            label="Email"
            keyboardType="email-address"
            value=""
            onChangeText={() => {}}
            placeholder="name@example.com"
          />
          <Input
            label="Passcode"
            secureTextEntry
            value=""
            onChangeText={() => {}}
            placeholder="Passcode"
          />
          <Input
            label="Multiline"
            multiline
            value=""
            onChangeText={() => {}}
            placeholder="Several lines"
          />
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>Chips</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
            {["All", "Active", "Inactive"].map((label) => (
              <Chip
                key={label}
                label={label}
                selected={chip === label}
                onPress={() => setChip(label)}
                testID={`preview-chip-${label.toLowerCase()}`}
              />
            ))}
          </div>
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>Empty state</h2>
          <EmptyState
            icon="document-outline"
            title="No matching records"
            subtitle="The Expo empty-state icon, title, subtitle, and CTA."
            cta={{ label: "Try again", onPress: () => setChip("All") }}
          />
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>Popups</h2>
          <div style={{ display: "flex", gap: spacing.sm }}>
            <Button title="Open modal" onPress={() => setModalOpen(true)} />
            <Button
              title="Open error modal"
              variant="danger"
              onPress={() => setErrorOpen(true)}
            />
          </div>
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>Expo Ionicons names ({iconNames.length})</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: spacing.md,
            }}
          >
            {iconNames.map((name) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  minWidth: 0,
                  fontSize: 12,
                }}
              >
                <Icon name={name} size={20} color={colors.primary} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <AppModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Example modal"
        testID="preview-modal"
      >
        <p>Close with the X, the backdrop, or Escape.</p>
        <Button title="Close" onPress={() => setModalOpen(false)} fullWidth />
      </AppModal>
      <ErrorModal
        visible={errorOpen}
        message="This uses Expo's ErrorModal title, message, and Dismiss button."
        onClose={() => setErrorOpen(false)}
      />
    </main>
  );
}
