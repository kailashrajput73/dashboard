import { Button, Card } from "../../components/UI";
import type { SheetValidationError } from "../../api/endpoints";
import { colors, font, spacing } from "../../theme";

type Props = {
  checking: boolean;
  valid: boolean;
  errors: SheetValidationError[];
  rowCount: number;
  sourceFileName?: string;
  skippedBlankRows?: number;
  rejectedHeaderRows?: number;
};

function downloadErrorReport(errors: SheetValidationError[], sourceFileName: string) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [
    "excel_row,column,message",
    ...errors.map((entry) =>
      [entry.row ?? "", escape(entry.column ?? ""), escape(entry.message)].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const base = sourceFileName.replace(/\.[^.]+$/, "") || "sheet";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${base}-validation-errors.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SheetValidationPanel(props: Props) {
  const { checking, valid, errors, rowCount, sourceFileName = "upload" } = props;

  if (checking) {
    return (
      <Card style={{ marginTop: spacing.md, backgroundColor: colors.primaryLight }}>
        <p style={{ margin: 0, color: colors.textPrimary, fontSize: 14 }}>Checking sheet…</p>
      </Card>
    );
  }

  if (valid && rowCount > 0) {
    const notes: string[] = [];
    if (props.skippedBlankRows) {
      notes.push(`${props.skippedBlankRows} blank row(s) ignored`);
    }
    if (props.rejectedHeaderRows) {
      notes.push(`${props.rejectedHeaderRows} header-like row(s) would be rejected`);
    }
    return (
      <Card
        style={{
          marginTop: spacing.md,
          backgroundColor: colors.successBg,
          borderColor: colors.success,
        }}
      >
        <p style={{ margin: 0, color: colors.textPrimary, lineHeight: 1.45 }}>
          Sheet OK — {rowCount} row(s) passed validation. You can import now.
          {notes.length ? ` (${notes.join("; ")})` : ""}
        </p>
      </Card>
    );
  }

  if (!errors.length) return null;

  return (
    <Card
      style={{
        marginTop: spacing.md,
        backgroundColor: "#FEF2F2",
        borderColor: "#FECACA",
      }}
      testID="sheet-validation-panel"
    >
      <p style={{ ...font.title, margin: `0 0 ${spacing.xs}px`, color: "#991B1B", fontSize: 15 }}>
        {errors.length} problem{errors.length === 1 ? "" : "s"} in your file
      </p>
      <p style={{ margin: `0 0 ${spacing.sm}px`, color: colors.textSecondary, fontSize: 13, lineHeight: 1.45 }}>
        Excel row numbers match your sheet (row 1 = headers). Fix these rows, then upload again.
        {props.skippedBlankRows ? ` ${props.skippedBlankRows} blank row(s) were ignored.` : ""}
        {props.rejectedHeaderRows
          ? ` ${props.rejectedHeaderRows} row(s) look like duplicate headers and were not imported.`
          : ""}
      </p>
      <Button
        title="Download error list (CSV)"
        icon="download-outline"
        variant="ghost"
        size="sm"
        onPress={() => downloadErrorReport(errors, sourceFileName)}
        style={{ marginBottom: spacing.sm }}
      />
      <ul
        style={{
          margin: 0,
          padding: `0 ${spacing.sm}px`,
          maxHeight: 280,
          overflowY: "auto",
          listStyle: "none",
        }}
      >
        {errors.map((entry, index) => (
          <li
            key={`${entry.row}-${entry.column}-${index}`}
            style={{
              padding: `${spacing.xs}px 0`,
              borderBottom: index < errors.length - 1 ? `1px solid ${colors.border}` : undefined,
              fontSize: 13,
              lineHeight: 1.45,
              color: colors.textPrimary,
            }}
          >
            <strong>
              {entry.row ? `Row ${entry.row}` : "Sheet"}
              {entry.column ? ` · ${entry.column}` : ""}
            </strong>
            <div style={{ color: colors.textSecondary }}>{entry.message}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
