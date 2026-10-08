import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listServiceRequests, updateServiceRequest, type ServiceRequest } from "../api/endpoints";
import { ApiError } from "../api/client";
import { Button, Chip, ErrorModal, Header, Input } from "../components/UI";
import { colors, font, radii, spacing } from "../theme";

type StatusFilter = "all" | ServiceRequest["status"];
type ServiceTypeFilter = "all" | ServiceRequest["serviceType"];
type LifecycleForm = { status: ServiceRequest["status"]; recommendedName: string; recommendedPhone: string; adminNote: string };

const statusOptions: StatusFilter[] = ["all", "pending", "in_progress", "completed", "cancelled"];
const serviceTypeOptions: ServiceTypeFilter[] = ["all", "plumber", "electrician"];

function statusLabel(status: string) {
  if (status === "in_progress") return "In progress";
  if (status === "pending") return "Pending";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function formatAt(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function requestErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : "Service request operation failed";
  const body = error.body;
  const errors = body?.data?.errors ?? body?.errors ?? body?.detail?.errors;
  if (Array.isArray(errors) && errors.length) return errors.map(String).join("\n");
  return error.message || "Service request operation failed";
}

function formFromRequest(request: ServiceRequest): LifecycleForm {
  return {
    status: request.status,
    recommendedName: request.recommendedName || "",
    recommendedPhone: request.recommendedPhone || "",
    adminNote: request.adminNote || "",
  };
}

export default function ServiceRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [formDraft, setFormDraft] = useState<{ requestId: string; value: LifecycleForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const next = await listServiceRequests();
    setRequests(next || []);
    setSelectedId((current) => current && next?.some((request) => request.id === current) ? current : next?.[0]?.id || null);
  }, []);

  useEffect(() => {
    let active = true;
    void listServiceRequests()
      .then((next) => {
        if (active) {
          setRequests(next || []);
          setSelectedId((current) => current && next?.some((request) => request.id === current) ? current : next?.[0]?.id || null);
          setError(null);
        }
      })
      .catch((cause: unknown) => { if (active) setError(requestErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
      if (serviceTypeFilter !== "all" && request.serviceType !== serviceTypeFilter) return false;
      if (!query) return true;
      return [request.customerName, request.customerPhone, request.serviceType, request.description, request.city, request.area].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [requests, search, serviceTypeFilter, statusFilter]);

  const selectedRequest = useMemo(
    () => filteredRequests.find((request) => request.id === selectedId) || filteredRequests[0] || null,
    [filteredRequests, selectedId],
  );
  const form = selectedRequest && formDraft?.requestId === selectedRequest.id
    ? formDraft.value
    : selectedRequest ? formFromRequest(selectedRequest) : { status: "pending" as const, recommendedName: "", recommendedPhone: "", adminNote: "" };

  function updateForm(updater: (current: LifecycleForm) => LifecycleForm) {
    if (!selectedRequest) return;
    setFormDraft((current) => ({
      requestId: selectedRequest.id,
      value: updater(current?.requestId === selectedRequest.id ? current.value : formFromRequest(selectedRequest)),
    }));
  }

  async function saveSelected() {
    if (!selectedRequest) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateServiceRequest(selectedRequest.id, {
        status: form.status,
        recommendedName: form.recommendedName.trim(),
        recommendedPhone: form.recommendedPhone.trim(),
        adminNote: form.adminNote.trim(),
        actor: "admin",
        note: `Admin reviewed request (${statusLabel(form.status)})`,
      });
      setFormDraft(null);
      setMessage("Service request updated.");
      await load();
    } catch (cause) {
      setError(requestErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={pageStyle}>
      <Header title="Service requests" subtitle={`${filteredRequests.length} of ${requests.length} requests`} onBack={() => navigate(-1)} />
      <div style={controlsStyle}>
        <Input testID="service-request-search" value={search} onChangeText={setSearch} placeholder="Search name, phone, area, or description" style={{ marginBottom: spacing.sm }} />
        <div style={filtersStyle}>{statusOptions.map((option) => <Chip key={option} label={option === "all" ? "All statuses" : statusLabel(option)} selected={statusFilter === option} onPress={() => setStatusFilter(option)} testID={`service-request-status-${option}`} />)}</div>
        <div style={filtersStyle}>{serviceTypeOptions.map((option) => <Chip key={option} label={option === "all" ? "All services" : option} selected={serviceTypeFilter === option} onPress={() => setServiceTypeFilter(option)} testID={`service-request-type-${option}`} />)}</div>
      </div>
      {message ? <p role="status" style={successStyle}>{message}</p> : null}
      {loading ? <div style={centerStyle}><span className="web-button-spinner" role="status" aria-label="Loading service requests" /></div> : (
        <div style={contentStyle}>
          <section style={listPaneStyle} aria-label="Service request list">
            {filteredRequests.length === 0 ? <p style={emptyStyle}>No service requests match the filters.</p> : filteredRequests.map((request) => <button type="button" key={request.id} onClick={() => { setSelectedId(request.id); setFormDraft(null); }} style={{ ...requestCardStyle, ...(selectedRequest?.id === request.id ? selectedCardStyle : {}) }}>
              <div style={cardHeadingStyle}><strong style={customerNameStyle}>{request.customerName}</strong><span style={{ ...badgeStyle, ...(request.status === "pending" ? pendingBadgeStyle : otherBadgeStyle) }}>{statusLabel(request.status)}</span></div>
              <div style={metaStyle}>{request.serviceType} · {request.customerPhone}</div>
              <div style={metaStyle}>{request.city || request.area || "No city/area"}</div>
              <div style={metaStyle}>{formatAt(request.createdAt)}</div>
            </button>)}
          </section>
          {selectedRequest ? <section style={detailPaneStyle}>
            <h2 style={sectionTitleStyle}>Detail</h2>
            <p style={detailValueStyle}><strong>Service:</strong> {selectedRequest.serviceType}</p>
            <p style={detailValueStyle}><strong>Customer:</strong> {selectedRequest.customerName}</p>
            <p style={detailValueStyle}><strong>Phone:</strong> {selectedRequest.customerPhone}</p>
            <p style={detailValueStyle}><strong>Address:</strong> {selectedRequest.address || "—"}{selectedRequest.pincode ? ` · ${selectedRequest.pincode}` : ""}</p>
            <p style={detailValueStyle}><strong>City / area:</strong> {[selectedRequest.city, selectedRequest.area].filter(Boolean).join(" · ") || "—"}</p>
            <p style={detailValueStyle}><strong>Description:</strong> {selectedRequest.description}</p>
            <div style={formBlockStyle}>
              <h3 style={sectionTitleStyle}>Lifecycle</h3>
              <span style={fieldLabelStyle}>Status</span>
              <div style={filtersStyle}>{(["pending", "in_progress", "completed", "cancelled"] as const).map((option) => <Chip key={option} label={statusLabel(option)} selected={form.status === option} onPress={() => updateForm((current) => ({ ...current, status: option }))} testID={`service-request-lifecycle-${option}`} />)}</div>
              <Input testID="service-request-recommended-name" label="Recommended person" value={form.recommendedName} onChangeText={(value) => updateForm((current) => ({ ...current, recommendedName: value }))} placeholder="Name" />
              <Input testID="service-request-recommended-phone" label="Recommended person's phone" value={form.recommendedPhone} onChangeText={(value) => updateForm((current) => ({ ...current, recommendedPhone: value }))} placeholder="Phone" keyboardType="phone-pad" />
              <Input testID="service-request-admin-note" label="Admin note" value={form.adminNote} onChangeText={(value) => updateForm((current) => ({ ...current, adminNote: value }))} placeholder="Admin note" multiline />
              <Button testID="service-request-save" title="Save update" onPress={saveSelected} loading={saving} />
            </div>
            <div style={formBlockStyle}>
              <h3 style={sectionTitleStyle}>History</h3>
              {selectedRequest.history?.length ? selectedRequest.history.map((entry, index) => <article key={`${entry.at}-${index}`} style={historyCardStyle}>
                <strong>{statusLabel(entry.status)} · {entry.actor}</strong>
                <div style={metaStyle}>{formatAt(entry.at)}</div>
                {entry.note ? <p style={detailValueStyle}>{entry.note}</p> : null}
                {entry.recommendedPerson ? <p style={detailValueStyle}>Recommended: {entry.recommendedPerson.name || "—"} / {entry.recommendedPerson.phone || "—"}</p> : null}
              </article>) : <p style={metaStyle}>No history yet.</p>}
            </div>
          </section> : null}
        </div>
      )}
      <ErrorModal visible={!!error} title="Service requests" message={error || ""} onClose={() => setError(null)} />
    </main>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: colors.bg };
const controlsStyle: React.CSSProperties = { padding: `${spacing.md}px ${spacing.lg}px 0` };
const filtersStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm };
const contentStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))", gap: spacing.md, maxWidth: 1240, margin: "0 auto", padding: `${spacing.sm}px ${spacing.lg}px ${spacing.xl}px`, alignItems: "start" };
const listPaneStyle: React.CSSProperties = { display: "grid", gap: spacing.sm, minWidth: 0 };
const detailPaneStyle: React.CSSProperties = { minWidth: 0, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.md };
const requestCardStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.md, color: colors.textPrimary, font: "inherit", textAlign: "left", cursor: "pointer" };
const selectedCardStyle: React.CSSProperties = { borderColor: colors.primary, background: colors.primaryLight };
const cardHeadingStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm };
const customerNameStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, overflowWrap: "anywhere" };
const badgeStyle: React.CSSProperties = { borderRadius: radii.pill, padding: "4px 8px", fontSize: 11, fontWeight: 700, flexShrink: 0 };
const pendingBadgeStyle: React.CSSProperties = { background: colors.warningBg, color: colors.textPrimary };
const otherBadgeStyle: React.CSSProperties = { background: colors.primaryLight, color: colors.primary };
const metaStyle: React.CSSProperties = { color: colors.textSecondary, fontSize: 12, marginTop: 4, overflowWrap: "anywhere" };
const emptyStyle: React.CSSProperties = { color: colors.textSecondary, padding: spacing.md };
const sectionTitleStyle: React.CSSProperties = { ...font.title, color: colors.textPrimary, margin: `0 0 ${spacing.sm}px` };
const detailValueStyle: React.CSSProperties = { color: colors.textPrimary, fontSize: 14, margin: `0 0 ${spacing.sm}px`, overflowWrap: "anywhere" };
const formBlockStyle: React.CSSProperties = { marginTop: spacing.md, borderTop: `1px solid ${colors.border}`, paddingTop: spacing.md };
const fieldLabelStyle: React.CSSProperties = { display: "block", color: colors.textSecondary, fontWeight: 700, fontSize: 12, marginBottom: spacing.xs };
const historyCardStyle: React.CSSProperties = { border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.sm, color: colors.textPrimary };
const centerStyle: React.CSSProperties = { minHeight: 180, display: "grid", placeItems: "center" };
const successStyle: React.CSSProperties = { color: colors.success, padding: `0 ${spacing.lg}px ${spacing.sm}px`, fontWeight: 600 };