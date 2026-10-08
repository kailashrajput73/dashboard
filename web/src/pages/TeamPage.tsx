import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTeamUser, listTeamUsers, updateTeamUser, type TeamUser } from "../api/endpoints";
import { ApiError } from "../api/client";
import { AppModal, Button, Chip, ErrorModal, Header, Input } from "../components/UI";
import { Icon } from "../components/Icon";
import { colors, font, radii, spacing } from "../theme";

const roles: TeamUser["role"][] = ["admin", "store_manager", "staff"];
const roleLabels: Record<TeamUser["role"], string> = { admin: "Admin", store_manager: "Store manager", staff: "Staff" };
const rolePermissions: Record<TeamUser["role"], string[]> = {
  admin: ["all"],
  store_manager: ["catalog:read", "purchase:write", "inventory:read", "rfq:approve", "dispatch:write"],
  staff: ["catalog:read", "inventory:read"],
};

function defaultPermissionsForRole(role: TeamUser["role"]) {
  return rolePermissions[role] || [];
}

function teamErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  const body = error.body;
  const errors = body?.data?.errors ?? body?.errors ?? body?.detail?.errors;
  if (Array.isArray(errors) && errors.length) return errors.map(String).join("\n");
  return error.message || fallback;
}

function SummaryCell(props: { label: string; value: number }) {
  return <div style={summaryCellStyle}><span style={summaryLabelStyle}>{props.label}</span><strong>{props.value}</strong></div>;
}

export default function TeamPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [filter, setFilter] = useState<"all" | TeamUser["role"]>("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<TeamUser | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [passcode, setPasscode] = useState("");
  const [role, setRole] = useState<TeamUser["role"]>("staff");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers((await listTeamUsers()) || []);
      setError(null);
    } catch (cause) {
      setError(teamErrorMessage(cause, "Failed to load team"));
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listTeamUsers()
      .then((nextUsers) => {
        if (active) {
          setUsers(nextUsers || []);
          setError(null);
        }
      })
      .catch((cause: unknown) => { if (active) setError(teamErrorMessage(cause, "Failed to load team")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => users.filter((user) =>
    (filter === "all" || user.role === filter)
    && `${user.name} ${user.contactNumber}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [filter, query, users]);
  const summary = useMemo(() => ({
    active: users.filter((user) => user.isActive).length,
    admins: users.filter((user) => user.role === "admin").length,
    managers: users.filter((user) => user.role === "store_manager").length,
    staff: users.filter((user) => user.role === "staff").length,
  }), [users]);

  function openCreate() {
    setEditor(null);
    setName("");
    setContact("");
    setPasscode("");
    setRole("staff");
    setIsActive(true);
    setError(null);
    setSuccessMessage(null);
  }

  function openEdit(user: TeamUser) {
    setEditor(user);
    setName(user.name);
    setContact(user.contactNumber);
    setRole(user.role);
    setIsActive(user.isActive);
    setPasscode("");
    setError(null);
    setSuccessMessage(null);
  }

  async function save() {
    if (!name.trim() || !contact.trim() || (!editor && passcode.length < 4)) {
      setError("Name, contact, and a 4-character passcode are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), contactNumber: contact.trim(), role, isActive, permissions: defaultPermissionsForRole(role) };
      if (editor) {
        await updateTeamUser(editor.id, payload);
        setSuccessMessage(`${name.trim()} was saved.`);
      } else {
        await createTeamUser({ ...payload, passcode });
        setSuccessMessage(`${name.trim()} was created.`);
      }
      setEditor(undefined);
      await load();
    } catch (cause) {
      setError(teamErrorMessage(cause, "Could not save team user"));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(user: TeamUser) {
    try {
      await updateTeamUser(user.id, {
        name: user.name,
        contactNumber: user.contactNumber,
        role: user.role,
        isActive: !user.isActive,
        permissions: user.permissions || defaultPermissionsForRole(user.role),
      });
      setSuccessMessage(`${user.name} is now ${!user.isActive ? "active" : "inactive"}.`);
      await load();
    } catch (cause) {
      setError(teamErrorMessage(cause, "Could not update status"));
    }
  }

  return (
    <main style={pageStyle}>
      <Header title="Team Management" subtitle={`${filtered.length} of ${users.length} users`} onBack={() => navigate(-1)} right={<button type="button" data-testid="open-add-team-user" aria-label="Add team user" title="Add team user" onClick={openCreate} style={iconButtonStyle}><Icon name="add-circle" size={25} color={colors.primary} /></button>} />
      <div style={controlsStyle}>
        <Input testID="team-search" value={query} onChangeText={setQuery} placeholder="Search team" style={{ marginBottom: spacing.sm }} />
        <div style={filtersStyle}>{(["all", ...roles] as const).map((item) => <Chip key={item} label={item === "all" ? "All" : roleLabels[item]} selected={filter === item} onPress={() => setFilter(item)} testID={`team-filter-${item}`} />)}</div>
        <div style={summaryRowStyle}>
          <SummaryCell label="Active" value={summary.active} />
          <SummaryCell label="Admins" value={summary.admins} />
          <SummaryCell label="Managers" value={summary.managers} />
          <SummaryCell label="Staff" value={summary.staff} />
        </div>
      </div>
      {successMessage ? <p role="status" style={successStyle}>{successMessage}</p> : null}
      {loading ? <div style={centerStyle}><span className="web-button-spinner" role="status" aria-label="Loading team" /></div> : filtered.length === 0 ? <p style={emptyStyle}>No team users found.</p> : (
        <div style={listStyle}>
          {filtered.map((user) => <article key={user.id} data-testid={`team-user-${user.id}`} style={userCardStyle}>
            <div style={userMainStyle}>
              <div style={userHeadingStyle}><strong style={userNameStyle}>{user.name}</strong><span style={{ ...statusBadgeStyle, ...(user.isActive ? activeBadgeStyle : inactiveBadgeStyle) }}>{user.isActive ? "Active" : "Inactive"}</span></div>
              <div style={metaStyle}>{user.contactNumber} · {roleLabels[user.role]}</div>
              <div style={permissionsStyle}>{(user.permissions || []).map((permission) => <span key={`${user.id}-${permission}`} style={permissionPillStyle}>{permission}</span>)}</div>
            </div>
            <div style={userActionsStyle}>
              <label style={toggleLabelStyle} title={user.isActive ? "Deactivate user" : "Activate user"}><input type="checkbox" role="switch" aria-label={`${user.isActive ? "Deactivate" : "Activate"} ${user.name}`} data-testid={`toggle-team-${user.id}`} checked={user.isActive} onChange={() => void toggle(user)} /><span>{user.isActive ? "Active" : "Inactive"}</span></label>
              <Button title="Edit" icon="create-outline" size="sm" onPress={() => openEdit(user)} testID={`edit-team-${user.id}`} />
            </div>
          </article>)}
        </div>
      )}
      <AppModal testID="team-user-editor" visible={editor !== undefined} onClose={() => setEditor(undefined)} title={editor ? "Edit team user" : "New team user"}>
        <Input testID="team-name-input" label="Name" value={name} onChangeText={setName} placeholder="Full name" autoCapitalize="words" />
        <Input testID="team-contact-input" label="Contact number" value={contact} onChangeText={setContact} keyboardType="phone-pad" />
        <span style={fieldLabelStyle}>Role</span>
        <div style={filtersStyle}>{roles.map((item) => <Chip key={item} label={roleLabels[item]} selected={role === item} onPress={() => setRole(item)} testID={`team-role-${item}`} />)}</div>
        <label style={formToggleStyle}><span>Status</span><input type="checkbox" role="switch" checked={isActive} onChange={() => setIsActive((current) => !current)} /><strong>{isActive ? "Active" : "Inactive"}</strong></label>
        {!editor ? <Input testID="team-passcode-input" label="Passcode" value={passcode} onChangeText={setPasscode} secureTextEntry keyboardType="numeric" /> : null}
        <p style={hintStyle}>Default permissions: {defaultPermissionsForRole(role).join(", ") || "none"}</p>
        {editor ? <p style={hintStyle}>Passcode changes are not supported by the current endpoint; create a new user or add the reset endpoint later.</p> : null}
        <Button testID="save-team-user" title={editor ? "Save changes" : "Create user"} onPress={save} loading={saving} fullWidth />
      </AppModal>
      <ErrorModal visible={!!error} title="Team" message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: colors.bg };
const controlsStyle: React.CSSProperties = { padding: `${spacing.md}px ${spacing.lg}px 0` };
const filtersStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm };
const summaryRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(125px, 1fr))", gap: spacing.sm, marginBottom: spacing.sm };
const summaryCellStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: spacing.sm, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: `${spacing.sm}px ${spacing.md}px`, color: colors.textPrimary };
const summaryLabelStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, fontWeight: 600 };
const successStyle: React.CSSProperties = { color: colors.success, padding: `0 ${spacing.lg}px ${spacing.sm}px`, fontWeight: 600 };
const centerStyle: React.CSSProperties = { minHeight: 180, display: "grid", placeItems: "center" };
const listStyle: React.CSSProperties = { display: "grid", gap: spacing.sm, maxWidth: 1100, margin: "0 auto", padding: `${spacing.sm}px ${spacing.lg}px ${spacing.xl}px` };
const userCardStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: spacing.md, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.md, minWidth: 0 };
const userMainStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
const userHeadingStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm };
const userNameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, overflowWrap: "anywhere" };
const statusBadgeStyle: React.CSSProperties = { borderRadius: radii.pill, padding: "4px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", flexShrink: 0 };
const activeBadgeStyle: React.CSSProperties = { color: colors.success, background: colors.successBg };
const inactiveBadgeStyle: React.CSSProperties = { color: colors.textSecondary, background: colors.bg };
const metaStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, marginTop: 3, overflowWrap: "anywhere" };
const permissionsStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm };
const permissionPillStyle: React.CSSProperties = { color: colors.primary, background: colors.primaryLight, borderRadius: radii.pill, padding: "4px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", overflowWrap: "anywhere" };
const userActionsStyle: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: spacing.sm, flexShrink: 0 };
const toggleLabelStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.xs, color: colors.textSecondary, fontSize: 12 };
const iconButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, padding: 4, border: 0, borderRadius: radii.sm, background: "transparent", cursor: "pointer" };
const fieldLabelStyle: React.CSSProperties = { display: "block", color: colors.textSecondary, fontSize: 12, fontWeight: 700, marginBottom: spacing.xs };
const formToggleStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md, color: colors.textSecondary };
const hintStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, margin: `0 0 ${spacing.md}px` };
const emptyStyle: React.CSSProperties = { textAlign: "center", color: colors.textSecondary, padding: spacing.xl };