import { Navigate, useLocation } from "react-router-dom";
import { pathToModule } from "../access/modules";
import { useAdminSession } from "../access/AdminSessionContext";
import { useCanReadModule } from "../access/useAccess";
import { colors, spacing } from "../theme";

export function AccessGate(props: { children: React.ReactNode }) {
  const location = useLocation();
  const { loading } = useAdminSession();
  const module = pathToModule(location.pathname);
  const canRead = useCanReadModule(module ?? "dashboard");

  if (loading) {
    return (
      <main style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
        <span className="web-button-spinner" role="status" aria-label="Loading access" />
      </main>
    );
  }

  if (module && !canRead) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: module }} />;
  }

  return <>{props.children}</>;
}

export function ReadOnlyBanner(props: { moduleLabel: string }) {
  return (
    <p
      role="status"
      style={{
        margin: `0 ${spacing.lg}px ${spacing.sm}px`,
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      View only — you cannot change {props.moduleLabel} until an admin grants full access.
    </p>
  );
}
