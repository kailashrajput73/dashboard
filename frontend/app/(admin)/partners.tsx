import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppModal, Button, Chip, ErrorModal, Header, Input } from "@/src/components/UI";
import { ApiError } from "@/src/api/client";
import {
  createPartnerAdmin,
  getPartner,
  getPartnerRewards,
  listPartners,
  reviewPartnerKyc,
  type Partner,
  type PartnerAdminCreate,
  type RewardWallet,
} from "@/src/api/endpoints";
import { colors, font, radii, spacing } from "@/src/theme";

type PartnerStatusFilter = "all" | "pending" | "approved" | "rejected";
type PartnerFilters = { search: string; filter: PartnerStatusFilter; managerFilter: string };

const PARTNER_EXPORT_HEADERS = [
  "id",
  "name",
  "phone",
  "businessName",
  "address",
  "pincode",
  "city",
  "area",
  "salesManager",
  "kycStatus",
  "appActive",
  "locationVerified",
  "rewardBalance",
  "rfqCount",
  "approvedRfqCount",
  "approvedRfqValue",
  "registeredVia",
  "lastAppLoginAt",
  "loginCount",
  "createdAt",
];

function emptyPartnerForm(): PartnerAdminCreate {
  return {
    name: "",
    phone: "",
    address: "",
    businessName: "",
    pincode: "",
    city: "",
    area: "",
    salesManager: "",
    documents: [],
  };
}

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  const errors = error.body?.data?.errors ?? error.body?.errors;
  if (Array.isArray(errors) && errors.length > 0) return errors.map(String).join("\n");
  return error.message || fallback;
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function AdminPartners() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [managerOptions, setManagerOptions] = useState<string[]>([]);
  const [filter, setFilter] = useState<PartnerStatusFilter>("all");
  const [managerFilter, setManagerFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Partner | null>(null);
  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<PartnerAdminCreate>(emptyPartnerForm);
  const [documentsText, setDocumentsText] = useState("");
  const [locationVerified, setLocationVerified] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tabs = useMemo<PartnerStatusFilter[]>(() => ["all", "pending", "approved", "rejected"], []);

  const load = useCallback(async (overrides: Partial<PartnerFilters> = {}) => {
    const nextSearch = overrides.search ?? search;
    const nextFilter = overrides.filter ?? filter;
    const nextManager = overrides.managerFilter ?? managerFilter;
    try {
      const nextPartners = await listPartners({
        search: nextSearch.trim() || undefined,
        kyc_status: nextFilter === "all" ? undefined : nextFilter,
        sales_manager: nextManager || undefined,
      });
      setPartners(nextPartners || []);
    } catch (e) {
      setError(errorMessage(e, "Failed to load partners"));
    }
  }, [filter, managerFilter, search]);

  const loadManagerOptions = useCallback(async () => {
    try {
      const allPartners = await listPartners();
      setManagerOptions([...new Set((allPartners || []).map((partner) => partner.salesManager?.trim()).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b)));
    } catch (e) {
      setError(errorMessage(e, "Could not load sales managers"));
    }
  }, []);

  useEffect(() => {
    loadManagerOptions();
  }, [loadManagerOptions]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load().finally(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [load]),
  );

  async function openPartner(partner: Partner) {
    setSelected(partner);
    setWallet(null);
    setDetailLoading(true);
    setRejectionReason("");
    setLocationVerified(true);
    const [detailResult, walletResult] = await Promise.allSettled([
      getPartner(partner.id),
      getPartnerRewards(partner.id),
    ]);
    if (detailResult.status === "fulfilled") {
      setSelected(detailResult.value);
    } else {
      setError(errorMessage(detailResult.reason, "Could not load partner details"));
    }
    if (walletResult.status === "fulfilled") setWallet(walletResult.value);
    setDetailLoading(false);
  }

  async function refreshSelected(partnerId: string) {
    const details = await getPartner(partnerId);
    setSelected(details);
    try {
      setWallet(await getPartnerRewards(partnerId));
    } catch {
      setWallet(null);
    }
  }

  async function review(approved: boolean) {
    if (!selected) return;
    const reason = rejectionReason.trim();
    if (!approved && !reason) {
      setError("Enter a reason before rejecting this partner.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await reviewPartnerKyc(selected.id, {
        approved,
        locationVerified,
        rejectionReason: approved ? undefined : reason,
      });
      await Promise.all([refreshSelected(selected.id), load()]);
      setSuccessMessage(approved ? "Partner approved." : "Partner rejected.");
    } catch (e) {
      setError(errorMessage(e, "Could not review KYC"));
    } finally {
      setSaving(false);
    }
  }

  function updateCreateField<K extends keyof PartnerAdminCreate>(key: K, value: PartnerAdminCreate[K]) {
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  async function createPartner() {
    if (!createForm.name.trim() || !createForm.phone.trim()) {
      setError("Partner name and phone are required.");
      return;
    }
    const body = {
      ...createForm,
      name: createForm.name.trim(),
      phone: createForm.phone.trim(),
      address: createForm.address.trim(),
      businessName: createForm.businessName.trim(),
      pincode: createForm.pincode.trim(),
      city: createForm.city.trim(),
      area: createForm.area.trim(),
      salesManager: createForm.salesManager.trim(),
      documents: documentsText.split(/[\n,]+/).map((document) => document.trim()).filter(Boolean),
    };
    setSaving(true);
    setError(null);
    try {
      const created = await createPartnerAdmin(body);
      setCreateOpen(false);
      setCreateForm(emptyPartnerForm());
      setDocumentsText("");
      setFilter("approved");
      setSearch("");
      setManagerFilter("");
      await load({ filter: "approved", search: "", managerFilter: "" });
      await loadManagerOptions();
      setSuccessMessage("Partner created and approved. Mobile login credentials are not set here.");
      await openPartner(created);
    } catch (e) {
      setError(errorMessage(e, "Could not create partner"));
    } finally {
      setSaving(false);
    }
  }

  async function openDocument(document: string) {
    if (!/^https?:\/\//i.test(document)) return;
    try {
      await Linking.openURL(document);
    } catch (e) {
      setError(errorMessage(e, "Could not open document link"));
    }
  }

  async function exportPartnersCsv() {
    const rows = partners.map((partner) => [
      partner.id,
      partner.name,
      partner.phone,
      partner.businessName,
      partner.address,
      partner.pincode,
      partner.city,
      partner.area,
      partner.salesManager,
      partner.kycStatus,
      partner.appActive,
      partner.locationVerified,
      partner.rewardBalance,
      partner.rfqCount,
      partner.salesPerformance?.approvedCount,
      partner.salesPerformance?.approvedValue,
      partner.registeredVia,
      partner.lastAppLoginAt,
      partner.loginCount,
      partner.createdAt,
    ].map(csvCell).join(","));
    const csv = `\uFEFF${[PARTNER_EXPORT_HEADERS.join(","), ...rows].join("\n")}`;
    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "partners.csv";
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        await Linking.openURL(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
      }
      setSuccessMessage(`Exported ${partners.length} filtered partner${partners.length === 1 ? "" : "s"}.`);
    } catch {
      setError("Could not export partner data.");
    }
  }

  const statusClass = (status: string) => status === "approved" ? styles.good : status === "rejected" ? styles.bad : styles.pending;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Header
        title="Referral Partners"
        subtitle={`${partners.length} partner${partners.length === 1 ? "" : "s"}`}
        onBack={() => router.back()}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity testID="export-partners" accessibilityRole="button" accessibilityLabel="Export filtered partners" onPress={exportPartnersCsv} hitSlop={8}>
              <Ionicons name="download-outline" size={23} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity testID="add-partner" accessibilityRole="button" accessibilityLabel="Add partner" onPress={() => { setError(null); setCreateOpen(true); }} hitSlop={8}>
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />
      <View style={styles.controls}>
        <Input testID="partner-search" value={search} onChangeText={setSearch} placeholder="Search name, phone, pincode, city, or area" style={styles.search} />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tabs}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.tabs}
          renderItem={({ item }) => <Chip label={item[0].toUpperCase() + item.slice(1)} selected={filter === item} onPress={() => setFilter(item)} testID={`partner-filter-${item}`} />}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          <Chip label="All managers" selected={!managerFilter} onPress={() => setManagerFilter("")} testID="partner-manager-all" />
          {managerOptions.map((manager) => (
            <Chip key={manager} label={manager} selected={managerFilter === manager} onPress={() => setManagerFilter(manager)} testID={`partner-manager-${manager}`} />
          ))}
        </ScrollView>
        {successMessage ? <Text style={styles.successMessage} testID="partner-success">{successMessage}</Text> : null}
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No partners found.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`partner-row-${item.id}`} style={styles.row} onPress={() => openPartner(item)}>
              <View style={styles.main}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.businessName || "No business name"} · {[item.area, item.city, item.pincode].filter(Boolean).join(", ") || "No location"}</Text>
                <Text style={styles.meta}>{item.phone} · {item.salesManager || "Unassigned manager"}</Text>
              </View>
              <View style={[styles.status, statusClass(item.kycStatus)]}>
                <Text style={styles.statusText}>{item.kycStatus}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <AppModal testID="partner-details" visible={!!selected} onClose={() => setSelected(null)} title={selected?.name || "Partner details"} wide>
        {detailLoading || !selected ? <ActivityIndicator size="large" color={colors.primary} /> : (
          <>
            <Text style={styles.sectionTitle}>Partner details</Text>
            <Text style={styles.detail}>Business: {selected.businessName || "-"}</Text>
            <Text style={styles.detail}>Phone: {selected.phone}</Text>
            <Text style={styles.detail}>Address: {selected.address || "-"}</Text>
            <Text style={styles.detail}>Location: {[selected.area, selected.city, selected.pincode].filter(Boolean).join(", ") || "-"}</Text>
            <Text style={styles.detail}>Sales manager: {selected.salesManager || "Unassigned"}</Text>
            <Text style={styles.detail}>KYC: {selected.kycStatus} · App active: {selected.appActive ? "Yes" : "No"} · Location verified: {selected.locationVerified ? "Yes" : "No"}</Text>
            {selected.rejectionReason ? <Text style={styles.detail}>Rejection reason: {selected.rejectionReason}</Text> : null}
            <Text style={styles.detail}>Registered: {selected.registeredVia === "mobile_app" ? "Mobile app" : "Admin / other"} · Created: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-"}</Text>
            <Text style={styles.detail}>Last app login: {selected.lastAppLoginAt ? new Date(selected.lastAppLoginAt).toLocaleString() : "Never"} · Logins: {selected.loginCount ?? 0}</Text>
            <Text style={styles.balance}>Reward balance: {wallet?.balance ?? selected.rewardBalance ?? 0}</Text>

            <Text style={styles.sectionTitle}>Performance</Text>
            <Text style={styles.detail}>RFQs: {selected.rfqCount ?? 0}</Text>
            <Text style={styles.detail}>Approved RFQs: {selected.salesPerformance?.approvedCount ?? 0}</Text>
            <Text style={styles.detail}>Approved value: ₹{(selected.salesPerformance?.approvedValue ?? 0).toLocaleString()}</Text>

            <Text style={styles.sectionTitle}>Documents</Text>
            {selected.documents?.length ? selected.documents.map((document, index) => (
              /^https?:\/\//i.test(document) ? (
                <TouchableOpacity key={`${document}-${index}`} testID={`partner-document-${index}`} onPress={() => openDocument(document)} style={styles.documentLink}>
                  <Ionicons name="open-outline" size={16} color={colors.primary} />
                  <Text style={styles.linkText}>{document}</Text>
                </TouchableOpacity>
              ) : <Text key={`${document}-${index}`} style={styles.detail}>{document}</Text>
            )) : <Text style={styles.detail}>No documents provided.</Text>}

            <Text style={styles.sectionTitle}>KYC history</Text>
            {selected.kycHistory?.length ? selected.kycHistory.map((entry, index) => (
              <View key={`${entry.reviewedAt || entry.status}-${index}`} style={styles.historyEntry}>
                <Text style={styles.historyTitle}>{entry.status}</Text>
                <Text style={styles.detail}>Reviewed by: {entry.reviewedBy || "-"} · {entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleString() : "-"}</Text>
                <Text style={styles.detail}>Location verified: {entry.locationVerified ? "Yes" : "No"}</Text>
                {entry.rejectionReason ? <Text style={styles.detail}>Reason: {entry.rejectionReason}</Text> : null}
              </View>
            )) : <Text style={styles.detail}>No KYC review history.</Text>}

            {selected.kycStatus === "pending" ? (
              <View style={styles.reviewPanel}>
                <View style={styles.switchRow}>
                  <Text style={styles.detail}>Location verified</Text>
                  <Switch testID="partner-location-verified" value={locationVerified} onValueChange={setLocationVerified} />
                </View>
                <Input testID="partner-rejection-reason" label="Rejection reason (required to reject)" value={rejectionReason} onChangeText={setRejectionReason} placeholder="Explain why KYC is rejected" multiline />
                <View style={styles.actions}>
                  <Button testID="approve-partner-kyc" title="Approve KYC" onPress={() => review(true)} loading={saving} />
                  <Button testID="reject-partner-kyc" title="Reject" variant="danger" onPress={() => review(false)} loading={saving} disabled={!rejectionReason.trim()} />
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Reward passbook</Text>
            {wallet?.entries?.length ? wallet.entries.map((entry) => (
              <Text key={entry.id} style={styles.detail}>{new Date(entry.createdAt).toLocaleString()} · {entry.type} · {entry.points} points · RFQ {entry.quotationId.slice(0, 8)}</Text>
            )) : <Text style={styles.detail}>No reward entries yet.</Text>}

            <Text style={styles.sectionTitle}>Purchase history</Text>
            {selected.purchaseHistory?.length ? selected.purchaseHistory.map((purchase, index) => (
              <Text key={purchase.id || `${purchase.createdAt}-${index}`} style={styles.detail}>
                {purchase.createdAt ? new Date(purchase.createdAt).toLocaleString() : "Purchase"} · {purchase.lines?.length || 0} lines
              </Text>
            )) : <Text style={styles.detail}>Supplier purchases are not linked to partners; partner activity is tracked through RFQs.</Text>}
          </>
        )}
      </AppModal>

      <AppModal testID="partner-create" visible={createOpen} onClose={() => setCreateOpen(false)} title="Add partner" wide>
        <Input testID="create-partner-name" label="Name *" value={createForm.name} onChangeText={(value) => updateCreateField("name", value)} />
        <Input testID="create-partner-phone" label="Phone *" value={createForm.phone} onChangeText={(value) => updateCreateField("phone", value)} keyboardType="phone-pad" />
        <Input testID="create-partner-address" label="Address" value={createForm.address} onChangeText={(value) => updateCreateField("address", value)} />
        <Input testID="create-partner-business" label="Business name" value={createForm.businessName} onChangeText={(value) => updateCreateField("businessName", value)} />
        <View style={styles.formRow}>
          <View style={styles.formField}><Input testID="create-partner-pincode" label="Pincode" value={createForm.pincode} onChangeText={(value) => updateCreateField("pincode", value)} keyboardType="numeric" /></View>
          <View style={styles.formField}><Input testID="create-partner-city" label="City" value={createForm.city} onChangeText={(value) => updateCreateField("city", value)} /></View>
        </View>
        <View style={styles.formRow}>
          <View style={styles.formField}><Input testID="create-partner-area" label="Area" value={createForm.area} onChangeText={(value) => updateCreateField("area", value)} /></View>
          <View style={styles.formField}><Input testID="create-partner-manager" label="Sales manager" value={createForm.salesManager} onChangeText={(value) => updateCreateField("salesManager", value)} /></View>
        </View>
        <Input testID="create-partner-documents" label="Documents (URLs or paths, one per line or comma-separated)" value={documentsText} onChangeText={setDocumentsText} multiline autoCapitalize="none" />
        <Text style={styles.note}>Admin-created partners are approved automatically. This form does not set mobile login credentials.</Text>
        <Button testID="save-partner" title="Create partner" onPress={createPartner} loading={saving} fullWidth />
      </AppModal>
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  search: { marginBottom: spacing.sm },
  tabs: { gap: spacing.sm, paddingBottom: spacing.sm, paddingRight: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  main: { flex: 1, minWidth: 0 },
  name: { ...font.title, color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  detail: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 5 },
  status: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 5 },
  good: { backgroundColor: colors.successBg },
  bad: { backgroundColor: colors.errorBg },
  pending: { backgroundColor: colors.warningBg },
  statusText: { color: colors.textPrimary, fontSize: 11, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textSecondary, padding: spacing.xl },
  balance: { color: colors.primary, fontSize: 20, fontWeight: "800", marginTop: spacing.md },
  sectionTitle: { ...font.title, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  historyEntry: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  historyTitle: { color: colors.textPrimary, fontWeight: "700", textTransform: "capitalize", marginBottom: 4 },
  reviewPanel: { backgroundColor: colors.bg, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  documentLink: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  linkText: { color: colors.primary, flexShrink: 1 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: spacing.md },
  successMessage: { color: colors.success, backgroundColor: colors.successBg, padding: spacing.sm, borderRadius: radii.sm, marginBottom: spacing.sm },
  formRow: { flexDirection: "row", gap: spacing.sm },
  formField: { flex: 1, minWidth: 130 },
});