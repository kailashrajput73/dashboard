import { API_BASE_URL } from "./config/env";
import { colors, font, radii, spacing } from "./theme";

export default function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.bg,
        color: colors.textPrimary,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <section
        style={{
          background: colors.surface,
          color: colors.primary,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          padding: spacing.xl,
          fontSize: font.h2.fontSize,
          fontWeight: font.h2.fontWeight,
          letterSpacing: font.h2.letterSpacing,
        }}
      >
        <p style={{ margin: 0 }}>Shivani ERP</p>
        <p
          style={{
            margin: `${spacing.sm}px 0 0`,
            color: colors.textSecondary,
            fontSize: font.body.fontSize,
            fontWeight: font.body.fontWeight,
            letterSpacing: 0,
          }}
        >
          {API_BASE_URL ? "Backend URL is set" : "Backend URL is not set"}
        </p>
      </section>
    </main>
  );
}
