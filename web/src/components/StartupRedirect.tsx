import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAdmin } from "../state/session";
import { colors } from "../theme";

export function StartupRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    void getAdmin().then((admin) => {
      navigate(admin ? "/dashboard" : "/login", { replace: true });
    });
  }, [navigate]);

  return (
    <main className="startup-screen" data-testid="bootstrap-screen">
      <span className="startup-spinner" aria-hidden="true" />
      <span className="startup-hint" style={{ color: colors.textSecondary }}>
        Loading Shivani Admin…
      </span>
    </main>
  );
}
