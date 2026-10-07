import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createPartnerAdmin,
  getPartner,
  getPartnerRewards,
  listPartners,
  reviewPartnerKyc,
  type Partner,
  type PartnerAdminCreate,
  type RewardWallet,
} from "../api/endpoints";
import { ApiError } from "../api/client";
import { Button, Chip, ErrorModal, Header, Input, AppModal } from "../components/UI";
import { Icon } from "../components/Icon";
import { colors, font, radii, spacing } from "../theme";
import { downloadCsv } from "../utils/download-csv";

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

function statusStyle(status: Partner["kycStatus"]): React.CSSProperties {
  if (status === "approved") return { color: colors.success, background: colors.successBg };
  if (status === "rejected") return { color: colors.error, background: colors.errorBg };
  return { color: colors.warning, background: colors.warningBg };
}

function detailLine(label: string, value: string | number) {
  return <p style={detailStyle}><strong>{label}:</strong> {value}</p>;
}

export default function PartnersPage() {
  const navigate = useNavigate();
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

  const fetchPartners = useCallback((overrides: Partial<PartnerFilters> = {}) => {
    const nextSearch = overrides.search ?? search;
    const nextFilter = overrides.filter ?? filter;
    const nextManager = overrides.managerFilter ?? managerFilter;
    return listPartners({
      search: nextSearch.trim() || undefined,
      kyc_status: nextFilter === "all" ? undefined : nextFilter,
      sales_manager: nextManager || undefined,
    });
  }, [filter, managerFilter, search]);

  const load = useCallback(async (overrides: Partial<PartnerFilters> = {}) => {
    try {
      const nextPartners = await fetchPartners(overrides);
      setPartners(nextPartners || []);
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Failed to load partners"));
    }
  }, [fetchPartners]);

  const fetchManagerOptions = useCallback(async () => {
    const allPartners = await listPartners();
    return [...new Set((allPartners || []).map((partner) => partner.salesManager?.trim()).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b));
  }, []);

  useEffect(() => {
    let active = true;
    void fetchPartners()
      .then((nextPartners) => {
        if (active) {
          setPartners(nextPartners || []);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause, "Failed to load partners"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchPartners]);

  useEffect(() => {
    let active = true;
    void fetchManagerOptions()
      .then((options) => {
        if (active) setManagerOptions(options);
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause, "Could not load sales managers"));
      });
    return () => {
      active = false;
    };
  }, [fetchManagerOptions]);

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
    } catch (cause) {
      setError(errorMessage(cause, "Could not review KYC"));
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
      const nextManagerOptions = await fetchManagerOptions();
      setManagerOptions(nextManagerOptions);
      setSuccessMessage("Partner created and approved. Mobile login credentials are not set here.");
      await openPartner(created);
    } catch (cause) {
      setError(errorMessage(cause, "Could not create partner"));
    } finally {
      setSaving(false);
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
      downloadCsv(csv, "partners.csv");
      setSuccessMessage(`Exported ${partners.length} filtered partner${partners.length === 1 ? "" : "s"}.`);
    } catch {
      setError("Could not export partner data.");
    }
  }

  const updateCreateFieldFromInput = (key: keyof PartnerAdminCreate, value: string) => {
    updateCreateField(key, value);
  };

  return (
    <main style={{ minHeight: "100vh", backgroundColor: colors.bg }}>
      <Header
        title="Referral Partners"
        subtitle={`${partners.length} partner${partners.length === 1 ? "" : "s"}`}
        onBack={() => navigate(-1)}
        right={(
          <div style={headerActionsStyle}>
            <button type="button" data-testid="export-partners" aria-label="Export filtered partners" onClick={() => void exportPartnersCsv()} style={iconButtonStyle}>
              <Icon name="download-outline" size={23} color={colors.primary} />
            </button>
            <button type="button" data-testid="add-partner" aria-label="Add partner" onClick={() => { setError(null); setCreateOpen(true); }} style={iconButtonStyle}>
              <Icon name="add-circle" size={26} color={colors.primary} />
            </button>
          </div>
        )}
      />
      <div style={controlsStyle}>
        <Input testID="partner-search" value={search} onChangeText={setSearch} placeholder="Search name, phone, pincode, city, or area" style={{ marginBottom: spacing.sm }} />
        <div style={chipRowStyle}>
          {tabs.map((item) => <Chip key={item} label={item[0].toUpperCase() + item.slice(1)} selected={filter === item} onPress={() => setFilter(item)} testID={`partner-filter-${item}`} />)}
        </div>
        <div style={chipRowStyle}>
          <Chip label="All managers" selected={!managerFilter} onPress={() => setManagerFilter("")} testID="partner-manager-all" />
          {managerOptions.map((manager) => <Chip key={manager} label={manager} selected={managerFilter === manager} onPress={() => setManagerFilter(manager)} testID={`partner-manager-${manager}`} />)}
        </div>
        {successMessage ? <p data-testid="partner-success" role="status" style={successStyle}>{successMessage}</p> : null}
      </div>
      {loading ? (
        <div style={centerStyle}><span className="web-button-spinner" role="status" aria-label="Loading partners" /></div>
      ) : partners.length === 0 ? (
        <p style={emptyStyle}>No partners found.</p>
      ) : (
        <div style={listStyle}>
          {partners.map((partner) => (
            <button key={partner.id} type="button" data-testid={`partner-row-${partner.id}`} onClick={() => void openPartner(partner)} style={partnerRowStyle}>
              <span style={partnerMainStyle}>
                <strong style={partnerNameStyle}>{partner.name}</strong>
                <span style={metaStyle}>{partner.businessName || "No business name"} · {[partner.area, partner.city, partner.pincode].filter(Boolean).join(", ") || "No location"}</span>
                <span style={metaStyle}>{partner.phone} · {partner.salesManager || "Unassigned manager"}</span>
              </span>
              <span style={{ ...statusPillStyle, ...statusStyle(partner.kycStatus) }}>{partner.kycStatus}</span>
            </button>
          ))}
        </div>
      )}

      <AppModal testID="partner-details" visible={!!selected} onClose={() => setSelected(null)} title={selected?.name || "Partner details"} wide>
        {detailLoading || !selected ? (
          <div style={centerStyle}><span className="web-button-spinner" role="status" aria-label="Loading partner details" /></div>
        ) : (
          <>
            <h2 style={sectionTitleStyle}>Partner details</h2>
            {detailLine("Business", selected.businessName || "-")}
            {detailLine("Phone", selected.phone)}
            {detailLine("Address", selected.address || "-")}
            {detailLine("Location", [selected.area, selected.city, selected.pincode].filter(Boolean).join(", ") || "-")}
            {detailLine("Sales manager", selected.salesManager || "Unassigned")}
            {detailLine("KYC", `${selected.kycStatus} · App active: ${selected.appActive ? "Yes" : "No"} · Location verified: ${selected.locationVerified ? "Yes" : "No"}`)}
            {selected.rejectionReason ? detailLine("Rejection reason", selected.rejectionReason) : null}
            {detailLine("Registered", `${selected.registeredVia === "mobile_app" ? "Mobile app" : "Admin / other"} · Created: ${selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "-"}`)}
            {detailLine("Last app login", `${selected.lastAppLoginAt ? new Date(selected.lastAppLoginAt).toLocaleString() : "Never"} · Logins: ${selected.loginCount ?? 0}`)}
            <p style={balanceStyle}>Reward balance: {wallet?.balance ?? selected.rewardBalance ?? 0}</p>

            <h2 style={sectionTitleStyle}>Performance</h2>
            {detailLine("RFQs", selected.rfqCount ?? 0)}
            {detailLine("Approved RFQs", selected.salesPerformance?.approvedCount ?? 0)}
            {detailLine("Approved value", `₹${(selected.salesPerformance?.approvedValue ?? 0).toLocaleString()}`)}

            <h2 style={sectionTitleStyle}>Documents</h2>
            {selected.documents?.length ? selected.documents.map((document, index) => (
              /^https?:\/\//i.test(document)
                ? <p key={`${document}-${index}`} style={detailStyle}><a href={document} target="_blank" rel="noreferrer" data-testid={`partner-document-${index}`} style={{ color: colors.primary, overflowWrap: "anywhere" }}>{document}</a></p>
                : detailLine("Document", document)
            )) : <p style={detailStyle}>No documents provided.</p>}

            <h2 style={sectionTitleStyle}>KYC history</h2>
            {selected.kycHistory?.length ? selected.kycHistory.map((entry, index) => (
              <div key={`${entry.reviewedAt || entry.status}-${index}`} style={historyEntryStyle}>
                <strong style={{ textTransform: "capitalize" }}>{entry.status}</strong>
                {detailLine("Reviewed by", entry.reviewedBy || "-")}
                {detailLine("Reviewed at", entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleString() : "-")}
                {detailLine("Location verified", entry.locationVerified ? "Yes" : "No")}
                {entry.rejectionReason ? detailLine("Reason", entry.rejectionReason) : null}
              </div>
            )) : <p style={detailStyle}>No KYC review history.</p>}

            {selected.kycStatus === "pending" ? (
              <section style={reviewPanelStyle}>
                <label style={switchRowStyle}>
                  <span>Location verified</span>
                  <input type="checkbox" data-testid="partner-location-verified" checked={locationVerified} onChange={(event) => setLocationVerified(event.currentTarget.checked)} />
                </label>
                <Input testID="partner-rejection-reason" label="Rejection reason (required to reject)" value={rejectionReason} onChangeText={setRejectionReason} placeholder="Explain why KYC is rejected" multiline />
                <div style={actionsStyle}>
                  <Button testID="approve-partner-kyc" title="Approve KYC" onPress={() => void review(true)} loading={saving} />
                  <Button testID="reject-partner-kyc" title="Reject" variant="danger" onPress={() => void review(false)} loading={saving} disabled={!rejectionReason.trim()} />
                </div>
              </section>
            ) : null}

            <h2 style={sectionTitleStyle}>Reward passbook</h2>
            {wallet?.entries?.length ? wallet.entries.map((entry) => (
              <p key={entry.id} style={detailStyle}>{new Date(entry.createdAt).toLocaleString()} · {entry.type} · {entry.points} points · RFQ {entry.quotationId.slice(0, 8)}</p>
            )) : <p style={detailStyle}>No reward entries yet.</p>}

            <h2 style={sectionTitleStyle}>Purchase history</h2>
            {selected.purchaseHistory?.length ? selected.purchaseHistory.map((purchase, index) => (
              <p key={purchase.id || `${purchase.createdAt}-${index}`} style={detailStyle}>{purchase.createdAt ? new Date(purchase.createdAt).toLocaleString() : "Purchase"} · {purchase.lines?.length || 0} lines</p>
            )) : <p style={detailStyle}>Supplier purchases are not linked to partners; partner activity is tracked through RFQs.</p>}
          </>
        )}
      </AppModal>

      <AppModal testID="partner-create" visible={createOpen} onClose={() => setCreateOpen(false)} title="Add partner" wide>
        <Input testID="create-partner-name" label="Name *" value={createForm.name} onChangeText={(value) => updateCreateFieldFromInput("name", value)} />
        <Input testID="create-partner-phone" label="Phone *" value={createForm.phone} onChangeText={(value) => updateCreateFieldFromInput("phone", value)} keyboardType="phone-pad" />
        <Input testID="create-partner-address" label="Address" value={createForm.address} onChangeText={(value) => updateCreateFieldFromInput("address", value)} />
        <Input testID="create-partner-business" label="Business name" value={createForm.businessName} onChangeText={(value) => updateCreateFieldFromInput("businessName", value)} />
        <div style={formRowStyle}>
          <Input testID="create-partner-pincode" label="Pincode" value={createForm.pincode} onChangeText={(value) => updateCreateFieldFromInput("pincode", value)} keyboardType="numeric" style={{ flex: 1 }} />
          <Input testID="create-partner-city" label="City" value={createForm.city} onChangeText={(value) => updateCreateFieldFromInput("city", value)} style={{ flex: 1 }} />
        </div>
        <div style={formRowStyle}>
          <Input testID="create-partner-area" label="Area" value={createForm.area} onChangeText={(value) => updateCreateFieldFromInput("area", value)} style={{ flex: 1 }} />
          <Input testID="create-partner-manager" label="Sales manager" value={createForm.salesManager} onChangeText={(value) => updateCreateFieldFromInput("salesManager", value)} style={{ flex: 1 }} />
        </div>
        <Input testID="create-partner-documents" label="Documents (URLs or paths, one per line or comma-separated)" value={documentsText} onChangeText={setDocumentsText} multiline autoCapitalize="none" />
        <p style={noteStyle}>Admin-created partners are approved automatically. This form does not set mobile login credentials.</p>
        <Button testID="save-partner" title="Create partner" onPress={() => void createPartner()} loading={saving} fullWidth />
      </AppModal>
      <ErrorModal visible={!!error} message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}

const headerActionsStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.md };
const iconButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, padding: 4, border: 0, borderRadius: radii.sm, background: "transparent", cursor: "pointer" };
const controlsStyle: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: `${spacing.md}px ${spacing.lg}px 0` };
const chipRowStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm };
const listStyle: React.CSSProperties = { display: "grid", gap: spacing.sm, maxWidth: 1100, margin: "0 auto", padding: `${spacing.md}px ${spacing.lg}px` };
const partnerRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: spacing.md, width: "100%", padding: spacing.md, border: `1px solid ${colors.border}`, borderRadius: radii.md, background: colors.surface, color: colors.textPrimary, textAlign: "left", cursor: "pointer" };
const partnerMainStyle: React.CSSProperties = { display: "grid", gap: 4, minWidth: 0, flex: 1 };
const partnerNameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, overflowWrap: "anywhere" };
const metaStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, overflowWrap: "anywhere" };
const statusPillStyle: React.CSSProperties = { flexShrink: 0, borderRadius: radii.pill, padding: "5px 8px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" };
const centerStyle: React.CSSProperties = { minHeight: 180, display: "grid", placeItems: "center" };
const emptyStyle: React.CSSProperties = { textAlign: "center", color: colors.textSecondary, padding: spacing.xl };
const sectionTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, margin: `${spacing.lg}px 0 ${spacing.sm}px` };
const detailStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 13, lineHeight: 1.5, margin: "0 0 6px", overflowWrap: "anywhere" };
const balanceStyle: React.CSSProperties = { color: colors.primary, fontSize: 20, fontWeight: 800, margin: `${spacing.md}px 0 0` };
const historyEntryStyle: React.CSSProperties = { borderTop: `1px solid ${colors.border}`, paddingTop: spacing.sm, marginTop: spacing.sm };
const reviewPanelStyle: React.CSSProperties = { background: colors.bg, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.md };
const switchRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.sm, color: colors.textSecondary, fontSize: 13 };
const actionsStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm };
const successStyle: React.CSSProperties = { color: colors.success, background: colors.successBg, padding: spacing.sm, borderRadius: radii.sm, marginBottom: spacing.sm };
const formRowStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm };
const noteStyle: React.CSSProperties = { color: colors.textMuted, fontSize: 12, lineHeight: 1.5, margin: `0 0 ${spacing.md}px` };
