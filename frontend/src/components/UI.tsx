// Reusable UI components — kept in one file to reduce noise.

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, shadow, font, isWeb, pointer } from "@/src/theme";

// ---------------- Button ----------------

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  fullWidth,
  size = "md",
  testID,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const height = size === "sm" ? 40 : size === "lg" ? 52 : 46;
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
      ? colors.error
      : variant === "secondary"
      ? colors.primaryLight
      : "transparent";
  const fg =
    variant === "primary" || variant === "danger"
      ? "#FFFFFF"
      : variant === "secondary"
      ? colors.primary
      : colors.primary;
  const border =
    variant === "ghost"
      ? { borderWidth: 1, borderColor: colors.border }
      : undefined;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ hovered, pressed }) => [
        styles.btn,
        pointer,
        { backgroundColor: bg, height, opacity: isDisabled ? 0.55 : 1 },
        border,
        fullWidth && { alignSelf: "stretch" },
        hovered && !isDisabled && variant === "primary" && { backgroundColor: colors.primaryHover },
        hovered && !isDisabled && variant !== "primary" && { backgroundColor: colors.primaryLight },
        pressed && !isDisabled && { opacity: 0.88 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={fg}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text
            style={[
              styles.btnText,
              { color: fg, fontSize: size === "sm" ? 13 : 15 },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ---------------- Card ----------------

export function Card(props: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View testID={props.testID} style={[styles.card, props.style]}>
      {props.children}
    </View>
  );
}

// ---------------- Input ----------------

type InputProps = {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "numeric" | "phone-pad" | "decimal-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  testID?: string;
  error?: string | null;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  onSubmitEditing?: () => void;
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  testID,
  error,
  editable = true,
  style,
  inputStyle,
  onSubmitEditing,
}: InputProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="done"
        style={[
          styles.input,
          multiline && { height: 90, textAlignVertical: "top", paddingTop: 12 },
          focused && { borderColor: colors.primary },
          error ? { borderColor: colors.error } : null,
          inputStyle,
        ]}
      />
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

// ---------------- Chip ----------------

export function Chip(props: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ hovered, pressed }) => [
        styles.chip,
        pointer,
        props.selected ? styles.chipSelected : styles.chipUnselected,
        hovered && !props.selected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
        pressed && { opacity: 0.88 },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.chipLabel,
          {
            color: props.selected ? "#FFFFFF" : colors.textPrimary,
          },
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

// ---------------- AppModal ----------------

export function AppModal(props: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testID?: string;
  wide?: boolean;
}) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View style={[styles.backdrop, isWeb && styles.backdropWeb]}>
        <Pressable
          testID={props.testID ? `${props.testID}-backdrop` : undefined}
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
          onPress={props.onClose}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.sheet, isWeb && styles.sheetWeb, isWeb && props.wide && styles.sheetWide]} testID={props.testID}>
          {!isWeb ? <View style={styles.grabber} /> : null}
          <View style={styles.modalHeader}>
            {props.title ? (
              <Text style={styles.modalTitle}>{props.title}</Text>
            ) : (
              <View />
            )}
            {isWeb ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={props.onClose}
                hitSlop={8}
                style={({ hovered }) => [
                  styles.modalClose,
                  pointer,
                  hovered && { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {props.children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------- Error Modal ----------------

export function ErrorModal(props: {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <AppModal
      testID="error-modal"
      visible={props.visible}
      onClose={props.onClose}
      title={props.title || "Something went wrong"}
    >
      <Text style={styles.modalBody}>{props.message}</Text>
      <Button
        testID="error-modal-close"
        title="Dismiss"
        onPress={props.onClose}
        fullWidth
        style={{ marginTop: spacing.md }}
      />
    </AppModal>
  );
}

// ---------------- Header ----------------

export function Header(props: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {props.onBack && !isWeb ? (
          <TouchableOpacity
            onPress={props.onBack}
            style={[styles.headerBack, pointer]}
            testID="header-back"
            hitSlop={10}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : isWeb ? null : (
          <View style={{ width: 40 }} />
        )}
        <View style={{ flex: 1, alignItems: "flex-start" }}>
          <Text style={styles.headerTitle}>{props.title}</Text>
          {props.subtitle ? (
            <Text style={styles.headerSubtitle}>{props.subtitle}</Text>
          ) : null}
        </View>
        <View style={{ minWidth: 40, alignItems: "flex-end" }}>
          {props.right}
        </View>
      </View>
    </View>
  );
}

// ---------------- EmptyState ----------------

export function EmptyState(props: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  cta?: { label: string; onPress: () => void; testID?: string };
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Ionicons
          name={props.icon || "document-outline"}
          size={30}
          color={colors.primary}
        />
      </View>
      <Text style={styles.emptyTitle}>{props.title}</Text>
      {props.subtitle ? (
        <Text style={styles.emptySubtitle}>{props.subtitle}</Text>
      ) : null}
      {props.cta ? (
        <Button
          title={props.cta.label}
          onPress={props.cta.onPress}
          testID={props.cta.testID}
          style={{ marginTop: spacing.md }}
        />
      ) : null}
    </View>
  );
}

// ---------------- Styles ----------------

const styles = StyleSheet.create({
  btn: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRow: { flexDirection: "row", alignItems: "center" },
  btnText: { fontWeight: "600" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },

  inputLabel: {
    ...font.caption,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    height: 46,
    color: colors.textPrimary,
    fontSize: 15,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  inputError: { color: colors.error, fontSize: 12, marginTop: 4 },

  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipUnselected: { backgroundColor: colors.surface, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: 13, fontWeight: "600" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  backdropWeb: {
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    maxHeight: "85%",
    ...shadow.sheet,
  },
  sheetWeb: {
    borderRadius: radii.lg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    width: "100%",
    maxWidth: 560,
    maxHeight: "80%",
    zIndex: 1,
  },
  sheetWide: {
    maxWidth: 760,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  grabber: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...font.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  header: {
    paddingHorizontal: isWeb ? spacing.xl : spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: "row", alignItems: "center", minHeight: 40 },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  headerTitle: { ...font.h2, color: colors.textPrimary },
  headerSubtitle: {
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },

  empty: { alignItems: "center", padding: spacing.xl, paddingTop: 48 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...font.h3,
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 280,
  },
});
