import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { loginAdmin } from "../api/endpoints";
import { Button, Card, ErrorModal, Input } from "../components/UI";
import { saveAdmin } from "../state/session";
import { colors, font, spacing } from "../theme";

export default function LoginPage() {
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string | null>>({});

  function validate() {
    const nextErrors: Record<string, string | null> = {};
    if (!contact.trim()) nextErrors.contact = "Contact number required";
    if (!passcode.trim()) nextErrors.passcode = "Passcode required";
    setFieldErr(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const admin = await loginAdmin({
        contactNumber: contact.trim(),
        passcode: passcode.trim(),
      });
      await saveAdmin(admin);
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      setErr(error instanceof ApiError ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-frame">
        <div
          style={{
            ...font.h2,
            color: colors.textPrimary,
            marginBottom: 4,
          }}
        >
          Admin dashboard
        </div>
        <div
          style={{
            color: colors.textSecondary,
            marginBottom: spacing.lg,
            fontSize: 14,
          }}
        >
          Sign in with your contact and passcode
        </div>
        <Card>
          <div style={{ ...font.h3, color: colors.textPrimary }}>
            Welcome back
          </div>
          <div
            style={{
              color: colors.textSecondary,
              marginTop: 4,
              fontSize: 13,
            }}
          >
            Manage catalog, inventory, RFQs, and billing.
          </div>
          <div style={{ height: spacing.md }} />

          <form onSubmit={(event) => void submit(event)}>
            <Input
              testID="admin-contact-input"
              label="Contact Number"
              placeholder="e.g. 98xxxxxxxx"
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
              error={fieldErr.contact}
              onSubmitEditing={() => void submit()}
            />
            <Input
              testID="admin-passcode-input"
              label="Passcode"
              placeholder="Enter your passcode"
              value={passcode}
              onChangeText={setPasscode}
              secureTextEntry
              error={fieldErr.passcode}
              onSubmitEditing={() => void submit()}
            />
            <Button
              testID="admin-login-submit"
              title="Sign In"
              icon="log-in-outline"
              onPress={() => void submit()}
              loading={loading}
              fullWidth
            />
          </form>

          <div className="login-register-link">
            <Link to="/register" data-testid="go-to-admin-register">
              First time here?{" "}
              <span style={{ color: colors.primary, fontWeight: 700 }}>
                Create an admin account
              </span>
            </Link>
          </div>
        </Card>
      </div>

      <ErrorModal
        visible={!!err}
        message={err || ""}
        onClose={() => setErr(null)}
      />
    </main>
  );
}
