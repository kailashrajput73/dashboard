import React from "react";
import { Icon, type IconName } from "./Icon";
import { colors, font, radii, spacing } from "../theme";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  testID?: string;
  style?: React.CSSProperties;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  size = "md",
  testID,
  style,
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const isDisabled = disabled || loading;
  const height = size === "sm" ? 40 : size === "lg" ? 52 : 46;
  const backgroundColor =
    hovered && !isDisabled
      ? variant === "primary"
        ? colors.primaryHover
        : colors.primaryLight
      : variant === "primary"
        ? colors.primary
        : variant === "danger"
          ? colors.error
          : variant === "secondary"
            ? colors.primaryLight
            : "transparent";
  const foregroundColor =
    variant === "primary" || variant === "danger"
      ? "#FFFFFF"
      : colors.primary;

  return (
    <button
      type="button"
      data-testid={testID}
      disabled={isDisabled}
      aria-busy={loading}
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        border: variant === "ghost" ? `1px solid ${colors.border}` : "none",
        borderRadius: radii.md,
        padding: `0 ${spacing.lg}px`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height,
        width: fullWidth ? "100%" : undefined,
        alignSelf: fullWidth ? "stretch" : undefined,
        backgroundColor,
        color: foregroundColor,
        opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1,
        cursor: isDisabled ? "default" : "pointer",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {loading ? (
        <span className="web-button-spinner" aria-label="Loading" />
      ) : (
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          {icon ? (
            <Icon
              name={icon}
              size={18}
              color={foregroundColor}
            />
          ) : null}
          <span
            style={{
              marginLeft: icon ? 8 : 0,
              fontSize: size === "sm" ? 13 : 15,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {title}
          </span>
        </span>
      )}
    </button>
  );
}

export function Card(props: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  testID?: string;
}) {
  return (
    <section
      data-testid={props.testID}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        border: `1px solid ${colors.border}`,
        padding: spacing.lg,
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        ...props.style,
      }}
    >
      {props.children}
    </section>
  );
}

type InputProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?:
    | "default"
    | "numeric"
    | "phone-pad"
    | "decimal-pad"
    | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  testID?: string;
  error?: string | null;
  editable?: boolean;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  onSubmitEditing?: () => void;
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize,
  multiline = false,
  testID,
  error,
  editable = true,
  style,
  inputStyle,
  onSubmitEditing,
}: InputProps) {
  const [focused, setFocused] = React.useState(false);
  const inputType = secureTextEntry
    ? "password"
    : keyboardType === "email-address"
      ? "email"
      : keyboardType === "phone-pad"
        ? "tel"
        : "text";
  const inputMode =
    keyboardType === "numeric"
      ? "numeric"
      : keyboardType === "decimal-pad"
        ? "decimal"
        : keyboardType === "phone-pad"
          ? "tel"
          : keyboardType === "email-address"
            ? "email"
            : undefined;
  const controlStyle: React.CSSProperties = {
    boxSizing: "border-box",
    width: "100%",
    minHeight: multiline ? 90 : 46,
    padding: multiline ? "12px 14px" : "0 14px",
    border: `1px solid ${error ? colors.error : focused ? colors.primary : colors.borderStrong}`,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontFamily: "inherit",
    fontSize: 15,
    outline: "none",
    resize: "none",
    ...inputStyle,
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && onSubmitEditing) {
      event.preventDefault();
      onSubmitEditing();
    }
  };
  const controlProps = {
    "data-testid": testID,
    value,
    placeholder,
    autoCapitalize,
    readOnly: !editable,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChangeText(event.currentTarget.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: controlStyle,
  };

  return (
    <div style={{ marginBottom: spacing.md, ...style }}>
      {label ? (
        <label
          htmlFor={testID}
          style={{
            display: "block",
            ...font.caption,
            color: colors.textSecondary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {label}
        </label>
      ) : null}
      {multiline ? (
        <textarea
          {...controlProps}
          className="web-ui-input"
          id={testID}
          rows={4}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              onSubmitEditing?.();
            }
          }}
        />
      ) : (
        <input
          {...controlProps}
          className="web-ui-input"
          id={testID}
          type={inputType}
          inputMode={inputMode}
          onKeyDown={handleKeyDown}
        />
      )}
      {error ? (
        <div
          role="alert"
          style={{ color: colors.error, fontSize: 12, marginTop: 4 }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

export function Chip(props: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      type="button"
      data-testid={props.testID}
      onClick={props.onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 36,
        padding: "0 14px",
        borderRadius: radii.chip,
        border: `1px solid ${
          props.selected
            ? colors.primary
            : hovered
              ? colors.primary
              : colors.border
        }`,
        backgroundColor: props.selected
          ? colors.primary
          : hovered
            ? colors.primaryLight
            : colors.surface,
        color: props.selected ? "#FFFFFF" : colors.textPrimary,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {props.label}
    </button>
  );
}

export function Header(props: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <header
      style={{
        padding: `${spacing.md}px ${spacing.xl}px`,
        backgroundColor: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: 40,
        }}
      >
        {props.onBack ? (
          <button
            type="button"
            aria-label="Go back"
            data-testid="header-back"
            onClick={props.onBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              marginRight: 8,
              cursor: "pointer",
              color: colors.textPrimary,
            }}
          >
            <Icon name="chevron-back" size={22} color={colors.textPrimary} />
          </button>
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              ...font.h2,
              color: colors.textPrimary,
            }}
          >
            {props.title}
          </div>
          {props.subtitle ? (
            <div
              style={{
                color: colors.textSecondary,
                marginTop: 2,
                fontSize: 13,
              }}
            >
              {props.subtitle}
            </div>
          ) : null}
        </div>
        {props.right ? (
          <div style={{ minWidth: 40, display: "flex", justifyContent: "end" }}>
            {props.right}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function EmptyState(props: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  cta?: { label: string; onPress: () => void; testID?: string };
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: spacing.xl,
        paddingTop: 48,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.primaryLight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.md,
        }}
      >
        <Icon
          name={props.icon || "document-outline"}
          size={30}
          color={colors.primary}
        />
      </div>
      <div
        style={{
          ...font.h3,
          color: colors.textPrimary,
          marginBottom: 4,
        }}
      >
        {props.title}
      </div>
      {props.subtitle ? (
        <div
          style={{
            color: colors.textSecondary,
            fontSize: 13,
            lineHeight: "20px",
            maxWidth: 280,
          }}
        >
          {props.subtitle}
        </div>
      ) : null}
      {props.cta ? (
        <Button
          title={props.cta.label}
          onPress={props.cta.onPress}
          testID={props.cta.testID}
          style={{ marginTop: spacing.md }}
        />
      ) : null}
    </div>
  );
}

export function AppModal(props: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testID?: string;
  wide?: boolean;
}) {
  const { visible, onClose } = props;

  React.useEffect(() => {
    if (!visible) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [visible, onClose]);

  if (!visible) return null;
  const titleId = props.title ? `${props.testID || "app-modal"}-title` : undefined;

  return (
    <div
      data-testid={props.testID ? `${props.testID}-backdrop` : undefined}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: spacing.xl,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={props.testID}
        style={{
          boxSizing: "border-box",
          width: "100%",
          maxWidth: props.wide ? 760 : 560,
          maxHeight: "80vh",
          overflowY: "auto",
          padding: spacing.lg,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          boxShadow: "0 -4px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: spacing.md,
          }}
        >
          {props.title ? (
            <h2
              id={titleId}
              style={{
                ...font.h3,
                color: colors.textPrimary,
                margin: `0 0 ${spacing.md}px`,
              }}
            >
              {props.title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={props.onClose}
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: 0,
              borderRadius: 8,
              backgroundColor: "transparent",
              cursor: "pointer",
              color: colors.textSecondary,
            }}
          >
            <Icon name="close" size={20} color={colors.textSecondary} />
          </button>
        </div>
        <div style={{ paddingBottom: 8 }}>{props.children}</div>
      </section>
    </div>
  );
}

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
      <div style={{ color: colors.textSecondary, fontSize: 14, lineHeight: "20px" }}>
        {props.message}
      </div>
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
