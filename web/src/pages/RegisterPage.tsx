import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { loginAdmin, registerAdmin } from "../api/endpoints";
import { Button, Card, ErrorModal, Input } from "../components/UI";
import { saveAdmin } from "../state/session";
import { colors, font, spacing } from "../theme";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [gstin, setGstin] = useState("");
  const [contact, setContact] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  function validate() {
    const next: Record<string, string | null> = {};
    if (!company.trim()) next.company = "Company name required";
    if (!gstin.trim()) next.gstin = "GSTIN required";
    if (!contact.trim() || contact.length < 6) next.contact = "Enter a valid number";
    if (!passcode.trim() || passcode.length < 4) next.passcode = "Passcode must be at least 4 characters";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await registerAdmin({
        companyName: company.trim(),
        gstin: gstin.trim(),
        contactNumber: contact.trim(),
        passcode: passcode.trim(),
      });
      const admin = await loginAdmin({ contactNumber: contact.trim(), passcode: passcode.trim() });
      await saveAdmin(admin);
      navigate("/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-frame">
        <div style={{ ...font.h2, color: colors.textPrimary, marginBottom: 4 }}>Create admin account</div>
        <div style={{ color: colors.textSecondary, marginBottom: spacing.lg, fontSize: 14 }}>Company details for your quotations</div>
        <Card>
          <div style={{ ...font.h3, color: colors.textPrimary }}>Register as Admin</div>
          <div style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>Set a passcode you’ll remember — you’ll use it every time to sign in.</div>
          <div style={{ height: spacing.md }} />
          <form onSubmit={(event) => void submit(event)}>
            <Input testID="admin-company-input" label="Company Name" placeholder="e.g. Acme Traders" value={company} onChangeText={setCompany} autoCapitalize="words" error={fieldErrors.company} />
            <Input testID="admin-gstin-input" label="GSTIN" placeholder="e.g. 27ABCDE1234F1Z5" value={gstin} onChangeText={(value) => setGstin(value.toUpperCase())} autoCapitalize="characters" error={fieldErrors.gstin} />
            <Input testID="admin-reg-contact-input" label="Contact Number" placeholder="Phone / WhatsApp" value={contact} onChangeText={setContact} keyboardType="phone-pad" error={fieldErrors.contact} />
            <Input testID="admin-reg-passcode-input" label="Passcode" placeholder="Min 4 characters" value={passcode} onChangeText={setPasscode} secureTextEntry error={fieldErrors.passcode} />
            <Button testID="admin-register-submit" title="Create Account" icon="checkmark-circle-outline" onPress={() => void submit()} loading={loading} fullWidth />
          </form>
          <div className="login-register-link">
            <Link to="/login" data-testid="go-to-admin-login">Already have an account? <span style={{ color: colors.primary, fontWeight: 700 }}>Sign in</span></Link>
          </div>
        </Card>
      </div>
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}