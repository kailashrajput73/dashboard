import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppModal, Button, Chip, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import { createTeamUser, listTeamUsers, updateTeamUser, type TeamUser } from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";

const roles: TeamUser["role"][] = ["admin", "store_manager", "staff"];
const roleLabels = { admin: "Admin", store_manager: "Store manager", staff: "Staff" };
const rolePermissions: Record<TeamUser["role"], string[]> = {
  admin: ["all"],
  store_manager: ["catalog:read", "purchase:write", "inventory:read", "rfq:approve", "dispatch:write"],
  staff: ["catalog:read", "inventory:read"],
};

function defaultPermissionsForRole(role: TeamUser["role"]) {
  return rolePermissions[role] || [];
}

export default function AdminTeam() {
  const router = useRouter();
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
      const nextUsers = (await listTeamUsers()) || [];
      setUsers(nextUsers);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load team");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(
    () =>
      users.filter(
        (user) =>
          (filter === "all" || user.role === filter) &&
          `${user.name} ${user.contactNumber}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [filter, query, users],
  );

  const summary = useMemo(
    () => ({
      active: users.filter((user) => user.isActive).length,
      admins: users.filter((user) => user.role === "admin").length,
      managers: users.filter((user) => user.role === "store_manager").length,
      staff: users.filter((user) => user.role === "staff").length,
    }),
    [users],
  );

  function openCreate() {
    setEditor(null);
    setName("");
    setContact("");
    setPasscode("");
    setRole("staff");
    setIsActive(true);
    setSuccessMessage(null);
  }

  function openEdit(user: TeamUser) {
    setEditor(user);
    setName(user.name);
    setContact(user.contactNumber);
    setRole(user.role);
    setIsActive(user.isActive);
    setPasscode("");
    setSuccessMessage(null);
  }

  async function save() {
    if (!name.trim() || !contact.trim() || (!editor && passcode.length < 4)) {
      setError("Name, contact, and a 4-character passcode are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        contactNumber: contact.trim(),
        role,
        isActive,
        permissions: defaultPermissionsForRole(role),
      };

      if (editor) {
        await updateTeamUser(editor.id, payload);
        setSuccessMessage(`${name.trim()} was saved.`);
      } else {
        await createTeamUser({ ...payload, passcode, permissions: defaultPermissionsForRole(role) });
        setSuccessMessage(`${name.trim()} was created.`);
      }

      setEditor(undefined);
      setError(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save team user");
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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update status");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Team Management"
        subtitle={`${filtered.length} of ${users.length} users`}
        onBack={() => router.back()}
        right={
          <TouchableOpacity testID="open-add-team-user" onPress={openCreate} hitSlop={8}>
            <Ionicons name="add-circle" size={26} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.controls}>
        <Input testID="team-search" value={query} onChangeText={setQuery} placeholder="Search team" style={styles.search} />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["all", ...roles]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => (
            <Chip
              label={item === "all" ? "All" : roleLabels[item as TeamUser["role"]]}
              selected={filter === item}
              onPress={() => setFilter(item as typeof filter)}
              testID={`team-filter-${item}`}
            />
          )}
        />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>{summary.active} active</Text>
          <Text style={styles.summaryDivider}>•</Text>
          <Text style={styles.summaryText}>{summary.admins} admins</Text>
          <Text style={styles.summaryDivider}>•</Text>
          <Text style={styles.summaryText}>{summary.managers} managers</Text>
          <Text style={styles.summaryDivider}>•</Text>
          <Text style={styles.summaryText}>{summary.staff} staff</Text>
        </View>
      </View>

      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No team users found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row} testID={`team-user-${item.id}`}>
              <View style={styles.main}>
                <View style={styles.rowHeader}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={[styles.badgeText, item.isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.meta}>{item.contactNumber} · {roleLabels[item.role]}</Text>
                <View style={styles.permissionRow}>
                  {(item.permissions || []).map((permission) => (
                    <View key={`${item.id}-${permission}`} style={styles.permissionPill}>
                      <Text style={styles.permissionText}>{permission}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity testID={`toggle-team-${item.id}`} onPress={() => toggle(item)} hitSlop={8}>
                  <Ionicons name={item.isActive ? "toggle" : "toggle-off"} size={24} color={item.isActive ? colors.success : colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity testID={`edit-team-${item.id}`} onPress={() => openEdit(item)} hitSlop={8}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <AppModal
        testID="team-user-editor"
        visible={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={editor ? "Edit team user" : "New team user"}
      >
        <Input testID="team-name-input" label="Name" value={name} onChangeText={setName} placeholder="Full name" autoCapitalize="words" />
        <Input testID="team-contact-input" label="Contact number" value={contact} onChangeText={setContact} keyboardType="phone-pad" />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          {roles.map((item) => (
            <Chip key={item} label={roleLabels[item]} selected={role === item} onPress={() => setRole(item)} testID={`team-role-${item}`} />
          ))}
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Status</Text>
          <Pressable onPress={() => setIsActive((current) => !current)} style={[styles.togglePill, isActive ? styles.togglePillOn : styles.togglePillOff]}>
            <Text style={[styles.toggleText, isActive ? styles.toggleTextOn : styles.toggleTextOff]}>{isActive ? "Active" : "Inactive"}</Text>
          </Pressable>
        </View>

        {!editor && (
          <Input testID="team-passcode-input" label="Passcode" value={passcode} onChangeText={setPasscode} secureTextEntry keyboardType="numeric" />
        )}

        <Text style={styles.hint}>Default permissions: {defaultPermissionsForRole(role).join(", ") || "none"}</Text>
        {editor && <Text style={styles.hint}>Passcode changes are not supported by the current endpoint; create a new user or add the reset endpoint later.</Text>}

        <Button testID="save-team-user" title={editor ? "Save changes" : "Create user"} onPress={save} loading={saving} fullWidth />
      </AppModal>

      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: { marginBottom: spacing.sm },
  chips: { gap: spacing.sm, paddingBottom: spacing.sm },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm, flexWrap: "wrap" },
  summaryText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  summaryDivider: { color: colors.textMuted },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  main: { flex: 1 },
  rowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  name: { ...font.title, color: colors.textPrimary, flexShrink: 1 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  permissionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  permissionPill: { backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  permissionText: { color: colors.primary, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeActive: { backgroundColor: colors.success + "22" },
  badgeInactive: { backgroundColor: colors.textMuted + "22" },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  badgeTextActive: { color: colors.success },
  badgeTextInactive: { color: colors.textSecondary },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
  label: { color: colors.textSecondary, fontWeight: "600", marginBottom: spacing.sm },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  togglePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  togglePillOn: { backgroundColor: colors.success + "22" },
  togglePillOff: { backgroundColor: colors.textMuted + "22" },
  toggleText: { fontWeight: "700", fontSize: 12 },
  toggleTextOn: { color: colors.success },
  toggleTextOff: { color: colors.textSecondary },
  hint: { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.md },
  success: { color: colors.success, fontSize: 12, fontWeight: "600", paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
