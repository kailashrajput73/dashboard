import { Button } from "../../components/UI";
import { colors, spacing } from "../../theme";
import type { ExportScopeMode } from "./export-catalog-utils";

type Props = {
  mode: ExportScopeMode;
  matchCount: number;
  selectedCount: number;
  onCancel: () => void;
  onDownload: () => void;
  downloading: boolean;
};

export function ExportSessionBar(props: Props) {
  const label =
    props.mode === "filtered"
      ? `Download filtered (${props.matchCount})`
      : `Download selected (${props.selectedCount})`;

  const disabled =
    props.downloading ||
    (props.mode === "selected" && props.selectedCount === 0) ||
    (props.mode === "filtered" && props.matchCount === 0);

  return (
    <div style={barStyle} data-testid="export-session-bar">
      <span style={hintStyle}>
        Export mode: {props.mode === "filtered" ? "filters" : "selected rows"}
      </span>
      <button type="button" onClick={props.onCancel} style={cancelStyle}>
        Cancel
      </button>
      <Button
        testID="export-session-download"
        title={label}
        icon="download-outline"
        onPress={props.onDownload}
        loading={props.downloading}
        disabled={disabled}
        size="sm"
      />
    </div>
  );
}

const barStyle: React.CSSProperties = {
  position: "fixed",
  right: spacing.lg,
  bottom: spacing.lg,
  zIndex: 9000,
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  padding: `${spacing.sm}px ${spacing.md}px`,
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: colors.textSecondary,
  maxWidth: 160,
};

const cancelStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: colors.textMuted,
  cursor: "pointer",
  fontSize: 12,
  textDecoration: "underline",
};
