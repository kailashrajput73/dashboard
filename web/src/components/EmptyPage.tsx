import { Card } from "./UI";
import { colors, font, spacing } from "../theme";

export function EmptyPage({ title }: { title: string }) {
  return (
    <div style={{ padding: spacing.xl, color: colors.textPrimary }}>
      <Card>
        <h1 style={{ ...font.h2, margin: 0, color: colors.textPrimary }}>
          {title}
        </h1>
        <p style={{ marginBottom: 0, color: colors.textSecondary }}>
          This page is not migrated yet.
        </p>
      </Card>
    </div>
  );
}
